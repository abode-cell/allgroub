/**
 * @fileOverview Service for calculating all dashboard metrics.
 * This moves the business logic from the component to a dedicated, testable service.
 */

import type { Borrower, Investor, User } from '@/lib/types';
import { getBorrowerStatus } from '@/lib/utils';

interface CalculationInput {
    borrowers: Borrower[];
    investors: Investor[];
    users: User[];
    currentUser: User;
    config: {
        investorSharePercentage: number;
        graceTotalProfitPercentage: number;
        graceInvestorSharePercentage: number;
    };
}

export type DashboardMetricsOutput = ReturnType<typeof calculateAllDashboardMetrics>;

// Helper to filter data based on user role
function getFilteredData(input: CalculationInput) {
    const { currentUser, borrowers, investors, users } = input;
    const { role } = currentUser;
    const userMap = new Map(users.map(u => [u.id, u]));

    if (role === 'مدير النظام' || role === 'مستثمر') {
        const officeManagerIds = new Set(users.filter(u => u.role === 'مدير المكتب').map(m => m.id));
        const relevantInvestorUsers = users.filter(u => u.role === 'مستثمر' && u.managedBy && officeManagerIds.has(u.managedBy));
        const relevantInvestorIds = new Set(relevantInvestorUsers.map(u => u.id));
        return { filteredBorrowers: borrowers, filteredInvestors: investors.filter(i => relevantInvestorIds.has(i.id)) };
    }

    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    const relevantUserIds = new Set<string>();
    for(const u of users) {
        if (u.managedBy === managerId || u.id === managerId) {
            relevantUserIds.add(u.id);
        }
    }
    relevantUserIds.add(currentUser.id);

    const filteredBorrowers = borrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
    const filteredInvestors = investors.filter(i => {
        const investorUser = userMap.get(i.id);
        return investorUser?.managedBy && relevantUserIds.has(investorUser.managedBy)
    });
    
    return { filteredBorrowers, filteredInvestors };
}

function calculateInstallmentsMetrics(borrowers: Borrower[], investors: Investor[], config: CalculationInput['config']) {
    const installmentLoans = borrowers.filter(b => b.loanType === 'اقساط');
    const installmentLoansGranted = installmentLoans.reduce((acc, b) => acc + b.amount, 0);
    const installmentDefaultedLoans = installmentLoans.filter(b => 
        b.status === 'متعثر' || b.paymentStatus === 'متعثر' || b.paymentStatus === 'تم اتخاذ الاجراءات القانونيه'
    );
    const installmentDefaultedFunds = installmentDefaultedLoans.reduce((acc, b) => acc + b.amount, 0);
    const installmentDefaultRate = installmentLoansGranted > 0 ? (installmentDefaultedFunds / installmentLoansGranted) * 100 : 0;
    
    const defaultedProfits = installmentDefaultedLoans.reduce((acc, loan) => {
        if (!loan.rate || !loan.term) return acc;
        const totalInterest = loan.amount * (loan.rate / 100) * loan.term;
        return acc + totalInterest;
    }, 0);

    const profitableInstallmentLoans = installmentLoans.filter(
        b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل'
    );
    
    let totalInstitutionProfit = 0;
    let totalInvestorsProfit = 0;
    const investorProfits: { [investorId: string]: { id: string; name: string, profit: number } } = {};
    const investorMap = new Map(investors.map(inv => [inv.id, inv]));

    profitableInstallmentLoans.forEach(loan => {
        if (!loan.rate || !loan.term || !loan.fundedBy) return;
        
        loan.fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;

            const profitShare = investorDetails.installmentProfitShare ?? config.investorSharePercentage;
            const interestOnFundedAmount = funder.amount * (loan.rate / 100) * loan.term;
            
            const investorPortion = interestOnFundedAmount * (profitShare / 100);
            const institutionPortion = interestOnFundedAmount - investorPortion;
            
            totalInvestorsProfit += investorPortion;
            totalInstitutionProfit += institutionPortion;

            if (!investorProfits[funder.investorId]) {
                investorProfits[funder.investorId] = { id: investorDetails.id, name: investorDetails.name, profit: 0 };
            }
            investorProfits[funder.investorId].profit += investorPortion;
        });
    });

    const netProfit = totalInstitutionProfit + totalInvestorsProfit;

    const investorProfitsArray = Object.values(investorProfits);

    const today = new Date();
    const dueDebts = installmentLoans
        .filter(b => {
            if (b.status === 'مسدد بالكامل' || b.status === 'متعثر' || b.paymentStatus === 'تم السداد' || b.paymentStatus === 'متعثر') {
                return false;
            }
            const statusDetails = getBorrowerStatus(b, today);
            return statusDetails.text.includes('متأخر');
        })
        .reduce((acc, b) => acc + b.amount, 0);
    
    const profitableInstallmentLoansForAccordion = profitableInstallmentLoans.map(loan => {
        if (!loan.rate || !loan.term || !loan.fundedBy) return null;
        
        let totalInstitutionProfitOnLoan = 0;
        let totalInvestorProfitOnLoan = 0;

        loan.fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;
            const profitShare = investorDetails.installmentProfitShare ?? config.investorSharePercentage;
            const interestOnFundedAmount = funder.amount * (loan.rate / 100) * loan.term;
            const investorPortion = interestOnFundedAmount * (profitShare / 100);
            const institutionPortion = interestOnFundedAmount - investorPortion;
            totalInstitutionProfitOnLoan += institutionPortion;
            totalInvestorProfitOnLoan += investorPortion;
        });

        const totalInterest = totalInstitutionProfitOnLoan + totalInvestorProfitOnLoan;
        
        return {
            id: loan.id,
            name: loan.name,
            amount: loan.amount,
            institutionProfit: totalInstitutionProfitOnLoan,
            investorProfit: totalInvestorProfitOnLoan,
            totalInterest: totalInterest,
        }
    }).filter((loan): loan is NonNullable<typeof loan> => loan !== null);

    return {
      loans: installmentLoans,
      loansGranted: installmentLoansGranted,
      defaultedFunds: installmentDefaultedFunds,
      defaultRate: installmentDefaultRate,
      defaultedProfits,
      netProfit,
      totalInstitutionProfit,
      totalInvestorsProfit,
      investorProfitsArray,
      dueDebts,
      profitableLoansForAccordion: profitableInstallmentLoansForAccordion,
    };
}

