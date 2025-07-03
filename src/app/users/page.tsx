

'use client';

import { useDataState, useDataActions } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Hourglass,
  MoreHorizontal,
  Trash2,
  Briefcase,
  Building2,
  PiggyBank,
  Save,
  UserCog,
  Settings,
  ShieldCheck,
  Users2,
  Check,
  X,
  PlusCircle,
  Edit,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, UserRole, PermissionKey, NewUserPayload } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';


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

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } =
  {
    نشط: 'default',
    معلق: 'secondary',
  };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);
  
const assistantPermissionsConfig: {
  key: PermissionKey;
  label: string;
  description: string;
}[] = [
  { key: 'manageInvestors', label: 'إدارة المستثمرين', description: 'السماح بإضافة وتعديل المستثمرين.' },
  { key: 'manageBorrowers', label: 'إدارة القروض', description: 'السماح بإضافة وتعديل القروض.' },
  { key: 'importData', label: 'استيراد البيانات', description: 'السماح باستيراد البيانات من ملفات Excel.' },
  { key: 'viewReports', label: 'عرض التقارير', description: 'السماح بالوصول إلى صفحة التقارير الشاملة.' },
  { key: 'viewIdleFundsReport', label: 'عرض تقرير الأموال الخاملة', description: 'السماح بالوصول إلى تقرير الأموال الخاملة في الصفحة الرئيسية.' },
  { key: 'manageRequests', label: 'إدارة الطلبات', description: 'السماح بمراجعة طلبات الموظفين والموافقة عليها أو رفضها.' },
  { key: 'useCalculator', label: 'استخدام الحاسبة', description: 'السماح باستخدام حاسبة القروض والأرباح.' },
  { key: 'accessSettings', label: 'الوصول للإعدادات', description: 'السماح بالوصول إلى صفحة الإعدادات الإدارية.' },
  { key: 'manageEmployeePermissions', label: 'إدارة صلاحيات الموظفين', description: 'تمكين المساعد من تفعيل أو تعطيل صلاحيات الموظفين.' },
];

const UserActions = ({ user, onDeleteClick, onEditClick }: { user: User, onDeleteClick: (user: User) => void, onEditClick: (user: User) => void }) => {
  const { updateUserStatus } = useDataActions();
  const { currentUser } = useDataState();

  const { canEditCredentials, canDeleteUser, canUpdateUserStatus } = useMemo(() => {
    if (!currentUser || user.id === currentUser.id) {
        return { canEditCredentials: false, canDeleteUser: false, canUpdateUserStatus: false };
    }
    
    // System admin cannot be modified by anyone
    if (user.role === 'مدير النظام') {
        return { canEditCredentials: false, canDeleteUser: false, canUpdateUserStatus: false };
    }

    const isSystemAdmin = currentUser.role === 'مدير النظام';
    const isOfficeManager = currentUser.role === 'مدير المكتب';
    const isAssistant = currentUser.role === 'مساعد مدير المكتب';
    
    // A subordinate cannot edit their manager
    if(user.id === currentUser.managedBy) return { canEditCredentials: false, canDeleteUser: false, canUpdateUserStatus: false };

    const canEdit = isSystemAdmin || (isOfficeManager && user.managedBy === currentUser.id) || (isAssistant && currentUser.permissions?.accessSettings && user.managedBy === currentUser.managedBy && user.role === 'موظف');
    const canDelete = isSystemAdmin || (isOfficeManager && user.managedBy === currentUser.id);
    const canUpdateStatus = isSystemAdmin || (isOfficeManager && user.managedBy === currentUser.id) || (isAssistant && user.managedBy === currentUser.managedBy && user.role === 'موظف');
    
    return { canEditCredentials: canEdit, canDeleteUser: canDelete, canUpdateUserStatus: canUpdateStatus };
  }, [currentUser, user]);

  if (!canEditCredentials && !canDeleteUser && !canUpdateUserStatus) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 justify-start">
        {canUpdateUserStatus && (
          user.status === 'معلق' ? (
            <Button size="sm" variant="outline" onClick={() => updateUserStatus(user.id, 'نشط')}>
              <Check className="ml-1 h-4 w-4" />
              تفعيل
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => updateUserStatus(user.id, 'معلق')}>
               <X className="ml-1 h-4 w-4" />
              تعليق
            </Button>
          )
        )}
        {(canEditCredentials || canDeleteUser) && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">فتح قائمة الإجراءات</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                     {canEditCredentials && (
                        <DropdownMenuItem onSelect={() => onEditClick(user)}>
                            <Edit className="ml-2 h-4 w-4" />
                            <span>تعديل بيانات الدخول</span>
                        </DropdownMenuItem>
                     )}
                     {canDeleteUser && (
                        <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => onDeleteClick(user)}
                        >
                            <Trash2 className="ml-2 h-4 w-4" />
                            <span>حذف الحساب</span>
                        </DropdownMenuItem>
                     )}
                </DropdownMenuContent>
            </DropdownMenu>
        )}
    </div>
  );
};


