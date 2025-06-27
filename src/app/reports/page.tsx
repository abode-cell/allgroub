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
import { useToast } from '@/hooks/use-toast';

// Extend the jsPDF interface for the autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
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
  const { toast } = useToast();

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

        // Use the Amiri font, known for excellent Arabic script support, from a more reliable CDN.
        const fontUrl = 'https://cdn.jsdelivr.net/gh/alif-type/amiri@main/fonts/ttf/amiri-regular.ttf';
        const fontResponse = await fetch(fontUrl);
        if (!fontResponse.ok) throw new Error("Failed to fetch font");

        const fontBlob = await fontResponse.blob();
        
        const reader = new FileReader();
        const fontData = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(fontBlob);
        });

        const base64Font = fontData.split(',')[1];
        if (!base64Font) throw new Error("Could not read font data.");

        const doc = new jsPDF();
        const fontName = "Amiri";
        
        doc.addFileToVFS(`${fontName}-Regular.ttf`, base64Font);
        doc.addFont(`${fontName}-Regular.ttf`, fontName, "normal");
        doc.setFont(fontName);

        doc.text("تقرير حالة القروض", doc.internal.pageSize.getWidth() - 15, 15, { align: 'right' });

        const formatCurrencyForPdf = (value: number) =>
            new Intl.NumberFormat('en-US', { // Use 'en-US' for standard numerals
                style: 'currency',
                currency: 'SAR',
            }).format(value);

        const head = [[
            'المستثمر الممول',
            'الحالة',
            'تاريخ الاستحقاق',
            'تاريخ القرض',
            'مبلغ القرض',
            'اسم المقترض',
        ]];
        
        const body = loansForReport.map(loan => [
            getInvestorNameForLoan(loan.id),
            loan.status,
            loan.dueDate,
            loan.date,
            formatCurrencyForPdf(loan.amount), // Use PDF-safe formatter
            loan.name,
        ].reverse()); // Reverse array for correct RTL display in autoTable

        doc.autoTable({
            head: [head[0].reverse()], // Reverse headers as well
            body: body,
            startY: 20,
            theme: 'grid',
            styles: {
                font: fontName,
                halign: 'right', 
            },
            headStyles: {
                font: fontName,
                halign: 'center',
                fillColor: '#42A5F5',
                textColor: '#FFFFFF',
            },
        });

        doc.save('loans-report.pdf');
    } catch (error) {
        console.error("Failed to export PDF", error);
        toast({
            variant: 'destructive',
            title: 'خطأ في التصدير',
            description: 'لم نتمكن من تصدير الملف. يرجى التأكد من اتصالك بالإنترنت.'
        })
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