function calculateGracePeriodMetrics(borrowers: Borrower[], investors: Investor[], config: CalculationInput['config']) {
    const gracePeriodLoans = borrowers.filter(b => b.loanType === 'مهلة');
    const profitableLoans = gracePeriodLoans.filter(
      b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل'
    );

    const loansGranted = gracePeriodLoans.reduce((acc, b) => acc + b.amount, 0);
    const defaultedLoans = gracePeriodLoans.filter(b => 
        b.status === 'متعثر' || b.paymentStatus === 'متعثر' || b.paymentStatus === 'تم اتخاذ الاجراءات القانونيه'
    );
    const defaultedFunds = defaultedLoans.reduce((acc, b) => acc + b.amount, 0);
    const defaultRate = loansGranted > 0 ? (defaultedFunds / loansGranted) * 100 : 0;
    const totalDiscounts = gracePeriodLoans.reduce((acc, b) => acc + (b.discount || 0), 0);
    
    const defaultedProfits = defaultedLoans.reduce((acc, loan) => {
        const totalProfit = loan.amount * (config.graceTotalProfitPercentage / 100);
        return acc + totalProfit;
    }, 0);

    const today = new Date();
    const dueDebts = gracePeriodLoans
        .filter(b => {
            if (b.status === 'مسدد بالكامل' || b.status === 'متعثر' || b.paymentStatus === 'تم السداد' || b.paymentStatus === 'متعثر') {
                return false;
            }
            const statusDetails = getBorrowerStatus(b, today);
            return statusDetails.text.includes('متأخر');
        })
        .reduce((acc, b) => acc + b.amount, 0);
    
    let totalInstitutionProfit = 0;
    let totalInvestorsProfit = 0;
    const investorProfits: { [investorId: string]: { id: string; name: string, profit: number } } = {};
    const investorMap = new Map(investors.map(inv => [inv.id, inv]));

    profitableLoans.forEach(loan => {
        if (!loan.fundedBy) return;

        loan.fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;

            const totalProfitOnFundedAmount = funder.amount * (config.graceTotalProfitPercentage / 100);
            const investorProfitShare = investorDetails.gracePeriodProfitShare ?? config.graceInvestorSharePercentage;
            const investorPortion = totalProfitOnFundedAmount * (investorProfitShare / 100);
            const institutionPortion = totalProfitOnFundedAmount - investorPortion;
            
            totalInstitutionProfit += institutionPortion;
            totalInvestorsProfit += investorPortion;

            if (!investorProfits[funder.investorId]) {
                investorProfits[funder.investorId] = { id: investorDetails.id, name: investorDetails.name, profit: 0 };
            }
            investorProfits[funder.investorId].profit += investorPortion;
        });
    });
    
    const netProfit = totalInstitutionProfit + totalInvestorsProfit;
    const investorProfitsArray = Object.values(investorProfits);

     const profitableLoansForAccordion = profitableLoans.map(loan => {
        if (!loan.fundedBy) return null;
        
        let totalInstitutionProfitOnLoan = 0;
        let totalInvestorProfitOnLoan = 0;
        
        loan.fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;
            const totalProfitOnFundedAmount = funder.amount * (config.graceTotalProfitPercentage / 100);
            const investorProfitShare = investorDetails.gracePeriodProfitShare ?? config.graceInvestorSharePercentage;
            const investorPortion = totalProfitOnFundedAmount * (investorProfitShare / 100);
            const institutionPortion = totalProfitOnFundedAmount - investorPortion;
            totalInstitutionProfitOnLoan += institutionPortion;
            totalInvestorProfitOnLoan += investorPortion;
        });

        const totalProfit = totalInstitutionProfitOnLoan + totalInvestorProfitOnLoan;
        
        return {
            id: loan.id,
            name: loan.name,
            amount: loan.amount,
            institutionProfit: totalInstitutionProfitOnLoan,
            investorProfit: totalInvestorProfitOnLoan,
            totalInterest: totalProfit,
        }
    }).filter((loan): loan is NonNullable<typeof loan> => loan !== null);

    return {
        loans: gracePeriodLoans,
        loansGranted: loansGranted,
        defaultedFunds: defaultedFunds,
        defaultRate: defaultRate,
        defaultedProfits,
        totalDiscounts,
        dueDebts,
        netProfit,
        totalInstitutionProfit,
        totalInvestorsProfit,
        investorProfitsArray,
        profitableLoansForAccordion,
    };
}

