'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Borrower } from '@/lib/types';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { amiriFont } from '@/lib/fonts';

// Extend the jsPDF interface for the autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  منتظم: 'default',
  متأخر: 'destructive',
  متعثر: 'destructive',
  معلق: 'secondary',
  'مسدد بالكامل': 'secondary',
};


export default function ReportsPage() {
  const { borrowers, investors } = useData();

  const getInvestorNameForLoan = (loanId: string) => {
    const investor = investors.find(inv => inv.fundedLoanIds.includes(loanId));
    return investor ? investor.name : 'غير محدد';
  };

  const loansForReport = borrowers.filter(b => 
    b.status === 'متعثر' || 
    b.status === 'معلق' ||
    b.status === 'منتظم' ||
    b.status === 'متأخر'
  );

  const handleExportPdf = () => {
    const doc = new jsPDF();
    
    // Add the Amiri font to jsPDF. The font is base64 encoded.
    // We remove whitespace and newlines to prevent an 'atob' error.
    doc.addFileToVFS("Amiri-Regular.ttf", amiriFont.replace(/\s/g, ''));
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");

    // Set the title, aligned to the right for RTL
    doc.text("تقرير حالة القروض", 195, 16, { align: 'right' });
    
    doc.autoTable({
        html: '#loansTable',
        startY: 20,
        theme: 'grid',
        headStyles: {
            font: "Amiri",
            halign: 'center', // Center headers for a clean look
        },
        styles: {
            font: "Amiri",
            halign: 'right', // Right-align body content for Arabic
        },
        didDrawPage: (data) => {
            // This hook ensures the font is correctly set for each page.
            doc.setFont("Amiri");
        }
    });
    doc.save('loans-report.pdf');
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
            <header>
            <h1 className="text-3xl font-bold tracking-tight">تقرير حالة القروض</h1>
            <p className="text-muted-foreground mt-1">
                نظرة شاملة على جميع القروض النشطة، المعلقة، والمتعثرة.
            </p>
            </header>
            <Button onClick={handleExportPdf}>
                <FileDown className="ml-2 h-4 w-4" />
                تصدير PDF
            </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة القروض</CardTitle>
            <CardDescription>
              قائمة بجميع القروض النشطة، المعلقة، والمتعثرة في النظام.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table id="loansTable">
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المقترض</TableHead>
                  <TableHead>مبلغ القرض</TableHead>
                  <TableHead>تاريخ القرض</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المستثمر الممول</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loansForReport.length > 0 ? (
                  loansForReport.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.name}</TableCell>
                      <TableCell>{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>{loan.date}</TableCell>
                      <TableCell>{loan.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[loan.status] || 'outline'}>
                          {loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getInvestorNameForLoan(loan.id)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      لا توجد قروض لعرضها في التقرير.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
