'use client';

import { useData } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  UserX,
  Briefcase,
  Building2,
  PiggyBank,
  Save,
  UserCog,
  Settings,
  ShieldCheck,
  Users2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, UserRole, PermissionKey } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  { key: 'manageRequests', label: 'إدارة الطلبات', description: 'السماح بمراجعة طلبات الموظفين والموافقة عليها أو رفضها.' },
  { key: 'useCalculator', label: 'استخدام الحاسبة', description: 'السماح باستخدام حاسبة القروض والأرباح.' },
  { key: 'accessSettings', label: 'الوصول للإعدادات', description: 'السماح بالوصول إلى صفحة الإعدادات الإدارية.' },
  { key: 'manageEmployeePermissions', label: 'إدارة صلاحيات الموظفين', description: 'تمكين المساعد من تفعيل أو تعطيل صلاحيات الموظفين.' },
];

// A reusable component for user actions to avoid repetition
const UserActions = ({
  user,
  onDeleteClick,
}: {
  user: User;
  onDeleteClick: (user: User) => void;
}) => {
  const { currentUser } = useData();
  const { updateUserStatus } = useData();

  if (user.id === currentUser?.id) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">فتح القائمة</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.status === 'معلق' && (
          <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'نشط')}>
            <CheckCircle className="ml-2 h-4 w-4" />
            <span>تفعيل الحساب</span>
          </DropdownMenuItem>
        )}
        {user.status === 'نشط' && (
          <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'معلق')}>
            <UserX className="ml-2 h-4 w-4" />
            <span>تعليق الحساب</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => onDeleteClick(user)}
        >
          <Trash2 className="ml-2 h-4 w-4" />
          <span>حذف الحساب</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function UsersPage() {
  const { currentUser, users, investors, updateUserRole, deleteUser, updateUserLimits, updateManagerSettings, updateAssistantPermission } =
    useData();
  const router = useRouter();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editableLimits, setEditableLimits] = useState<
    Record<string, { investorLimit: string; employeeLimit: string }>
  >({});
  
  const role = currentUser?.role;
  const canViewPage = role === 'مدير النظام' || role === 'مدير المكتب' || role === 'مساعد مدير المكتب';

  useEffect(() => {
    if (currentUser && !canViewPage) {
      router.replace('/');
    }
  }, [currentUser, canViewPage, router]);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUserRole(userId, newRole);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
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
      // only run on open
      const manager = officeManagers.find((m) => m.id === value);
      if (manager && !editableLimits[manager.id]) {
        setEditableLimits((prev) => ({
          ...prev,
          [manager.id]: {
            investorLimit: String(manager.investorLimit ?? 10),
            employeeLimit: String(manager.employeeLimit ?? 5),
          },
        }));
      }
    }
  };

  const handleLimitsChange = (
    managerId: string,
    field: 'investorLimit' | 'employeeLimit',
    value: string
  ) => {
    setEditableLimits((prev) => ({
      ...prev,
      [managerId]: {
        ...(prev[managerId] || { investorLimit: '0', employeeLimit: '0' }),
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
      });
    }
  };

  // Data for System Admin
  const officeManagers = users.filter((u) => u.role === 'مدير المكتب');
  const otherUsers = users.filter(
    (u) => u.role !== 'مدير المكتب' && u.role !== 'موظف' && u.role !== 'مساعد مدير المكتب'
  );

  // Data for Office Manager/Assistant
  const myEmployees = users.filter((u) => u.managedBy === (role === 'مدير المكتب' ? currentUser?.id : currentUser?.managedBy) && u.role === 'موظف');
  const myAssistants = users.filter((u) => u.managedBy === currentUser?.id && u.role === 'مساعد مدير المكتب');


  if (!canViewPage) {
    return null; // or a loading spinner
  }

  const renderSystemAdminView = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            مدراء المكاتب
          </CardTitle>
          <CardDescription>
            اضغط على اسم المدير لعرض الموظفين والمساعدين والمستثمرين المرتبطين به.
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
                  (i) => i.submittedBy === manager.id
                );

                return (
                  <AccordionItem value={manager.id} key={manager.id}>
                    <AccordionPrimitive.Header className="flex">
                      <div className="flex flex-1 items-center justify-between hover:bg-muted/50 px-4 rounded-t-md">
                        <AccordionTrigger className="flex-1 text-right p-0 hover:no-underline justify-start">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 py-4">
                            <div className="font-bold text-base">
                              {manager.name}
                            </div>
                            <div className="text-xs text-muted-foreground sm:text-sm">
                              {manager.email}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-4">
                          <Badge variant={statusVariant[manager.status]}>
                            {manager.status === 'نشط' ? (
                              <CheckCircle className="w-3 h-3 ml-1" />
                            ) : (
                              <Hourglass className="w-3 h-3 ml-1" />
                            )}
                            {manager.status}
                          </Badge>
                          <div className="hidden sm:block">
                            <UserActions
                              user={manager}
                              onDeleteClick={handleDeleteClick}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionPrimitive.Header>
                    <AccordionContent className="bg-muted/30 p-4 border-l-4 border-primary">
                      <div className="flex justify-between items-center mb-4">
                        <div className="space-y-1">
                          <h4 className="font-semibold">تفاصيل المدير</h4>
                          <p className="text-xs text-muted-foreground">
                            تاريخ التسجيل:{' '}
                            {manager.registrationDate || 'غير محدد'}
                          </p>
                        </div>
                        <div className="sm:hidden">
                          <UserActions
                            user={manager}
                            onDeleteClick={handleDeleteClick}
                          />
                        </div>
                      </div>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div>
                          <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />{' '}
                            الموظفون ({employees.length})
                          </h5>
                          {employees.length > 0 ? (
                            <div className="rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>الحالة</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {employees.map((emp) => (
                                    <TableRow key={emp.id}>
                                      <TableCell>{emp.name}</TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={statusVariant[emp.status]}
                                        >
                                          {emp.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-xs text-center text-muted-foreground bg-background py-4 rounded-md border">
                              لا يوجد موظفون مرتبطون.
                            </p>
                          )}
                        </div>
                        <div>
                          <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Users2 className="h-4 w-4 text-muted-foreground" />{' '}
                            المساعدون ({assistants.length})
                          </h5>
                          {assistants.length > 0 ? (
                             <div className="rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>الحالة</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assistants.map((ass) => (
                                    <TableRow key={ass.id}>
                                      <TableCell>{ass.name}</TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={statusVariant[ass.status]}
                                        >
                                          {ass.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-xs text-center text-muted-foreground bg-background py-4 rounded-md border">
                               لا يوجد مساعدون مرتبطون.
                            </p>
                          )}
                        </div>
                        <div>
                          <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <PiggyBank className="h-4 w-4 text-muted-foreground" />{' '}
                            المستثمرون ({managerInvestors.length})
                          </h5>
                          {managerInvestors.length > 0 ? (
                            <div className="rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>المبلغ</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {managerInvestors.map((inv) => (
                                    <TableRow key={inv.id}>
                                      <TableCell>{inv.name}</TableCell>
                                      <TableCell>
                                        {formatCurrency(inv.amount)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-xs text-center text-muted-foreground bg-background py-4 rounded-md border">
                              لا يوجد مستثمرون مرتبطون.
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t space-y-4">
                        <h5 className="font-semibold flex items-center gap-2 text-sm">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          إعدادات المدير
                        </h5>
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                            <div className="space-y-0.5">
                                <Label htmlFor={`allow-submissions-${manager.id}`} className="font-semibold">السماح لموظفيه بالإضافة</Label>
                                <p className="text-xs text-muted-foreground">تمكين/تعطيل قدرة الموظفين على رفع طلبات جديدة.</p>
                            </div>
                            <Switch
                                id={`allow-submissions-${manager.id}`}
                                checked={manager.allowEmployeeSubmissions ?? false}
                                onCheckedChange={(checked) =>
                                    updateManagerSettings(manager.id, { allowEmployeeSubmissions: checked })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                            <div className="space-y-0.5">
                                <Label htmlFor={`hide-funds-${manager.id}`} className="font-semibold">إخفاء أرصدة المستثمرين</Label>
                                <p className="text-xs text-muted-foreground">يمنع موظفي هذا المدير من رؤية أموال المستثمرين.</p>
                            </div>
                            <Switch
                                id={`hide-funds-${manager.id}`}
                                checked={manager.hideEmployeeInvestorFunds ?? false}
                                onCheckedChange={(checked) =>
                                    updateManagerSettings(manager.id, { hideEmployeeInvestorFunds: checked })
                                }
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3 items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`investor-limit-${manager.id}`}>
                              حد المستثمرين
                            </Label>
                            <Input
                              id={`investor-limit-${manager.id}`}
                              type="number"
                              value={
                                editableLimits[manager.id]?.investorLimit ?? ''
                              }
                              onChange={(e) =>
                                handleLimitsChange(
                                  manager.id,
                                  'investorLimit',
                                  e.target.value
                                )
                              }
                              placeholder={String(manager.investorLimit ?? 10)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`employee-limit-${manager.id}`}>
                              حد الموظفين
                            </Label>
                            <Input
                              id={`employee-limit-${manager.id}`}
                              type="number"
                              value={
                                editableLimits[manager.id]?.employeeLimit ?? ''
                              }
                              onChange={(e) =>
                                handleLimitsChange(
                                  manager.id,
                                  'employeeLimit',
                                  e.target.value
                                )
                              }
                              placeholder={String(manager.employeeLimit ?? 5)}
                            />
                          </div>
                          <Button onClick={() => handleSaveLimits(manager.id)}>
                            <Save className="ml-2 h-4 w-4" />
                            حفظ الحدود
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              لا يوجد مدراء مكاتب حاليًا.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مستخدمون آخرون</CardTitle>
          <CardDescription>
            قائمة بالمستخدمين الآخرين مثل مدير النظام والمستثمرين.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(newRole: UserRole) =>
                        handleRoleChange(user.id, newRole)
                      }
                      disabled={user.id === currentUser?.id}
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
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[user.status]}>
                      {user.status === 'نشط' ? (
                        <CheckCircle className="w-3 h-3 ml-1" />
                      ) : (
                        <Hourglass className="w-3 h-3 ml-1" />
                      )}
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <UserActions
                      user={user}
                      onDeleteClick={handleDeleteClick}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );

  const renderOfficeManagerView = () => {
    const canManageAssistants = role === 'مدير المكتب';
    const canManageEmployees = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageEmployeePermissions);
    
    // Logic to find the correct manager for settings
    const managerIdForSettings = role === 'مدير المكتب' ? currentUser?.id : currentUser?.managedBy;
    const managerForSettings = users.find(u => u.id === managerIdForSettings);

    return (
    <div className='space-y-8'>
      {canManageAssistants && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users2 className="h-6 w-6 text-primary" />
              إدارة المساعدين
            </CardTitle>
            <CardDescription>
              عرض وإدارة صلاحيات مساعدي مدير المكتب التابعين لك.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myAssistants.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {myAssistants.map((assistant) => (
                  <AccordionItem value={assistant.id} key={assistant.id}>
                      <AccordionTrigger>
                          <div className='flex justify-between w-full pr-4'>
                            {assistant.name}
                            <Badge variant={statusVariant[assistant.status]}>
                                  {assistant.status}
                            </Badge>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <h4 className="font-semibold flex items-center gap-2">
                                  <ShieldCheck className="h-5 w-5 text-primary" />
                                  صلاحيات المساعد
                              </h4>
                              {assistantPermissionsConfig.map((perm) => (
                                  <div key={perm.key} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                                      <div className="space-y-0.5">
                                          <Label htmlFor={`${perm.key}-${assistant.id}`} className="font-medium">{perm.label}</Label>
                                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                                      </div>
                                      <Switch
                                          id={`${perm.key}-${assistant.id}`}
                                          checked={assistant.permissions?.[perm.key] ?? false}
                                          onCheckedChange={(checked) => updateAssistantPermission(assistant.id, perm.key, checked)}
                                      />
                                  </div>
                              ))}
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                  لا يوجد مساعدون مرتبطون بحسابك.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canManageEmployees && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
                <UserCog className="h-6 w-6 text-primary" />
                إدارة الموظفين
            </CardTitle>
            <CardDescription>
              عرض وإدارة الموظفين المرتبطين بالمكتب.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                الصلاحيات العامة للموظفين
              </h3>
              <div className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-submissions" className="font-medium">السماح لموظفيك بالإضافة</Label>
                  <p className="text-xs text-muted-foreground">
                    تمكين/تعطيل قدرة الموظفين التابعين لك على رفع طلبات قروض ومستثمرين جدد.
                  </p>
                </div>
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
              <div className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="hide-investor-funds" className="font-medium">إخفاء أرصدة المستثمرين عن الموظفين</Label>
                    <p className="text-xs text-muted-foreground">
                        في حال تفعيله، لن يتمكن الموظفون من رؤية المبالغ المتاحة للمستثمرين.
                    </p>
                </div>
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراء</TableHead>
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
                      <TableCell>
                        <Badge variant={statusVariant[employee.status]}>
                          {employee.status === 'نشط' ? (
                            <CheckCircle className="w-3 h-3 ml-1" />
                          ) : (
                            <Hourglass className="w-3 h-3 ml-1" />
                          )}
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <UserActions
                          user={employee}
                          onDeleteClick={handleDeleteClick}
                        />
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
    </div>
  );
  }

  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              إدارة المستخدمين
            </h1>
            <p className="text-muted-foreground mt-1">
              {role === 'مدير النظام'
                ? 'عرض وإدارة مدراء المكاتب والمستخدمين الآخرين في النظام.'
                : 'عرض وإدارة المساعدين والموظفين المرتبطين بحسابك وصلاحياتهم.'}
            </p>
          </header>

          {role === 'مدير النظام' && renderSystemAdminView()}
          {(role === 'مدير المكتب' || role === 'مساعد مدير المكتب') && renderOfficeManagerView()}
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
              هل أنت متأكد أنك تريد حذف حساب {userToDelete?.name}؟ هذا الإجراء
              سيقوم بحذف المستخدم نهائيًا ولا يمكن التراجع عنه.
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
    </>
  );
}
