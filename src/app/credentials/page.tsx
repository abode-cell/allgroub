'use client';

import { useDataState, useDataActions } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Edit, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export default function CredentialsPage() {
  const { users, currentUser } = useDataState();
  const { updateUserCredentials } = useDataActions();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });

  const role = currentUser?.role;
  const hasAccess = role === 'مدير النظام';

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({ email: user.email, password: '' });
    setIsEditDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditForm(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    
    const updates: { email?: string, password?: string } = {};
    if (editForm.email !== selectedUser.email) {
      updates.email = editForm.email;
    }
    if (editForm.password) {
      updates.password = editForm.password;
    }

    if (Object.keys(updates).length > 0) {
      const result = await updateUserCredentials(selectedUser.id, updates);
      if (result.success) {
        setIsEditDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'خطأ', description: result.message });
      }
    } else {
      setIsEditDialogOpen(false);
    }
    
    setIsSubmitting(false);
  };

  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">بيانات دخول المستخدمين</h1>
            <p className="text-muted-foreground mt-1">
              عرض وتعديل بيانات تسجيل الدخول لجميع المستخدمين في النظام.
            </p>
          </header>

          <Card>
              <CardHeader>
                  <CardTitle>جدول بيانات الدخول</CardTitle>
                  <CardDescription>
                  انقر على زر التعديل لتغيير البريد الإلكتروني أو كلمة المرور لأي مستخدم.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>الاسم</TableHead>
                              <TableHead>البريد الإلكتروني</TableHead>
                              <TableHead>كلمة المرور</TableHead>
                              <TableHead className="text-left">الإجراء</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {users.map(user => (
                              <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.name}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                      <TooltipProvider>
                                          <Tooltip>
                                          <TooltipTrigger asChild>
                                              <span className="font-mono text-muted-foreground cursor-help">********</span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <p>لا يتم عرض كلمات المرور لأسباب أمنية.</p>
                                          </TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-left">
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(user)} disabled={user.id === currentUser.id}>
                                      <Edit className="ml-2 h-4 w-4" />
                                      تعديل
                                    </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات دخول {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              قم بتحديث البريد الإلكتروني أو كلمة المرور. اترك حقل كلمة المرور فارغًا لإبقائها كما هي.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <Input
                id="password"
                type="password"
                value={editForm.password}
                onChange={handleFormChange}
                placeholder="اتركه فارغًا لعدم التغيير"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                إلغاء
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveChanges} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
