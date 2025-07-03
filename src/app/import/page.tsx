'use client';

import { useState, useEffect } from 'react';
import { useDataState, useDataActions } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUp, Loader2, CheckCircle, AlertCircle, ListChecks } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Borrower } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);

// Define the expected structure of a row in the Excel file
type ExcelRow = {
  'اسم المقترض': string;
  'المبلغ': number;
  'نوع التمويل': 'اقساط' | 'مهلة';
  'تاريخ الاستحقاق': string | number; // Excel dates can be numbers
  'الفائدة (٪)': number;
  'المدة (سنوات)': number;
  'الخصم': number;
};

export default function ImportPage() {
  const { addBorrower } = useDataActions();
  const { currentUser } = useDataState();
  const { toast } = useToast();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.importData);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);


  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setImportResult(null); // Reset result when a new file is selected
    }
  };
  
  // Helper to convert Excel serial date to YYYY-MM-DD string
  const convertExcelDate = (excelDate: number) => {
      // Formula to convert Excel serial number to JS Date
      const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
  };

  const handleImport = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء اختيار ملف Excel أولاً.',
      });
      return;
    }

    setIsLoading(true);
    setImportResult(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let failedCount = 0;
        const errorMessages: string[] = [];

        for (const [index, row] of json.entries()) {
          // --- Data Validation ---
          if (!row['اسم المقترض'] || !row['المبلغ'] || !row['نوع التمويل'] || !row['تاريخ الاستحقاق']) {
            errorMessages.push(`صف ${index + 2}: الأعمدة المطلوبة (اسم المقترض، المبلغ، نوع التمويل، تاريخ الاستحقاق) غير موجودة.`);
            failedCount++;
            continue;
          }
          
          let dueDate = row['تاريخ الاستحقاق'];
          if (typeof dueDate === 'number') {
              dueDate = convertExcelDate(dueDate);
          } else if (typeof dueDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
              // Attempt to parse other common date formats if needed, or fail.
              // For simplicity, we'll assume YYYY-MM-DD string or Excel serial number.
              try {
                  const parsedDate = new Date(dueDate);
                  if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
                  dueDate = parsedDate.toISOString().split('T')[0];
              } catch {
                  errorMessages.push(`صف ${index + 2}: صيغة تاريخ الاستحقاق "${dueDate}" غير صالحة. الرجاء استخدام YYYY-MM-DD.`);
                  failedCount++;
                  continue;
              }
          }

          const newBorrower: Omit<Borrower, 'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus' | 'phone'> = {
            name: row['اسم المقترض'],
            amount: Number(row['المبلغ']),
            loanType: row['نوع التمويل'],
            dueDate: dueDate as string,
            // Always set as pending for manual review and investor assignment
            status: 'معلق', 
            rate: Number(row['الفائدة (٪)'] || 0),
            term: Number(row['المدة (سنوات)'] || 0),
            discount: Number(row['الخصم'] || 0),
          };

          try {
            // Using an empty array for investorIds because status is 'معلق'
            await addBorrower(newBorrower, []);
            successCount++;
          } catch (error) {
            failedCount++;
            errorMessages.push(`صف ${index + 2}: فشل في إضافة المقترض "${newBorrower.name}".`);
          }
        }
        
        setImportResult({ success: successCount, failed: failedCount, errors: errorMessages });
        toast({
          title: 'اكتملت عملية الاستيراد',
          description: `تم استيراد ${successCount} سجل بنجاح، وفشل ${failedCount} سجل.`,
        });

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          variant: 'destructive',
          title: 'خطأ في التحليل',
          description: 'فشل في قراءة ملف Excel. تأكد من أن الملف غير تالف وأن الأعمدة متوافقة.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في قراءة الملف.',
      });
    };

    reader.readAsBinaryString(file);
  };
  
  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">استيراد بيانات العملاء</h1>
          <p className="text-muted-foreground mt-1">
            قم برفع ملف Excel لاستيراد بيانات المقترضين دفعة واحدة.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1. رفع الملف</CardTitle>
              <CardDescription>
                اختر ملف Excel (.xlsx أو .xls) الذي يحتوي على بيانات العملاء.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="excel-file">ملف العملاء</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleImport} disabled={!file || isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الاستيراد...
                  </>
                ) : (
                  <>
                    <FileUp className="ml-2 h-4 w-4" />
                    بدء الاستيراد
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. نتيجة الاستيراد</CardTitle>
              <CardDescription>
                سيتم عرض ملخص لعملية الاستيراد هنا.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!importResult ? (
                <div className="flex items-center justify-center h-full min-h-[150px] bg-muted rounded-md text-muted-foreground">
                  <p>في انتظار ملف لبدء عملية الاستيراد...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {importResult.failed === 0 ? (
                    <Alert variant="default" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800 dark:text-green-300">نجاح كامل</AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        تم استيراد جميع السجلات بنجاح! تم استيراد {importResult.success} سجل.
                      </AlertDescription>
                    </Alert>
                  ) : (
                     <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>اكتمل مع وجود أخطاء</AlertTitle>
                      <AlertDescription>
                        نجح: {importResult.success} | فشل: {importResult.failed}
                      </AlertDescription>
                    </Alert>
                  )}

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                        <h4 className='font-semibold'>تفاصيل الأخطاء:</h4>
                        <div className="max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/50 space-y-1 text-xs">
                            {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                        </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
           <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks />
                  تعليمات تنسيق الملف
                </CardTitle>
                <CardDescription>
                  لضمان نجاح عملية الاستيراد، يجب أن يحتوي ملف Excel على الأعمدة التالية بالأسماء المحددة.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><span className="font-semibold text-foreground">اسم المقترض</span> (نص, مطلوب)</li>
                  <li><span className="font-semibold text-foreground">المبلغ</span> (رقم, مطلوب)</li>
                  <li><span className="font-semibold text-foreground">نوع التمويل</span> (نص: 'اقساط' أو 'مهلة', مطلوب)</li>
                  <li><span className="font-semibold text-foreground">تاريخ الاستحقاق</span> (تاريخ بصيغة YYYY-MM-DD, مطلوب)</li>
                  <li><span className="font-semibold text-foreground">الفائدة (٪)</span> (رقم, مطلوب لقروض الأقساط)</li>
                  <li><span className="font-semibold text-foreground">المدة (سنوات)</span> (رقم, مطلوب لقروض الأقساط)</li>
                  <li><span className="font-semibold text-foreground">الخصم</span> (رقم, اختياري لقروض المهلة)</li>
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                    ملاحظة: سيتم تجاهل أي أعمدة أخرى في الملف. سيتم استيراد جميع القروض بحالة "معلق" لمراجعتها.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