function calculateSystemAdminMetrics(users: User[], investors: Investor[]) {
    const officeManagers = users.filter(u => u.role === 'مدير المكتب');
    
    if (officeManagers.length === 0) {
        return { 
            pendingManagers: [], 
            activeManagersCount: 0, 
            totalCapital: 0, 
            installmentCapital: 0, 
            graceCapital: 0, 
            totalUsersCount: users.length,
            pendingManagersCount: 0
        };
    }
    
    const officeManagerIds = new Set(officeManagers.map(m => m.id));
    const userMap = new Map(users.map(u => [u.id, u]));

    const pendingManagers = officeManagers.filter(u => u.status === 'معلق');
    const activeManagersCount = officeManagers.length - pendingManagers.length;
    
    const relevantInvestors = investors.filter(i => {
        const investorUser = userMap.get(i.id);
        return investorUser?.managedBy && officeManagerIds.has(investorUser.managedBy)
    });

    const totalCapital = relevantInvestors.reduce((total, investor) => total + investor.installmentCapital + investor.gracePeriodCapital, 0);
    const installmentCapital = relevantInvestors.reduce((total, investor) => total + investor.installmentCapital, 0);
    const graceCapital = relevantInvestors.reduce((total, investor) => total + investor.gracePeriodCapital, 0);
    
    const totalUsersCount = users.length;
    return { 
        pendingManagers, 
        activeManagersCount, 
        totalCapital, 
        installmentCapital, 
        graceCapital, 
        totalUsersCount,
        pendingManagersCount: pendingManagers.length
    };
}

function calculateIdleFundsMetrics(investors: Investor[]) {
    const idleInvestors = investors.filter(i => (i.installmentCapital > 0 || i.gracePeriodCapital > 0) && i.status === 'نشط');
    const totalIdleFunds = idleInvestors.reduce((sum, i) => sum + i.installmentCapital + i.gracePeriodCapital, 0);
    return { idleInvestors, totalIdleFunds };
}

export function calculateAllDashboardMetrics(input: CalculationInput) {
    const { currentUser, users, investors, borrowers, config } = input;
    const { role } = currentUser;

    if (role === 'مدير النظام') {
        const adminMetrics = calculateSystemAdminMetrics(users, investors);
        return {
            role: 'مدير النظام' as const,
            admin: adminMetrics,
        };
    }
    
    if (role === 'مستثمر') {
        // Investor dashboard logic is self-contained and simple, can remain in component for now.
        return {
            role: 'مستثمر' as const,
        };
    }

    // For Office Manager, Assistant, Employee
    const { filteredBorrowers, filteredInvestors } = getFilteredData(input);
    const totalCapital = filteredInvestors.reduce((acc, inv) => acc + inv.installmentCapital + inv.gracePeriodCapital, 0);
    const installmentCapital = filteredInvestors.reduce((acc, inv) => acc + inv.installmentCapital, 0);
    const graceCapital = filteredInvestors.reduce((acc, inv) => acc + inv.gracePeriodCapital, 0);

    return {
        role: role,
        filteredBorrowers,
        filteredInvestors,
        capital: {
            total: totalCapital,
            installments: installmentCapital,
            grace: graceCapital
        },
        installments: calculateInstallmentsMetrics(filteredBorrowers, filteredInvestors, config),
        gracePeriod: calculateGracePeriodMetrics(filteredBorrowers, filteredInvestors, config),
        idleFunds: calculateIdleFundsMetrics(filteredInvestors),
    };
}