export default function UsersPage() {
  const { currentUser, users, investors } = useDataState();
  const { updateUserRole, deleteUser, updateUserLimits, updateManagerSettings, updateAssistantPermission, addNewSubordinateUser, updateUserCredentials } =
    useDataActions();
  const router = useRouter();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editableLimits, setEditableLimits] = useState<
    Record<string, { investorLimit: string; employeeLimit: string; assistantLimit: string }>
  >({});
  
  const getInitialAddUserFormState = () => ({
    role: null as 'موظف' | 'مساعد مدير المكتب' | null,
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState(getInitialAddUserFormState());
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  
  const [isEditCredsDialogOpen, setIsEditCredsDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editCredsForm, setEditCredsForm] = useState({ email: '', password: '' });
  const [isCredsSubmitting, setIsCredsSubmitting] = useState(false);
  
  const role = currentUser?.role;
  const canViewPage = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.accessSettings);

  useEffect(() => {
    if (currentUser && !canViewPage) {
      router.replace('/');
    }
  }, [currentUser, canViewPage, router]);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.id) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "لا يمكنك تغيير دورك الخاص.",
        });
        return;
    }
    updateUserRole(userId, newRole);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleEditCredsClick = (user: User) => {
    setUserToEdit(user);
    setEditCredsForm({ email: user.email, password: '' });
    setIsEditCredsDialogOpen(true);
  };

  const handleCredsFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditCredsForm(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setIsCredsSubmitting(true);
    
    const updates: { email?: string, password?: string } = {};
    if (editCredsForm.email !== userToEdit.email) {
      updates.email = editCredsForm.email;
    }
    if (editCredsForm.password) {
      updates.password = editCredsForm.password;
    }

    if (Object.keys(updates).length > 0) {
      const result = await updateUserCredentials(userToEdit.id, updates);
      if (result.success) {
        setIsEditCredsDialogOpen(false);
      }
    } else {
      setIsEditCredsDialogOpen(false); // Close if no changes were made
    }
    setIsCredsSubmitting(false);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleAccordionChange = (value: string) => {
    if (value) {
      const manager = officeManagers.find((m) => m.id === value);
      if (manager && !editableLimits[manager.id]) {
        setEditableLimits((prev) => ({
          ...prev,
          [manager.id]: {
            investorLimit: String(manager.investorLimit ?? 10),
            employeeLimit: String(manager.employeeLimit ?? 5),
            assistantLimit: String(manager.assistantLimit ?? 2),
          },
        }));
      }
    }
  };

  const handleLimitsChange = (
    managerId: string,
    field: 'investorLimit' | 'employeeLimit' | 'assistantLimit',
    value: string
  ) => {
    setEditableLimits((prev) => ({
      ...prev,
      [managerId]: {
        ...(prev[managerId] || { investorLimit: '0', employeeLimit: '0', assistantLimit: '0' }),
        [field]: value,
      },
    }));
  };

  const handleSaveLimits = (managerId: string) => {
    const limits = editableLimits[managerId];
    if (limits) {
      updateUserLimits(managerId, {
        investorLimit: Number(limits.investorLimit) || 0,
        employeeLimit: Number(limits.employeeLimit) || 0,
        assistantLimit: Number(limits.assistantLimit) || 0,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddUserForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.role) return;

    if (addUserForm.password !== addUserForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'خطأ في التحقق',
        description: 'كلمتا المرور غير متطابقتين. يرجى التأكد.',
      });
      return;
    }
    
    setIsSubmittingNewUser(true);
    const { name, email, phone, password } = addUserForm;
    const result = await addNewSubordinateUser({ name, email, phone, password }, addUserForm.role);
      
    setIsSubmittingNewUser(false);
    if (result.success) {
      setIsAddUserDialogOpen(false);
    }
  };

  const officeManagers = useMemo(() => users.filter((u) => u.role === 'مدير المكتب'), [users]);
  const otherUsers = useMemo(() => users.filter(
    (u) => u.role === 'مدير النظام'
  ), [users]);

  const myEmployees = useMemo(() => {
    if (!currentUser) return [];
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    return users.filter((u) => u.managedBy === managerId && u.role === 'موظف');
  }, [users, role, currentUser]);
  
  const myAssistants = useMemo(() => {
    if (!currentUser || role !== 'مدير المكتب') return [];
    return users.filter((u) => u.managedBy === currentUser.id && u.role === 'مساعد مدير المكتب');
  }, [users, currentUser, role]);

  if (!currentUser || !canViewPage) {
    return <PageSkeleton />;
  }

  const renderSystemAdminView = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            إدارة حسابات المكاتب
          </CardTitle>
          <CardDescription>
            مراجعة وتفعيل وإدارة حسابات العملاء (مدراء المكاتب) المسجلين في المنصة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {officeManagers.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              className="w-full"
              onValueChange={handleAccordionChange}
            >
              {officeManagers.map((manager) => {
                const employees = users.filter(
                  (u) => u.managedBy === manager.id && u.role === 'موظف'
                );
                const assistants = users.filter(
                  (u) => u.managedBy === manager.id && u.role === 'مساعد مدير المكتب'
                );
                const managerInvestors = investors.filter(
                  (i) => {
                    const user = users.find(u => u.id === i.id);
                    return user?.managedBy === manager.id
                  }
                );

                return (
                  <AccordionItem value={manager.id} key={manager.id}>
                    <AccordionPrimitive.Header className="flex">
                      <AccordionTrigger className="flex-1 text-right py-4 px-4 hover:no-underline hover:bg-muted/50 rounded-t-md justify-start">
                          <div className="flex flex-1 items-center justify-between">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                              <div className="font-bold text-base">
                                {manager.name}
                              </div>
                              <div className="text-xs text-muted-foreground sm:text-sm">
                                {manager.email}
                              </div>
                            </div>
                            <Badge variant={statusVariant[manager.status]}>
                              {manager.status === 'نشط' ? (
                                <CheckCircle className="w-3 h-3 ml-1" />
                              ) : (
                                <Hourglass className="w-3 h-3 ml-1" />
                              )}
                              {manager.status}
                            </Badge>
                          </div>
                      </AccordionTrigger>
                    </AccordionPrimitive.Header>
                    <AccordionContent className="bg-muted/30 p-4 border-l-4 border-primary space-y-6">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">
                                تاريخ التسجيل: {manager.registrationDate ? new Date(manager.registrationDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                            </p>
                             <UserActions user={manager} onDeleteClick={handleDeleteClick} onEditClick={handleEditCredsClick} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                  <CardTitle className="text-base flex items-center gap-2">
                                      <Settings className="h-5 w-5 text-primary" />
                                      الإعدادات والحدود
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-3 items-end">
                                        <div className="space-y-2">
                                            <Label htmlFor={`investor-limit-${manager.id}`}>حد المستثمرين</Label>
                                            <Input id={`investor-limit-${manager.id}`} type="number" value={editableLimits[manager.id]?.investorLimit ?? ''}
                                            onChange={(e) => handleLimitsChange(manager.id, 'investorLimit', e.target.value)}
                                            placeholder={String(manager.investorLimit ?? 10)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`employee-limit-${manager.id}`}>حد الموظفين</Label>
                                            <Input id={`employee-limit-${manager.id}`} type="number" value={editableLimits[manager.id]?.employeeLimit ?? ''}
                                            onChange={(e) => handleLimitsChange(manager.id, 'employeeLimit', e.target.value)}
                                            placeholder={String(manager.employeeLimit ?? 5)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`assistant-limit-${manager.id}`}>حد المساعدين</Label>
                                            <Input id={`assistant-limit-${manager.id}`} type="number" value={editableLimits[manager.id]?.assistantLimit ?? ''}
                                            onChange={(e) => handleLimitsChange(manager.id, 'assistantLimit', e.target.value)}
                                            placeholder={String(manager.assistantLimit ?? 2)}
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={() => handleSaveLimits(manager.id)} size="sm" className="w-full">
                                        <Save className="ml-2 h-4 w-4" />
                                        حفظ الحدود
                                    </Button>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3 shadow-sm">
                                            <div className="flex-1 space-y-0.5 overflow-hidden">
                                                <Label htmlFor={`allow-submissions-${manager.id}`} className="font-semibold text-sm">السماح بالإضافة للموظفين</Label>
                                                <p className="text-xs text-muted-foreground">تمكين موظفيه من رفع طلبات جديدة.</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Switch id={`allow-submissions-${manager.id}`} checked={manager.allowEmployeeSubmissions ?? false} onCheckedChange={(checked) => updateManagerSettings(manager.id, { allowEmployeeSubmissions: checked })} />
                                            </div>
                                        </div>
                                        <div className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3 shadow-sm">
                                            <div className="flex-1 space-y-0.5 overflow-hidden">
                                                <Label htmlFor={`hide-funds-${manager.id}`} className="font-semibold text-sm">إخفاء أرصدة المستثمرين</Label>
                                                <p className="text-xs text-muted-foreground">منع موظفيه من رؤية أموال المستثمرين.</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Switch id={`hide-funds-${manager.id}`} checked={manager.hideEmployeeInvestorFunds ?? false} onCheckedChange={(checked) => updateManagerSettings(manager.id, { hideEmployeeInvestorFunds: checked })} />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Users2 className="h-5 w-5 text-primary" />
                                        الحسابات المرتبطة
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="rounded-md border bg-background p-2">
                                        <h5 className="font-medium text-sm p-2 flex items-center gap-2"><PiggyBank className="h-4 w-4 text-muted-foreground" /> المستثمرون ({managerInvestors.length})</h5>
                                        {managerInvestors.length > 0 ? (
                                            <ul className="text-xs text-muted-foreground px-4 list-disc space-y-1">
                                            {managerInvestors.map(i => <li key={i.id}>{i.name}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground py-2">لا يوجد مستثمرون مرتبطون.</p>
                                        )}
                                    </div>
                                    <div className="rounded-md border bg-background p-2">
                                        <h5 className="font-medium text-sm p-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> الموظفون ({employees.length})</h5>
                                        {employees.length > 0 ? (
                                            <ul className="text-xs text-muted-foreground px-4 list-disc space-y-1">
                                                {employees.map(e => <li key={e.id}>{e.name}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground py-2">لا يوجد موظفون مرتبطون.</p>
                                        )}
                                    </div>
                                    <div className="rounded-md border bg-background p-2">
                                        <h5 className="font-medium text-sm p-2 flex items-center gap-2"><UserCog className="h-4 w-4 text-muted-foreground" /> المساعدون ({assistants.length})</h5>
                                        {assistants.length > 0 ? (
                                            <ul className="text-xs text-muted-foreground px-4 list-disc space-y-1">
                                                {assistants.map(a => <li key={a.id}>{a.name}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground py-2">لا يوجد مساعدون مرتبطون.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-4 h-24 flex items-center justify-center">
              لا يوجد مدراء مكاتب في النظام حالياً لمراجعتهم.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مستخدمون آخرون</CardTitle>
          <CardDescription>
            قائمة بالمستخدمين الآخرين مثل مدير النظام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead className="text-center">الدور</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-left">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherUsers.length > 0 ? otherUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className='flex justify-center'>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) =>
                          handleRoleChange(user.id, newRole)
                        }
                        disabled={user.id === currentUser?.id || user.role === 'مدير النظام'}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="اختر دورًا" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مدير النظام">
                            مدير النظام
                          </SelectItem>
                          <SelectItem value="مدير المكتب">
                            مدير المكتب
                          </SelectItem>
                          <SelectItem value="مساعد مدير المكتب">
                            مساعد مدير المكتب
                          </SelectItem>
                          <SelectItem value="موظف">موظف</SelectItem>
                          <SelectItem value="مستثمر">مستثمر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusVariant[user.status]}>
                      {user.status === 'نشط' ? (
                        <CheckCircle className="w-3 h-3 ml-1" />
                      ) : (
                        <Hourglass className="w-3 h-3 ml-1" />
                      )}
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                     <UserActions user={user} onDeleteClick={handleDeleteClick} onEditClick={handleEditCredsClick} />
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        لا يوجد مستخدمون آخرون لعرضهم.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );

  const renderOfficeManagerView = () => {
    const managerIdForSettings = role === 'مدير المكتب' ? currentUser?.id : currentUser?.managedBy;
    const managerForSettings = users.find(u => u.id === managerIdForSettings);
    
    const canAddAssistant = role === 'مدير المكتب' && myAssistants.length < (currentUser.assistantLimit ?? 0);
    const canAddEmployee = role === 'مدير المكتب' && myEmployees.length < (currentUser.employeeLimit ?? 0);
    
    const canManageAssistants = role === 'مدير المكتب';
    const canManageEmployees = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageEmployeePermissions);
    
    const pageTitle = role === 'مدير المكتب' ? 'إدارة فريق العمل' : 'إدارة الموظفين';
    const pageDescription = role === 'مدير المكتب'
        ? 'عرض وإدارة المساعدين والموظفين المرتبطين بحسابك وصلاحياتهم.'
        : 'عرض وإدارة الموظفين المرتبطين بالمكتب.';

    return (
    <>
      <header className='mb-8'>
        <h1 className="text-3xl font-bold tracking-tight">
          {pageTitle}
        </h1>
        <p className="text-muted-foreground mt-1">
          {pageDescription}
        </p>
      </header>

      {canManageAssistants && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Users2 className="h-6 w-6 text-primary" />
                إدارة المساعدين ({myAssistants.length} / {currentUser.assistantLimit ?? 0})
              </CardTitle>
              <CardDescription>
                عرض وإدارة صلاحيات مساعدي مدير المكتب التابعين لك.
              </CardDescription>
            </div>
             <Button size="sm" onClick={() => { setAddUserForm(getInitialAddUserFormState()); setAddUserForm(prev => ({ ...prev, role: 'مساعد مدير المكتب' })); setIsAddUserDialogOpen(true); }} disabled={!canAddAssistant}>
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة مساعد
            </Button>
          </CardHeader>
          <CardContent>
            {myAssistants.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {myAssistants.map((assistant) => (
                  <AccordionItem value={assistant.id} key={assistant.id}>
                       <AccordionPrimitive.Header className="flex">
                        <AccordionTrigger className="flex-1 text-right p-4 hover:no-underline hover:bg-muted/50 rounded-t-md justify-start">
                          <div className="flex flex-1 items-center justify-between">
                              <div className="font-bold text-base">
                                {assistant.name}
                              </div>
                              <Badge variant={statusVariant[assistant.status]}>
                                {assistant.status === 'نشط' ? (
                                  <CheckCircle className="w-3 h-3 ml-1" />
                                ) : (
                                  <Hourglass className="w-3 h-3 ml-1" />
                                )}
                                {assistant.status}
                              </Badge>
                          </div>
                        </AccordionTrigger>
                      </AccordionPrimitive.Header>
                      <AccordionContent className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <div className="flex justify-end">
                                <UserActions user={assistant} onDeleteClick={handleDeleteClick} onEditClick={handleEditCredsClick} />
                            </div>
                            <h4 className="font-semibold flex items-center gap-2">
                                  <ShieldCheck className="h-5 w-5 text-primary" />
                                  صلاحيات المساعد
                              </h4>
                              {assistantPermissionsConfig.map((perm) => (
                                  <div key={perm.key} className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3 shadow-sm">
                                      <div className="flex-1 space-y-0.5 overflow-hidden">
                                          <Label htmlFor={`${perm.key}-${assistant.id}`} className="font-medium">{perm.label}</Label>
                                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <Switch
                                            id={`${perm.key}-${assistant.id}`}
                                            checked={assistant.permissions?.[perm.key] ?? false}
                                            onCheckedChange={(checked) => updateAssistantPermission(assistant.id, perm.key, checked)}
                                        />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground py-4 h-24 flex items-center justify-center">
                  لا يوجد مساعدون مرتبطون بحسابك.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canManageEmployees && (
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className='flex items-center gap-2'>
                  <UserCog className="h-6 w-6 text-primary" />
                  إدارة الموظفين ({myEmployees.length} / {managerForSettings?.employeeLimit ?? 0})
              </CardTitle>
              <CardDescription>
                عرض وإدارة الموظفين المرتبطين بالمكتب.
              </CardDescription>
            </div>
            {role === 'مدير المكتب' && (
                <Button size="sm" onClick={() => { setAddUserForm(getInitialAddUserFormState()); setAddUserForm(prev => ({ ...prev, role: 'موظف' })); setIsAddUserDialogOpen(true); }} disabled={!canAddEmployee}>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    إضافة موظف
                </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
             <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        الصلاحيات العامة للموظفين
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3 shadow-sm">
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                        <Label htmlFor="allow-submissions" className="font-medium text-sm">السماح لموظفيك بالإضافة</Label>
                        <p className="text-xs text-muted-foreground">
                            تمكين/تعطيل قدرة الموظفين التابعين لك على رفع طلبات قروض ومستثمرين جدد.
                        </p>
                        </div>
                        <div className="flex-shrink-0">
                            <Switch
                                id="allow-submissions"
                                checked={managerForSettings?.allowEmployeeSubmissions ?? false}
                                onCheckedChange={(checked) => {
                                    if (managerIdForSettings) {
                                    updateManagerSettings(managerIdForSettings, { allowEmployeeSubmissions: checked });
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3 shadow-sm">
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                            <Label htmlFor="hide-investor-funds" className="font-medium text-sm">إخفاء أرصدة المستثمرين عن الموظفين</Label>
                            <p className="text-xs text-muted-foreground">
                                في حال تفعيله، لن يتمكن الموظفون من رؤية المبالغ المتاحة للمستثمرين.
                            </p>
                        </div>
                         <div className="flex-shrink-0">
                            <Switch
                                id="hide-investor-funds"
                                checked={managerForSettings?.hideEmployeeInvestorFunds ?? false}
                                onCheckedChange={(checked) => {
                                    if (managerIdForSettings) {
                                        updateManagerSettings(managerIdForSettings, { hideEmployeeInvestorFunds: checked });
                                    }
                                }}
                            />
                        </div>
                    </div>
                     <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3 shadow-sm">
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                            <Label htmlFor="allow-loan-edits" className="font-medium text-sm">السماح للموظفين بتعديل القروض</Label>
                            <p className="text-xs text-muted-foreground">
                                تمكين الموظفين من تعديل تفاصيل القرض وحالة السداد.
                            </p>
                        </div>
                         <div className="flex-shrink-0">
                            <Switch
                                id="allow-loan-edits"
                                checked={managerForSettings?.allowEmployeeLoanEdits ?? false}
                                onCheckedChange={(checked) => {
                                    if (managerIdForSettings) {
                                        updateManagerSettings(managerIdForSettings, { allowEmployeeLoanEdits: checked });
                                    }
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-left">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myEmployees.length > 0 ? (
                  myEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariant[employee.status]}>
                          {employee.status === 'نشط' ? (
                            <CheckCircle className="w-3 h-3 ml-1" />
                          ) : (
                            <Hourglass className="w-3 h-3 ml-1" />
                          )}
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                         <UserActions user={employee} onDeleteClick={handleDeleteClick} onEditClick={handleEditCredsClick} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                       لا يوجد موظفون مرتبطون بهذا المكتب.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
  }

  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          {role === 'مدير النظام' ? renderSystemAdminView() : renderOfficeManagerView()}
        </main>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف حساب <span className="font-bold text-destructive">{userToDelete?.name}</span>؟ هذا الإجراء سيقوم بحذف المستخدم نهائيًا ولا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className={buttonVariants({ variant: 'destructive' })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => {
          if(!open) {
            setAddUserForm(getInitialAddUserFormState());
          }
          setIsAddUserDialogOpen(open);
       }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddNewUser}>
            <DialogHeader>
              <DialogTitle>إضافة {addUserForm.role === 'موظف' ? 'موظف' : 'مساعد'} جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات المستخدم الجديد لإنشاء حساب له.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" value={addUserForm.name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={addUserForm.email} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <Input id="phone" type="tel" value={addUserForm.phone} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" value={addUserForm.password} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input id="confirmPassword" type="password" value={addUserForm.confirmPassword} onChange={handleInputChange} required />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  إلغاء
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingNewUser}>
                {isSubmittingNewUser && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                إنشاء الحساب
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditCredsDialogOpen} onOpenChange={(open) => {
          if (!open) {
              setUserToEdit(null);
          }
          setIsEditCredsDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveCredentials}>
            <DialogHeader>
              <DialogTitle>تعديل بيانات دخول {userToEdit?.name}</DialogTitle>
              <DialogDescription>
                قم بتحديث البريد الإلكتروني أو كلمة المرور. اترك حقل كلمة المرور فارغًا لإبقائها كما هي.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email-edit">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={editCredsForm.email}
                  onChange={handleCredsFormChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-edit">كلمة المرور الجديدة</Label>
                <Input
                  id="password"
                  type="password"
                  value={editCredsForm.password}
                  onChange={handleCredsFormChange}
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
              <Button type="submit" disabled={isCredsSubmitting}>
                {isCredsSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
