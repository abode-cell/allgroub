'use client';

import { useDataState } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import type { Borrower } from '@/lib/types';

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

export default function ContactsPage() {
  const { currentUser, borrowers } = useDataState();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const role = currentUser?.role;
  const hasAccess = role === 'مدير النظام';

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  const filteredBorrowers = useMemo(() => {
    return borrowers.filter(
      (borrower) =>
        borrower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        borrower.phone.includes(searchTerm)
    );
  }, [borrowers, searchTerm]);
  
  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">بيانات اتصال العملاء</h1>
          <p className="text-muted-foreground mt-1">
            قائمة بأسماء وأرقام هواتف جميع عملاء القروض في النظام.
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>قائمة العملاء</CardTitle>
              <CardDescription>
                يمكنك البحث بالاسم أو برقم الجوال.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="ابحث..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead className="text-left">رقم الجوال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBorrowers.length > 0 ? (
                  filteredBorrowers.map((borrower) => (
                    <TableRow key={borrower.id}>
                      <TableCell className="font-medium">{borrower.name}</TableCell>
                      <TableCell className="text-left font-mono">{borrower.phone}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      {searchTerm ? 'لم يتم العثور على عملاء يطابقون بحثك.' : 'لا يوجد عملاء لعرضهم.'}
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
