'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Borrower } from '@/lib/types';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import type jsPDF from 'jspdf';

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
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      // Fetch the font from a reliable source instead of embedding the large base64 string
      const fontUrl = 'https://raw.githubusercontent.com/fonts/amiri/main/fonts/Amiri-Regular.ttf';
      const fontResponse = await fetch(fontUrl);
      const fontBlob = await fontResponse.blob();
      
      const reader = new FileReader();
      const fontData = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fontBlob);
      });

      // The reader result is a data URI. We need to extract the base64 part.
      const base64Font = (fontData as string).split(',')[1];
      
      if (!base64Font) {
        throw new Error("Could not read font data.");
      }

      const doc = new jsPDF();
      
      doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      
      doc.setFont("Amiri"); // Set the font for the entire document
      
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
    } catch (error) {
        console.error("Failed to export PDF", error);
    } finally {
        setIsExporting(false);
    }
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
            <Button onClick={handleExportPdf} disabled={isExporting}>
                {isExporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileDown className="ml-2 h-4 w-4" />}
                {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
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
