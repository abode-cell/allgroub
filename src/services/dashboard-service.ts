
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


export function calculateInvestorFinancials(investor: Investor, allBorrowers: Borrower[]) {
  const { deposits, withdrawals } = (investor.transactionHistory || []).reduce(
    (acc, tx) => {
      if (tx.type.includes('إيداع')) acc.deposits += tx.amount;
      else if (tx.type.includes('سحب')) acc.withdrawals += tx.amount;
      return acc;
    },
    { deposits: 0, withdrawals: 0 }
  );
  
  const totalCapitalInSystem = deposits - withdrawals;

  let activeCapital = 0;
  let defaultedFunds = 0;

  const fundedLoanIds = investor.fundedLoanIds || [];
  const fundedBorrowers = allBorrowers.filter(b => fundedLoanIds.includes(b.id));

  for (const loan of fundedBorrowers) {
    const fundingDetails = loan.fundedBy?.find(f => f.investorId === investor.id);
    if (!fundingDetails) continue;

    const isDefaulted = loan.status === 'متعثر' || loan.paymentStatus === 'متعثر' || loan.paymentStatus === 'تم اتخاذ الاجراءات القانونيه';
    const isPaid = loan.status === 'مسدد بالكامل' || loan.paymentStatus === 'تم السداد';
    const isPendingOrRejected = loan.status === 'معلق' || loan.status === 'مرفوض';

    if (isDefaulted) {
      defaultedFunds += fundingDetails.amount;
    } else if (!isPaid && !isPendingOrRejected) {
      activeCapital += fundingDetails.amount;
    }
  }
  
  const idleCapital = totalCapitalInSystem - activeCapital - defaultedFunds;

  const installmentCapital = investor.investmentType === 'اقساط' ? idleCapital : 0;
  const gracePeriodCapital = investor.investmentType === 'مهلة' ? idleCapital : 0;
  
  return {
    installmentCapital: Math.max(0, installmentCapital),
    gracePeriodCapital: Math.max(0, gracePeriodCapital),
    activeCapital,
    defaultedFunds,
    totalCapitalInSystem
  };
}


// Helper to filter data based on user role
function getFilteredData(input: CalculationInput) {
    const { currentUser, borrowers, investors, users } = input;
    const { role } = currentUser;
    const userMap = new Map(users.map(u => [u.id, u]));

    if (role === 'مدير النظام' || role === 'مستثمر') {
        return { filteredBorrowers: borrowers, filteredInvestors: investors };
    }

    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;

    if ((role === 'موظف' || role === 'مساعد مدير المكتب') && !managerId) {
        console.error(`User ${currentUser.id} with role "${role}" has no assigned manager (managedBy). Returning empty data to prevent crash.`);
        return { filteredBorrowers: [], filteredInvestors: [] };
    }

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
        return investorUser?.managedBy === managerId;
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
        b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل' || b.paymentStatus === 'تم السداد'
    );
    
    let totalInstitutionProfit = 0;
    let totalInvestorsProfit = 0;
    const investorProfits: { [investorId: string]: { id: string; name: string, profit: number } } = {};
    const investorMap = new Map(investors.map(inv => [inv.id, inv]));

    profitableInstallmentLoans.forEach(loan => {
        const fundedBy = loan.fundedBy || [];
        if (!loan.rate || !loan.term || fundedBy.length === 0) return;
        
        fundedBy.forEach(funder => {
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
        if (!loan.rate || !loan.term) return null;
        
        const fundedBy = loan.fundedBy || [];
        let totalInstitutionProfitOnLoan = 0;
        let totalInvestorProfitOnLoan = 0;

        fundedBy.forEach(funder => {
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
      b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل' || b.paymentStatus === 'تم السداد'
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
        const fundedBy = loan.fundedBy || [];
        if (fundedBy.length === 0) return;

        fundedBy.forEach(funder => {
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
        const fundedBy = loan.fundedBy || [];
        if (fundedBy.length === 0) return null;
        
        let totalInstitutionProfitOnLoan = 0;
        let totalInvestorProfitOnLoan = 0;
        
        fundedBy.forEach(funder => {
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

function calculateSystemAdminMetrics(users: User[], investors: Investor[], allBorrowers: Borrower[]) {
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

    const { totalCapital, installmentCapital, graceCapital } = relevantInvestors.reduce((acc, investor) => {
        const financials = calculateInvestorFinancials(investor, allBorrowers);
        acc.totalCapital += financials.totalCapitalInSystem;
        acc.installmentCapital += financials.installmentCapital;
        acc.graceCapital += financials.gracePeriodCapital;
        return acc;
    }, { totalCapital: 0, installmentCapital: 0, graceCapital: 0 });
    
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

function calculateIdleFundsMetrics(investors: Investor[], allBorrowers: Borrower[]) {
    const idleInvestorsData = investors
        .filter(i => i.status === 'نشط')
        .map(investor => {
            const financials = calculateInvestorFinancials(investor, allBorrowers);
            return {
                ...investor,
                installmentCapital: financials.installmentCapital,
                gracePeriodCapital: financials.gracePeriodCapital,
            };
        })
        .filter(data => data.installmentCapital > 0 || data.gracePeriodCapital > 0);

    const totalIdleFunds = idleInvestorsData.reduce((sum, i) => sum + i.installmentCapital + i.gracePeriodCapital, 0);

    return { idleInvestors: idleInvestorsData, totalIdleFunds };
}

export function calculateAllDashboardMetrics(input: CalculationInput) {
    const { currentUser, users, investors, borrowers, config } = input;
    const { role } = currentUser;

    if (role === 'مدير النظام') {
        const adminMetrics = calculateSystemAdminMetrics(users, investors, borrowers);
        return {
            role: 'مدير النظام' as const,
            admin: adminMetrics,
        };
    }
    
    if (role === 'مستثمر') {
        return {
            role: 'مستثمر' as const,
        };
    }

    const { filteredBorrowers, filteredInvestors } = getFilteredData(input);
    
    const capitalMetrics = filteredInvestors.reduce((acc, investor) => {
        const financials = calculateInvestorFinancials(investor, borrowers);
        acc.total += financials.totalCapitalInSystem;
        acc.installments += financials.installmentCapital;
        acc.grace += financials.gracePeriodCapital;
        return acc;
    }, { total: 0, installments: 0, grace: 0 });


    return {
        role: role,
        filteredBorrowers,
        filteredInvestors,
        capital: capitalMetrics,
        installments: calculateInstallmentsMetrics(filteredBorrowers, filteredInvestors, config),
        gracePeriod: calculateGracePeriodMetrics(filteredBorrowers, filteredInvestors, config),
        idleFunds: calculateIdleFundsMetrics(filteredInvestors, borrowers),
    };
}

    