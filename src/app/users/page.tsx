'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDataState, useDataActions } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  PlusCircle, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Users as UsersIcon,
  Building,
  UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, NewUserPayload, Branch } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

const PageSkeleton = () => (
  <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>
      <Skeleton className="h-10 w-28" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  نشط: 'default',
  معلق: 'secondary',
  مرفوض: 'destructive',
  محذوف: 'outline',
};

export default function UsersPage() {
  const { currentUser, users, branches } = useDataState();
  const { addUser, updateUser, updateUserStatus, deleteUser } = useDataActions();
  const router = useRouter();
  const { toast } = useToast();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير النظام' || role === 'مدير المكتب';

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const initialUserState: NewUserPayload = {
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'موظف',
    branch_id: null,
  };

  const [newUser, setNewUser] = useState<NewUserPayload>(initialUserState);

  // Filter users based on current user's role
  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    
    if (role === 'مدير النظام') {
      return users;
    }
    
    if (role === 'مدير المكتب') {
      return users.filter(u => 
        u.office_id === currentUser.office_id || 
        u.id === currentUser.id
      );
    }
    
    return [];
  }, [currentUser, users, role]);

  // Get office branches for the current user
  const officeBranches = useMemo(() => {
    if (!currentUser?.office_id) return [];
    return branches.filter(b => b.office_id === currentUser.office_id);
  }, [branches, currentUser]);

  // Calculate limits and usage
  const limits = useMemo(() => {
    if (role !== 'مدير المكتب' || !currentUser) return null;

    const officeUsers = users.filter(u => u.office_id === currentUser.office_id && u.id !== currentUser.id);
    const employees = officeUsers.filter(u => u.role === 'موظف');
    const assistants = officeUsers.filter(u => u.role === 'مساعد مدير المكتب');

    return {
      employees: {
        current: employees.length,
        limit: currentUser.employeeLimit || 5
      },
      assistants: {
        current: assistants.length,
        limit: currentUser.assistantLimit || 2
      },
      branches: {
        current: officeBranches.length,
        limit: currentUser.branchLimit || 3
      }
    };
  }, [role, currentUser, users, officeBranches]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewUser(prev => ({ ...prev, [id]: value }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.confirmPassword) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة.' });
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'كلمتا المرور غير متطابقتين.' });
      return;
    }

    // Check limits
    if (limits) {
      if (newUser.role === 'موظف' && limits.employees.current >= limits.employees.limit) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'وصلت للحد الأقصى من الموظفين.' });
        return;
      }
      if (newUser.role === 'مساعد مدير المكتب' && limits.assistants.current >= limits.assistants.limit) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'وصلت للحد الأقصى من المساعدين.' });
        return;
      }
    }

    setIsSubmitting(true);
    
    const result = await addUser({
      ...newUser,
      office_id: currentUser?.office_id
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsAddDialogOpen(false);
      setNewUser(initialUserState);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    await updateUser(selectedUser.id, {
      name: selectedUser.name,
      phone: selectedUser.phone,
      branch_id: selectedUser.branch_id,
      permissions: selectedUser.permissions,
      allowEmployeeSubmissions: selectedUser.allowEmployeeSubmissions,
      hideEmployeeInvestorFunds: selectedUser.hideEmployeeInvestorFunds,
      allowEmployeeLoanEdits: selectedUser.allowEmployeeLoanEdits,
    });
    setIsSubmitting(false);
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const canAddUsers = role === 'مدير المكتب' && limits && (
    limits.employees.current < limits.employees.limit || 
    limits.assistants.current < limits.assistants.limit
  );

  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">
              إضافة وإدارة المستخدمين والصلاحيات في النظام.
            </p>
          </header>
          
          {role === 'مدير المكتب' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canAddUsers}>
                  <PlusCircle className="ml-2 h-4 w-4" />
                  إضافة مستخدم
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleAddUser}>
                  <DialogHeader>
                    <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                    <DialogDescription>
                      أدخل بيانات المستخدم الجديد. سيتم إنشاء حساب له تلقائياً.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">الاسم</Label>
                      <Input
                        id="name"
                        placeholder="الاسم الكامل"
                        className="col-span-3"
                        value={newUser.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        className="col-span-3"
                        value={newUser.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">رقم الجوال</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05xxxxxxxx"
                        className="col-span-3"
                        value={newUser.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">الدور</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as any }))}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="موظف">موظف</SelectItem>
                          <SelectItem value="مساعد مدير المكتب">مساعد مدير المكتب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {officeBranches.length > 0 && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">الفرع</Label>
                        <Select
                          value={newUser.branch_id || 'none'}
                          onValueChange={(value) => setNewUser(prev => ({ 
                            ...prev, 
                            branch_id: value === 'none' ? null : value 
                          }))}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون فرع</SelectItem>
                            {officeBranches.map(branch => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name} - {branch.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="كلمة مرور مؤقتة"
                        className="col-span-3"
                        value={newUser.password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="confirmPassword" className="text-right">تأكيد كلمة المرور</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="تأكيد كلمة المرور"
                        className="col-span-3"
                        value={newUser.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      إضافة المستخدم
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Limits Display for Office Managers */}
        {role === 'مدير المكتب' && limits && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الموظفون</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {limits.employees.current}/{limits.employees.limit}
                </div>
                <p className="text-xs text-muted-foreground">
                  عدد الموظفين المضافين
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المساعدون</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {limits.assistants.current}/{limits.assistants.limit}
                </div>
                <p className="text-xs text-muted-foreground">
                  عدد مساعدي المدير
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الفروع</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {limits.branches.current}/{limits.branches.limit}
                </div>
                <p className="text-xs text-muted-foreground">
                  عدد الفروع المضافة
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>قائمة المستخدمين</CardTitle>
            <CardDescription>
              عرض وإدارة جميع المستخدمين في النظام.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.length > 0 ? (
                  visibleUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariant[user.status] || 'default'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.registrationDate 
                          ? new Date(user.registrationDate).toLocaleDateString('ar-SA')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-left">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === 'معلق' && (
                              <>
                                <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'نشط')}>
                                  <CheckCircle className="ml-2 h-4 w-4" />
                                  تفعيل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'مرفوض')}>
                                  <XCircle className="ml-2 h-4 w-4" />
                                  رفض
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleEditUser(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Edit className="ml-2 h-4 w-4" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteClick(user)}
                              disabled={user.id === currentUser?.id || user.role === 'مدير النظام'}
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      لا يوجد مستخدمون لعرضهم.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم: {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              تحديث بيانات وصلاحيات المستخدم.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">الاسم</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">رقم الجوال</Label>
                <Input
                  id="edit-phone"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              
              {/* Branch Assignment */}
              {officeBranches.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">الفرع</Label>
                  <Select
                    value={selectedUser.branch_id || 'none'}
                    onValueChange={(value) => setSelectedUser(prev => prev ? { 
                      ...prev, 
                      branch_id: value === 'none' ? null : value 
                    } : null)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون فرع</SelectItem>
                      {officeBranches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} - {branch.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Permissions for Assistant */}
              {selectedUser.role === 'مساعد مدير المكتب' && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">الصلاحيات</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'manageInvestors', label: 'إدارة المستثمرين' },
                      { key: 'manageBorrowers', label: 'إدارة القروض' },
                      { key: 'importData', label: 'استيراد البيانات' },
                      { key: 'viewReports', label: 'عرض التقارير' },
                      { key: 'manageRequests', label: 'إدارة الطلبات' },
                      { key: 'useCalculator', label: 'استخدام الحاسبة' },
                      { key: 'accessSettings', label: 'الوصول للإعدادات' },
                    ].map(permission => (
                      <div key={permission.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.key}
                          checked={selectedUser.permissions?.[permission.key as keyof typeof selectedUser.permissions] || false}
                          onCheckedChange={(checked) => {
                            setSelectedUser(prev => prev ? {
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                [permission.key]: checked
                              }
                            } : null);
                          }}
                        />
                        <Label htmlFor={permission.key} className="text-sm">
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Office Manager Settings */}
              {selectedUser.role === 'مدير المكتب' && selectedUser.id === currentUser?.id && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">إعدادات المكتب</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allowSubmissions">السماح للموظفين بإضافة طلبات</Label>
                      <Switch
                        id="allowSubmissions"
                        checked={selectedUser.allowEmployeeSubmissions || false}
                        onCheckedChange={(checked) => setSelectedUser(prev => prev ? {
                          ...prev,
                          allowEmployeeSubmissions: checked
                        } : null)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hideFunds">إخفاء أرصدة المستثمرين عن الموظفين</Label>
                      <Switch
                        id="hideFunds"
                        checked={selectedUser.hideEmployeeInvestorFunds || false}
                        onCheckedChange={(checked) => setSelectedUser(prev => prev ? {
                          ...prev,
                          hideEmployeeInvestorFunds: checked
                        } : null)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allowEdits">السماح للموظفين بتعديل القروض</Label>
                      <Switch
                        id="allowEdits"
                        checked={selectedUser.allowEmployeeLoanEdits || false}
                        onCheckedChange={(checked) => setSelectedUser(prev => prev ? {
                          ...prev,
                          allowEmployeeLoanEdits: checked
                        } : null)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستخدم "{userToDelete?.name}"؟ 
              سيتم وضع علامة "محذوف" على الحساب وإلغاء وصوله للنظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}