

'use client';

import { CircleDollarSign, Landmark, ShieldAlert, ShieldX, TrendingUp, Users, BadgePercent, Wallet, UserCheck, UserCog, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { LoansStatusChart } from '@/components/dashboard/loans-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { InvestorDashboard } from '@/components/dashboard/investor-dashboard';
import { useDataState } from '@/contexts/data-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Borrower, Investor, User, UserRole, SupportTicket, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { exportToPrintableHtml } from '@/lib/html-export';
import { formatCurrency, getBorrowerStatus, calculateInvestorFinancials } from '@/lib/utils';

// =================================================================
// Dashboard Calculation Logic (Moved here from service to resolve context issues)
// =================================================================

interface CalculationInput {
    borrowers: Borrower[];
    investors: Investor[];
    users: User[];
    transactions: Transaction[];
    currentUser: User;
    supportTickets: SupportTicket[];
    config: {
        investorSharePercentage: number;
        graceTotalProfitPercentage: number;
        graceInvestorSharePercentage: number;
    };
}

type AdminMetrics = ReturnType<typeof calculateSystemAdminMetrics>;
type ManagerCapitalMetrics = { total: number; installments: number; grace: number; active: number; };
type InstallmentsMetrics = ReturnType<typeof calculateInstallmentsMetrics>;
type GracePeriodMetrics = ReturnType<typeof calculateGracePeriodMetrics>;
type IdleFundsMetrics = ReturnType<typeof calculateIdleFundsMetrics>;

export type DashboardMetricsOutput = {
    role: UserRole;
    admin: AdminMetrics;
    manager: {
        managerName: string;
        filteredBorrowers: Borrower[];
        filteredInvestors: Investor[];
        totalBorrowers: number;
        totalInvestments: number;
        pendingRequestsCount: number;
        capital: ManagerCapitalMetrics;
        installments: InstallmentsMetrics;
        gracePeriod: GracePeriodMetrics;
        idleFunds: IdleFundsMetrics;
    }
};

function getFilteredData(input: CalculationInput) {
    const { currentUser, borrowers, investors, users } = input;
    const { role } = currentUser;
    const userMap = new Map(users.map(u => [u.id, u]));

    if (role === 'مدير النظام' || role === 'مستثمر') {
        return { filteredBorrowers: borrowers, filteredInvestors: investors, employeeIds: [] };
    }

    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;

    if (!managerId) {
        return { filteredBorrowers: [], filteredInvestors: [], employeeIds: [] };
    }

    const relevantUserIds = new Set<string>();
    const employeeIds: string[] = [];
    for(const u of users) {
        if (u.managedBy === managerId) {
            relevantUserIds.add(u.id);
            employeeIds.push(u.id);
        } else if (u.id === managerId) {
            relevantUserIds.add(u.id);
        }
    }
    relevantUserIds.add(currentUser.id);

    const filteredBorrowers = borrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
    const filteredInvestors = investors.filter(i => {
        const investorUser = userMap.get(i.id);
        return investorUser?.managedBy === managerId;
    });
    
    return { filteredBorrowers, filteredInvestors, employeeIds };
}

function calculateInstallmentsMetrics(borrowers: Borrower[], investors: Investor[], config: CalculationInput['config']) {
    const installmentLoans = borrowers.filter(b => b.loanType === 'اقساط');
    if (installmentLoans.length === 0) {
        return {
            loans: [], loansGranted: 0, defaultedLoans: [], defaultedFunds: 0, defaultRate: 0, defaultedProfits: 0,
            netProfit: 0, totalInstitutionProfit: 0, totalInvestorsProfit: 0,
            investorProfitsArray: [], dueDebts: 0, profitableLoansForAccordion: []
        };
    }
    const installmentLoansGranted = installmentLoans.reduce((acc, b) => acc + (b.amount || 0), 0);
    const installmentDefaultedLoans = installmentLoans.filter(b => 
        b.status === 'متعثر' || b.paymentStatus === 'متعثر' || b.paymentStatus === 'تم اتخاذ الاجراءات القانونيه'
    );
    const installmentDefaultedFunds = installmentDefaultedLoans.reduce((acc, b) => acc + (b.amount || 0), 0);
    const installmentDefaultRate = installmentLoansGranted > 0 ? (installmentDefaultedFunds / installmentLoansGranted) * 100 : 0;
    
    const investorMap = new Map(investors.map(inv => [inv.id, inv]));
    
    const defaultedProfits = installmentDefaultedLoans.reduce((acc, loan) => {
        if (!loan.rate || !loan.term || loan.rate <= 0 || loan.term <= 0) return acc;
        
        const fundedBy = loan.fundedBy || [];
        const totalProfitOnLoan = fundedBy.reduce((loanProfit, funder) => {
            const interestOnFundedAmount = (funder.amount || 0) * ((loan.rate || 0) / 100) * (loan.term || 0);
            return loanProfit + interestOnFundedAmount;
        }, 0);

        return acc + totalProfitOnLoan;
    }, 0);

    const profitableInstallmentLoans = installmentLoans.filter(
        b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل' || b.paymentStatus === 'تم السداد'
    );
    
    let totalInstitutionProfit = 0;
    let totalInvestorsProfit = 0;
    const investorProfits: { [investorId: string]: { id: string; name: string, profit: number } } = {};

    profitableInstallmentLoans.forEach(loan => {
        const fundedBy = loan.fundedBy || [];
        if (!loan.rate || !loan.term || loan.rate <= 0 || loan.term <= 0 || fundedBy.length === 0) return;
        
        fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;

            const profitShare = investorDetails.installmentProfitShare ?? config.investorSharePercentage;
            const interestOnFundedAmount = (funder.amount || 0) * ((loan.rate || 0) / 100) * (loan.term || 0);
            
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
        .reduce((acc, b) => acc + (b.amount || 0), 0);
    
    const profitableInstallmentLoansForAccordion = profitableInstallmentLoans.map(loan => {
        if (!loan.rate || !loan.term || loan.rate <= 0 || loan.term <= 0) return null;
        
        const fundedBy = loan.fundedBy || [];
        let totalInstitutionProfitOnLoan = 0;
        let totalInvestorProfitOnLoan = 0;

        fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;
            const profitShare = investorDetails.installmentProfitShare ?? config.investorSharePercentage;
            const interestOnFundedAmount = (funder.amount || 0) * ((loan.rate || 0) / 100) * (loan.term || 0);
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
      defaultedLoans: installmentDefaultedLoans,
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
     if (gracePeriodLoans.length === 0) {
        return {
            loans: [], loansGranted: 0, defaultedLoans: [], defaultedFunds: 0, defaultRate: 0, defaultedProfits: 0,
            totalDiscounts: 0, dueDebts: 0, netProfit: 0, totalInstitutionProfit: 0,
            totalInvestorsProfit: 0, investorProfitsArray: [], profitableLoansForAccordion: []
        };
    }
    const profitableLoans = gracePeriodLoans.filter(
      b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل' || b.paymentStatus === 'تم السداد'
    );

    const loansGranted = gracePeriodLoans.reduce((acc, b) => acc + (b.amount || 0), 0);
    const defaultedLoans = gracePeriodLoans.filter(b => 
        b.status === 'متعثر' || b.paymentStatus === 'متعثر' || b.paymentStatus === 'تم اتخاذ الاجراءات القانونيه'
    );
    const defaultedFunds = defaultedLoans.reduce((acc, b) => acc + (b.amount || 0), 0);
    const defaultRate = loansGranted > 0 ? (defaultedFunds / loansGranted) * 100 : 0;
    const totalDiscounts = gracePeriodLoans.reduce((acc, b) => acc + (b.discount || 0), 0);
    
    const defaultedProfits = defaultedLoans.reduce((acc, loan) => {
        if (config.graceTotalProfitPercentage <= 0) return acc;
        const fundedBy = loan.fundedBy || [];
        const totalProfitOnLoan = fundedBy.reduce((loanProfit, funder) => {
             const profitOnFundedAmount = (funder.amount || 0) * (config.graceTotalProfitPercentage / 100);
             return loanProfit + profitOnFundedAmount;
        }, 0);
        return acc + totalProfitOnLoan;
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
        .reduce((acc, b) => acc + (b.amount || 0), 0);
    
    let totalInstitutionProfit = 0;
    let totalInvestorsProfit = 0;
    const investorProfits: { [investorId: string]: { id: string; name: string, profit: number } } = {};
    const investorMap = new Map(investors.map(inv => [inv.id, inv]));

    profitableLoans.forEach(loan => {
        const fundedBy = loan.fundedBy || [];
        if (fundedBy.length === 0 || config.graceTotalProfitPercentage <= 0) return;

        fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;

            const totalProfitOnFundedAmount = (funder.amount || 0) * (config.graceTotalProfitPercentage / 100);
            const investorProfitShare = investorDetails.gracePeriodProfitShare ?? config.graceInvestorSharePercentage;
            const investorPortion = totalProfitOnFundedAmount * (investorProfitShare / 100);
            const institutionPortion = totalProfitOnFundedAmount - investorPortion;
            
            totalInvestorsProfit += investorPortion;
            totalInstitutionProfit += institutionPortion;

            if (!investorProfits[funder.investorId]) {
                investorProfits[funder.investorId] = { id: investorDetails.id, name: investorDetails.name, profit: 0 };
            }
            investorProfits[funder.investorId].profit += investorPortion;
        });
    });
    
    const finalInstitutionProfit = totalInstitutionProfit - totalDiscounts;
    const netProfit = finalInstitutionProfit + totalInvestorsProfit;
    const investorProfitsArray = Object.values(investorProfits);

     const profitableLoansForAccordion = profitableLoans.map(loan => {
        const fundedBy = loan.fundedBy || [];
        if (fundedBy.length === 0 || config.graceTotalProfitPercentage <= 0) return null;
        
        let totalInstitutionProfitOnLoan = 0;
        let totalInvestorProfitOnLoan = 0;
        
        fundedBy.forEach(funder => {
            const investorDetails = investorMap.get(funder.investorId);
            if (!investorDetails) return;
            const totalProfitOnFundedAmount = (funder.amount || 0) * (config.graceTotalProfitPercentage / 100);
            const investorProfitShare = investorDetails.gracePeriodProfitShare ?? config.graceInvestorSharePercentage;
            const investorPortion = totalProfitOnFundedAmount * (investorProfitShare / 100);
            const institutionPortion = totalProfitOnFundedAmount - investorPortion;
            totalInstitutionProfitOnLoan += institutionPortion;
            totalInvestorProfitOnLoan += investorPortion;
        });
        
        const finalInstitutionProfitOnLoan = totalInstitutionProfitOnLoan - (loan.discount || 0);

        const totalProfit = finalInstitutionProfitOnLoan + totalInvestorProfitOnLoan;
        
        return {
            id: loan.id,
            name: loan.name,
            amount: loan.amount,
            institutionProfit: finalInstitutionProfitOnLoan,
            investorProfit: totalInvestorProfitOnLoan,
            totalInterest: totalProfit,
        }
    }).filter((loan): loan is NonNullable<typeof loan> => loan !== null);

    return {
        loans: gracePeriodLoans,
        loansGranted,
        defaultedLoans,
        defaultedFunds,
        defaultRate,
        defaultedProfits,
        totalDiscounts,
        dueDebts,
        netProfit,
        totalInstitutionProfit: finalInstitutionProfit,
        totalInvestorsProfit,
        investorProfitsArray,
        profitableLoansForAccordion,
    };
}

function calculateSystemAdminMetrics(users: User[], investors: Investor[], allBorrowers: Borrower[], allTransactions: Transaction[], supportTickets: SupportTicket[]) {
    const officeManagers = users.filter(u => u.role === 'مدير المكتب');
    const userMap = new Map(users.map(u => [u.id, u]));
    const officeManagerIds = new Set(officeManagers.map(m => m.id));

    const pendingManagers = officeManagers.filter(u => u.status === 'معلق');
    const activeManagersCount = officeManagers.length - pendingManagers.length;
    
    const relevantInvestors = investors.filter(i => {
        const investorUser = userMap.get(i.id);
        return investorUser?.managedBy && officeManagerIds.has(investorUser.managedBy)
    });

    const { totalCapital, installmentCapital, graceCapital } = relevantInvestors.reduce((acc, investor) => {
        const financials = calculateInvestorFinancials(investor, allBorrowers, allTransactions);
        acc.totalCapital += financials.totalCapitalInSystem;
        acc.installmentCapital += financials.idleInstallmentCapital;
        acc.graceCapital += financials.idleGraceCapital;
        return acc;
    }, { totalCapital: 0, installmentCapital: 0, graceCapital: 0 });
    
    const totalUsersCount = users.length;
    const totalActiveLoans = allBorrowers.filter(b => b.status === 'منتظم' || b.status === 'متأخر').length;
    const newSupportTickets = supportTickets.filter(t => !t.isRead).length;

    return { 
        pendingManagers, 
        activeManagersCount, 
        totalCapital, 
        installmentCapital, 
        graceCapital, 
        totalUsersCount,
        totalActiveLoans,
        newSupportTickets,
        pendingManagersCount: pendingManagers.length,
    };
}

function calculateIdleFundsMetrics(investors: Investor[], relevantBorrowers: Borrower[], allTransactions: Transaction[]) {
    const idleInvestorsData = investors
        .filter(i => i.status === 'نشط')
        .map(investor => {
            const financials = calculateInvestorFinancials(investor, relevantBorrowers, allTransactions);
            return {
                ...investor,
                idleInstallmentCapital: financials.idleInstallmentCapital,
                idleGraceCapital: financials.idleGraceCapital,
            };
        })
        .filter(data => (data.idleInstallmentCapital ?? 0) > 0 || (data.idleGraceCapital ?? 0) > 0);

    const totalIdleFunds = idleInvestorsData.reduce((sum, i) => sum + (i.idleInstallmentCapital || 0) + (i.idleGraceCapital || 0), 0);

    const idleInvestorsWithType = idleInvestorsData.flatMap(investor => {
        const result: { id: string; name: string; investmentType: 'أقساط' | 'مهلة'; idleInstallmentCapital: number; idleGraceCapital: number }[] = [];
        if ((investor.idleInstallmentCapital ?? 0) > 0) {
            result.push({ ...investor, investmentType: 'أقساط' });
        }
        if ((investor.idleGraceCapital ?? 0) > 0) {
            result.push({ ...investor, investmentType: 'مهلة' });
        }
        return result;
    });

    return { idleInvestors: idleInvestorsWithType, totalIdleFunds };
}

const getDefaultMetrics = (): DashboardMetricsOutput => {
    const emptyBorrowers: Borrower[] = [];
    const emptyInvestors: Investor[] = [];
    const emptyTransactions: Transaction[] = [];
    const emptyConfig = { investorSharePercentage: 0, graceTotalProfitPercentage: 0, graceInvestorSharePercentage: 0 };

    return {
        role: 'مستثمر', // Default role
        admin: {
            pendingManagers: [], activeManagersCount: 0, totalCapital: 0, installmentCapital: 0,
            graceCapital: 0, totalUsersCount: 0, pendingManagersCount: 0, totalActiveLoans: 0, newSupportTickets: 0,
        },
        manager: {
            managerName: '',
            filteredBorrowers: [],
            filteredInvestors: [],
            totalBorrowers: 0,
            totalInvestments: 0,
            pendingRequestsCount: 0,
            capital: { total: 0, installments: 0, grace: 0, active: 0 },
            installments: calculateInstallmentsMetrics(emptyBorrowers, emptyInvestors, emptyConfig),
            gracePeriod: calculateGracePeriodMetrics(emptyBorrowers, emptyInvestors, emptyConfig),
            idleFunds: calculateIdleFundsMetrics(emptyInvestors, emptyBorrowers, emptyTransactions),
        }
    };
};

function calculateAllDashboardMetrics(input: CalculationInput): DashboardMetricsOutput {
    const { currentUser, users, investors, borrowers, transactions, supportTickets, config } = input;
    const { role } = currentUser;

    const defaults = getDefaultMetrics();

    if (role === 'مدير النظام') {
        const adminMetrics = calculateSystemAdminMetrics(users, investors, borrowers, transactions, supportTickets);
        return {
            ...defaults,
            role: role,
            admin: adminMetrics,
        };
    }
    
    if (role === 'مستثمر') {
         return {
            ...defaults,
            role: role,
        };
    }
    
    const { filteredBorrowers, filteredInvestors, employeeIds } = getFilteredData(input);
    
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    const managerUser = users.find(u => u.id === managerId);
    const managerName = managerUser?.name || '';

    const capitalMetrics = filteredInvestors.reduce((acc, investor) => {
        const financials = calculateInvestorFinancials(investor, filteredBorrowers, transactions);
        acc.total += financials.totalCapitalInSystem;
        acc.installments += financials.idleInstallmentCapital;
        acc.grace += financials.idleGraceCapital;
        acc.active += financials.activeCapital;
        return acc;
    }, { total: 0, installments: 0, grace: 0, active: 0 });

    const totalInvestments = filteredInvestors.reduce((total, investor) => {
        const capitalDeposits = (transactions.filter(tx => tx.investor_id === investor.id) || [])
          .filter(tx => tx.type === 'إيداع رأس المال')
          .reduce((sum, tx) => sum + tx.amount, 0);
        return total + capitalDeposits;
    }, 0);

    const pendingBorrowerRequests = borrowers.filter(b => b.status === 'معلق' && b.submittedBy && employeeIds.includes(b.submittedBy));
    const pendingInvestorRequests = investors.filter(i => i.status === 'معلق' && i.submittedBy && employeeIds.includes(i.submittedBy));
    const pendingRequestsCount = pendingBorrowerRequests.length + pendingInvestorRequests.length;
    
    const managerMetrics = {
        managerName,
        filteredBorrowers,
        filteredInvestors,
        totalBorrowers: filteredBorrowers.length,
        totalInvestments,
        pendingRequestsCount,
        capital: capitalMetrics,
        installments: calculateInstallmentsMetrics(filteredBorrowers, filteredInvestors, config),
        gracePeriod: calculateGracePeriodMetrics(filteredBorrowers, filteredInvestors, config),
        idleFunds: calculateIdleFundsMetrics(filteredInvestors, filteredBorrowers, transactions),
    };

    return {
        ...defaults,
        role: role,
        manager: managerMetrics,
    };
}


const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);

const InstallmentsDashboard = ({ metrics, showSensitiveData, borrowers, investors }: { metrics: InstallmentsMetrics, showSensitiveData: boolean, borrowers: Borrower[], investors: Investor[] }) => {
  return (
    <div className="space-y-6">
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", showSensitiveData ? "xl:grid-cols-6" : "xl:grid-cols-4")}>
        <KpiCard
          title="القروض الممنوحة (أقساط)"
          value={formatCurrency(metrics.loansGranted)}
          change=""
          icon={<Landmark className="size-6 text-muted-foreground" />}
        />
        {showSensitiveData && (
             <KpiCard
                title="صافي الربح"
                value={formatCurrency(metrics.netProfit)}
                change=""
                icon={<TrendingUp className="size-6 text-muted-foreground" />}
            />
        )}
        <KpiCard
          title="الديون المستحقة"
          value={formatCurrency(metrics.dueDebts)}
          change=""
          icon={<Users className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
        <KpiCard
          title="الأموال المتعثرة (أقساط)"
          value={formatCurrency(metrics.defaultedFunds)}
          change=""
          icon={<ShieldX className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
        {showSensitiveData && (
           <KpiCard
            title="الأرباح المتعثرة"
            value={formatCurrency(metrics.defaultedProfits)}
            change="من قروض متعثرة"
            icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
        )}
        <KpiCard
          title="نسبة التعثر (أقساط)"
          value={`${metrics.defaultRate.toFixed(1)}%`}
          change=""
          icon={<ShieldAlert className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        {showSensitiveData && (
          <div className="col-span-12 lg:col-span-4">
            <Card>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <div className="flex w-full items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <TrendingUp className="h-8 w-8 text-primary" />
                                    <div className="text-right">
                                        <h3 className="text-lg font-semibold">إجمالي صافي الأرباح (أقساط)</h3>
                                        <p className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">انقر لعرض التفاصيل</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الجهة</TableHead>
                                        <TableHead className="text-left">الأرباح</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">ربح المؤسسة</TableCell>
                                        <TableCell className="text-left font-semibold">{formatCurrency(metrics.totalInstitutionProfit)}</TableCell>
                                    </TableRow>
                                    {metrics.investorProfitsArray.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell>{inv.name}</TableCell>
                                            <TableCell className="text-left font-semibold">{formatCurrency(inv.profit)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="border-t-2 border-dashed bg-muted/50">
                                        <TableCell className="font-bold">إجمالي أرباح المستثمرين</TableCell>
                                        <TableCell className="text-left font-bold">{formatCurrency(metrics.totalInvestorsProfit)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>
          </div>
        )}
        <div className={cn("col-span-12", showSensitiveData ? "lg:col-span-3" : "lg:col-span-7")}>
          <LoansStatusChart borrowers={metrics.loans} />
        </div>
      </div>

      <div>
        <RecentTransactions borrowers={borrowers} investors={investors} />
      </div>

      {showSensitiveData && (
        <Card>
            <CardHeader>
                <CardTitle>تفصيل أرباح المؤسسة (الأقساط)</CardTitle>
                <CardDescription>عرض تفصيلي لربح المؤسسة من كل قرض أقساط.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {metrics.profitableLoansForAccordion.map(loan => (
                      <AccordionItem value={loan.id} key={loan.id}>
                          <AccordionTrigger>
                              <div className="flex justify-between w-full pr-4 items-center">
                                  <span className="font-medium">{loan.name}</span>
                                  <span className="font-bold text-primary">{formatCurrency(loan.institutionProfit)}</span>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2 bg-muted/30 p-4">
                              <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                              <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(loan.totalInterest)}</span></div>
                              <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(loan.investorProfit)}</span></div>
                          </AccordionContent>
                      </AccordionItem>
                    ))}
                    {metrics.profitableLoansForAccordion.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>لا توجد قروض أقساط مربحة لعرض تفاصيلها.</p>
                        </div>
                    )}
                </Accordion>
            </CardContent>
        </Card>
      )}
    </div>
  );
};


const GracePeriodDashboard = ({ metrics, showSensitiveData, config, borrowers, investors }: { metrics: GracePeriodMetrics, showSensitiveData: boolean, config: any, borrowers: Borrower[], investors: Investor[] }) => {
    return (
        <div className="space-y-6">
            <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", showSensitiveData ? "xl:grid-cols-6" : "xl:grid-cols-4")}>
                <KpiCard
                    title="التمويل الممنوح (مهلة)"
                    value={formatCurrency(metrics.loansGranted)}
                    change=""
                    icon={<Landmark className="size-6 text-muted-foreground" />}
                />
                 {showSensitiveData && (
                    <KpiCard
                        title="صافي الأرباح"
                        value={formatCurrency(metrics.netProfit)}
                        change={`${config.graceTotalProfitPercentage.toFixed(1)}% من الأصل`}
                        icon={<TrendingUp className="size-6 text-muted-foreground" />}
                        changeColor='text-green-500'
                    />
                 )}
                 <KpiCard
                    title="الديون المستحقة"
                    value={formatCurrency(metrics.dueDebts)}
                    change=""
                    icon={<Users className="size-6 text-muted-foreground" />}
                    changeColor="text-red-500"
                 />
                 <KpiCard
                    title="إجمالي الخصومات"
                    value={formatCurrency(metrics.totalDiscounts)}
                    change="على قروض المهلة"
                    icon={<BadgePercent className="size-6 text-muted-foreground" />}
                    changeColor="text-blue-500"
                 />
                 <KpiCard
                    title="الأموال المتعثرة (مهلة)"
                    value={formatCurrency(metrics.defaultedFunds)}
                    change={`${metrics.defaultRate.toFixed(1)}% نسبة التعثر`}
                    icon={<ShieldX className="size-6 text-muted-foreground" />}
                    changeColor="text-red-500"
                />
                {showSensitiveData && (
                    <KpiCard
                        title="الأرباح المتعثرة"
                        value={formatCurrency(metrics.defaultedProfits)}
                        change="من قروض متعثرة"
                        icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                        changeColor="text-red-500"
                    />
                )}
            </div>
            
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
              {showSensitiveData && (
                 <div className="col-span-12 lg:col-span-4">
                    <Card>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="p-6 hover:no-underline">
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <TrendingUp className="h-8 w-8 text-primary" />
                                            <div className="text-right">
                                                <h3 className="text-lg font-semibold">إجمالي صافي الأرباح (المهلة)</h3>
                                                <p className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">انقر لعرض التفاصيل</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>الجهة</TableHead>
                                                <TableHead className="text-left">الأرباح</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">ربح المؤسسة</TableCell>
                                                <TableCell className="text-left font-semibold">{formatCurrency(metrics.totalInstitutionProfit)}</TableCell>
                                            </TableRow>
                                            {metrics.investorProfitsArray.map(inv => (
                                                <TableRow key={inv.id}>
                                                    <TableCell>{inv.name}</TableCell>
                                                    <TableCell className="text-left">{formatCurrency(inv.profit)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                </div>
              )}
              <div className={cn("col-span-12", showSensitiveData ? "lg:col-span-3" : "lg:col-span-7")}>
                <LoansStatusChart borrowers={metrics.loans} />
              </div>
            </div>

            <div>
              <RecentTransactions borrowers={borrowers} investors={investors} />
            </div>

            {showSensitiveData && (
              <Card>
                  <CardHeader>
                      <CardTitle>تفصيل أرباح المؤسسة (المهلة)</CardTitle>
                      <CardDescription>عرض تفصيلي لربح المؤسسة من كل قرض مهلة.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                          {metrics.profitableLoansForAccordion.map(loan => (
                              <AccordionItem value={loan.id} key={loan.id}>
                                  <AccordionTrigger>
                                      <div className="flex justify-between w-full pr-4 items-center">
                                          <span className="font-medium">{loan.name}</span>
                                          <span className="font-bold text-primary">{formatCurrency(loan.institutionProfit)}</span>
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-2 bg-muted/30 p-4">
                                      <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                                      <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(loan.totalInterest)}</span></div>
                                      <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(loan.investorProfit)}</span></div>
                                  </AccordionContent>
                              </AccordionItem>
                          ))}
                          {metrics.profitableLoansForAccordion.length === 0 && (
                              <div className="text-center text-muted-foreground py-8">
                                  <p>لا توجد قروض مهلة مربحة لعرض تفاصيلها.</p>
                              </div>
                          )}
                      </Accordion>
                  </CardContent>
              </Card>
            )}
        </div>
    );
};

const IdleFundsCard = ({ metrics }: { metrics: IdleFundsMetrics }) => {
    return (
        <Card>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Wallet className="h-8 w-8 text-primary" />
                                <div className="text-right">
                                    <h3 className="text-lg font-semibold">الأموال الخاملة</h3>
                                    <p className="text-2xl font-bold">{formatCurrency(metrics.totalIdleFunds)}</p>
                                </div>
                            </div>
                             <p className="text-xs text-muted-foreground">انقر لعرض التفاصيل</p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>اسم المستثمر</TableHead>
                                    <TableHead>نوع الاستثمار</TableHead>
                                    <TableHead className="text-left">المبلغ الخامل</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {metrics.idleInvestors.length > 0 ? (
                                    metrics.idleInvestors.map(investor => (
                                        <TableRow key={`${investor.id}-${investor.investmentType}`}>
                                            <TableCell className="font-medium">{investor.name}</TableCell>
                                            <TableCell><Badge variant="outline">{investor.investmentType}</Badge></TableCell>
                                            <TableCell className="text-left font-semibold">{formatCurrency(investor.investmentType === 'أقساط' ? investor.idleInstallmentCapital : investor.idleGraceCapital)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            لا توجد أموال خاملة حاليًا.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
};


const SystemAdminDashboard = ({ metrics, onExport }: { metrics: AdminMetrics, onExport: () => void }) => {
    const { updateUserStatus } = useDataState();
    
    return (
        <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
             <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                    لوحة تحكم مدير النظام
                    </h1>
                    <p className="text-muted-foreground mt-1">
                    نظرة عامة على صحة المنصة والمستخدمين.
                    </p>
                </div>
                 <Button onClick={onExport}>
                    <Download className="ml-2 h-4 w-4" />
                    تصدير ملخص اليوم
                </Button>
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                    title="إجمالي رأس المال"
                    value={formatCurrency(metrics.totalCapital)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال الأقساط"
                    value={formatCurrency(metrics.installmentCapital)}
                    change="مخصص لتمويل الأقساط"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال المهلة"
                    value={formatCurrency(metrics.graceCapital)}
                    change="مخصص لتمويل المهلة"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                <KpiCard
                    title="إجمالي المستخدمين"
                    value={String(metrics.totalUsersCount)}
                    change=""
                    icon={<Users className="size-6 text-muted-foreground" />}
                />
                <KpiCard
                    title="مدراء المكاتب النشطون"
                    value={String(metrics.activeManagersCount)}
                    change=""
                    icon={<UserCheck className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="طلبات التفعيل المعلقة"
                    value={String(metrics.pendingManagersCount)}
                    change=""
                    icon={<UserCog className="size-6 text-muted-foreground" />}
                    changeColor={metrics.pendingManagersCount > 0 ? 'text-red-500' : ''}
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>طلبات تفعيل مدراء المكاتب</CardTitle>
                    <CardDescription>
                       مراجعة وتفعيل الحسابات الجديدة لمدراء المكاتب.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الاسم</TableHead>
                                <TableHead>البريد الإلكتروني</TableHead>
                                <TableHead>تاريخ التسجيل</TableHead>
                                <TableHead className="text-left">الإجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metrics.pendingManagers.length > 0 ? (
                                metrics.pendingManagers.map(manager => (
                                    <TableRow key={manager.id}>
                                        <TableCell className="font-medium">{manager.name}</TableCell>
                                        <TableCell>{manager.email}</TableCell>
                                        <TableCell>{manager.registrationDate ? new Date(manager.registrationDate).toLocaleDateString('ar-SA') : 'غير محدد'}</TableCell>
                                        <TableCell className="text-left">
                                            <Button size="sm" onClick={() => updateUserStatus(manager.id, 'نشط')}>
                                                <CheckCircle className="ml-2 h-4 w-4" />
                                                تفعيل الحساب
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        لا توجد طلبات تفعيل معلقة.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

export default function DashboardPage() {
  const { currentUser, users, borrowers, investors, transactions, supportTickets, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage, updateUserStatus } = useDataState();
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!currentUser) return null;
    try {
        const result = calculateAllDashboardMetrics({
            borrowers,
            investors,
            users,
            transactions,
            currentUser,
            supportTickets,
            config: {
            investorSharePercentage,
            graceTotalProfitPercentage,
            graceInvestorSharePercentage,
            }
        });
        return result as DashboardMetricsOutput;
    } catch (e: any) {
        console.error("Error calculating dashboard metrics:", e);
        setError(`حدث خطأ أثناء حساب مقاييس لوحة التحكم: ${e.message}`);
        return null;
    }
  }, [borrowers, investors, users, transactions, currentUser, supportTickets, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

  useEffect(() => {
    if (!metrics && currentUser && !error) {
        setError("حدث خطأ أثناء حساب مقاييس لوحة التحكم. قد تكون بعض البيانات غير متناسقة. يرجى مراجعة البيانات أو التواصل مع الدعم الفني.");
    } else if (metrics && error) {
        setError(null);
    }
  }, [metrics, currentUser, error]);


  const handleExport = () => {
    if (!metrics || !currentUser) return;

    let htmlBody = '';
    const { role } = metrics;
    
    if (role === 'مدير النظام' && metrics.admin) {
        const { admin } = metrics;
        htmlBody = `
            <style>
                .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
                .summary-card { padding: 1rem; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9; }
                .summary-card h3 { margin: 0 0 0.5rem 0; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
                .summary-card p { margin: 0.25rem 0; font-size: 1rem; display: flex; justify-content: space-between; }
                .summary-card p span:last-child { font-weight: bold; }
            </style>
            <h2>نظرة عامة على النظام</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>المالية</h3>
                    <p><span>إجمالي رأس المال:</span> <span>${formatCurrency(admin.totalCapital)}</span></p>
                    <p><span>رأس مال الأقساط الخامل:</span> <span>${formatCurrency(admin.installmentCapital)}</span></p>
                    <p><span>رأس مال المهلة الخامل:</span> <span>${formatCurrency(admin.graceCapital)}</span></p>
                </div>
                <div class="summary-card">
                    <h3>المستخدمون</h3>
                    <p><span>إجمالي المستخدمين:</span> <span>${admin.totalUsersCount}</span></p>
                    <p><span>مدراء المكاتب النشطون:</span> <span>${admin.activeManagersCount}</span></p>
                    <p><span>الطلبات المعلقة:</span> <span>${admin.pendingManagersCount}</span></p>
                </div>
                 <div class="summary-card">
                    <h3>العمليات</h3>
                    <p><span>القروض النشطة:</span> <span>${admin.totalActiveLoans}</span></p>
                    <p><span>طلبات الدعم الجديدة:</span> <span>${admin.newSupportTickets}</span></p>
                </div>
            </div>
        `;
    } else if (metrics.manager) {
        const { manager } = metrics;
        const totalLoanAmount = (manager.installments?.loansGranted ?? 0) + (manager.gracePeriod?.loansGranted ?? 0);
        const netProfit = (manager.installments?.netProfit ?? 0) + (manager.gracePeriod?.netProfit ?? 0);
        const defaultedLoansCount = (manager.installments?.defaultedLoans?.length ?? 0) + (manager.gracePeriod?.defaultedLoans?.length ?? 0);
        const idleCapital = manager.idleFunds?.totalIdleFunds ?? 0;

        htmlBody = `
             <style>
                .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
                .summary-card { padding: 1rem; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9; }
                .summary-card h3 { margin: 0 0 0.5rem 0; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
                .summary-card p { margin: 0.25rem 0; font-size: 1rem; display: flex; justify-content: space-between; }
                .summary-card p span:last-child { font-weight: bold; }
            </style>
            <h2>ملخص المكتب لـ ${manager.managerName}</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>المحفظة</h3>
                    <p><span>إجمالي المقترضين:</span> <span>${manager.totalBorrowers}</span></p>
                    <p><span>إجمالي المستثمرين:</span> <span>${manager.filteredInvestors?.length ?? 0}</span></p>
                </div>
                <div class="summary-card">
                    <h3>المالية</h3>
                    <p><span>قيمة القروض الممنوحة:</span> <span>${formatCurrency(totalLoanAmount)}</span></p>
                    <p><span>إجمالي الاستثمارات:</span> <span>${formatCurrency(manager.totalInvestments)}</span></p>
                </div>
                 <div class="summary-card">
                    <h3>الأداء والسيولة</h3>
                    <p><span>صافي الربح المحقق:</span> <span>${formatCurrency(netProfit)}</span></p>
                    <p><span>رأس المال الخامل:</span> <span>${formatCurrency(idleCapital)}</span></p>
                </div>
                 <div class="summary-card">
                    <h3>المهام والمخاطر</h3>
                    <p><span>الطلبات المعلقة:</span> <span>${manager.pendingRequestsCount}</span></p>
                    <p><span>القروض المتعثرة:</span> <span>${defaultedLoansCount}</span></p>
                </div>
            </div>
        `;
    }

    exportToPrintableHtml(`ملخص اليوم`, currentUser, { htmlBody });
  };


  if (!currentUser) {
      return <PageSkeleton />;
  }
  
  if (error) {
    return (
        <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ في عرض لوحة التحكم</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
    );
  }

  if (!metrics) {
      return <PageSkeleton />;
  }

  if (metrics.role === 'مدير النظام' && metrics.admin) {
    return <SystemAdminDashboard metrics={metrics.admin} onExport={handleExport} />;
  }

  if (metrics.role === 'مستثمر') {
    return <InvestorDashboard />;
  }
  
  const { manager: managerMetrics } = metrics;

  if (!managerMetrics) {
    return <PageSkeleton />;
  }

  const { filteredBorrowers, filteredInvestors, capital, idleFunds, installments, gracePeriod } = managerMetrics;
  
  const showSensitiveData = !!(metrics.role === 'مدير المكتب' || (metrics.role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports));
  const showIdleFundsReport = !!(metrics.role === 'مدير المكتب' || (metrics.role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewIdleFundsReport));
  
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              الرئيسية
            </h1>
            <p className="text-muted-foreground mt-1">
              نظرة عامة على أداء منصتك المالية.
            </p>
          </div>
          <Button onClick={handleExport} disabled={!metrics}>
            <Download className="ml-2 h-4 w-4" />
            تصدير ملخص اليوم
          </Button>
        </header>

        {showSensitiveData && (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                    title="إجمالي رأس المال"
                    value={formatCurrency(capital.total)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال الأقساط"
                    value={formatCurrency(capital.installments)}
                    change="متاح لتمويل الأقساط"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال المهلة"
                    value={formatCurrency(capital.grace)}
                    change="متاح لتمويل المهلة"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
            </div>
        )}
        
        {showIdleFundsReport && <IdleFundsCard metrics={idleFunds} />}

        <Tabs defaultValue="grace-period" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">قروض الأقساط</TabsTrigger>
                <TabsTrigger value="grace-period">قروض المهلة</TabsTrigger>
            </TabsList>
            <TabsContent value="installments" className="mt-6">
                <InstallmentsDashboard metrics={installments} showSensitiveData={showSensitiveData} borrowers={filteredBorrowers} investors={filteredInvestors} />
            </TabsContent>
            <TabsContent value="grace-period" className="mt-6">
                <GracePeriodDashboard 
                  metrics={gracePeriod} 
                  showSensitiveData={showSensitiveData} 
                  config={{ graceTotalProfitPercentage }} 
                  borrowers={filteredBorrowers} 
                  investors={filteredInvestors}
                />
            </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}

    