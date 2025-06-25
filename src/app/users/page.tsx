'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, CheckCircle, Hourglass } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, UserRole } from '@/lib/types';


const statusVariant: { [key: string]: 'default' | 'secondary' } = {
  نشط: 'default',
  معلق: 'secondary',
};

export default function UsersPage() {
  const { role } = useAuth();
  const { users, addUser, updateUserStatus } = useData();
  const router = useRouter();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'موظف' as UserRole });

  useEffect(() => {
    if (role !== 'مدير النظام') {
      router.replace('/');
    }
  }, [role, router]);

  if (role !== 'مدير النظام') {
    return null;
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewUser((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (value: UserRole) => {
    setNewUser((prev) => ({ ...prev, role: value }));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      return;
    }
    addUser(newUser);
    setIsAddUserDialogOpen(false);
    setNewUser({ name: '', email: '', role: 'موظف' });
  };


  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">
              إضافة وتفعيل حسابات المستخدمين في النظام.
            </p>
          </header>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة مستخدم جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddUser}>
                <DialogHeader>
                  <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                  <DialogDescription>
                    سيتم إنشاء الحساب بحالة "معلق" ويتطلب تفعيلًا.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      الاسم
                    </Label>
                    <Input id="name" value={newUser.name} onChange={handleInputChange} required className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      البريد الإلكتروني
                    </Label>
                    <Input id="email" type="email" value={newUser.email} onChange={handleInputChange} required className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      الدور
                    </Label>
                    <Select value={newUser.role} onValueChange={handleRoleChange}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="اختر دورًا" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="مدير النظام">مدير النظام</SelectItem>
                        <SelectItem value="مدير المكتب">مدير المكتب</SelectItem>
                        <SelectItem value="موظف">موظف</SelectItem>
                        <SelectItem value="مستثمر">مستثمر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                  <Button type="submit">إضافة</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة المستخدمين</CardTitle>
            <CardDescription>
              عرض جميع المستخدمين وحالات حساباتهم.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[user.status]}>
                         {user.status === 'نشط' ? <CheckCircle className='w-3 h-3 ml-1' /> : <Hourglass className='w-3 h-3 ml-1' />}
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'معلق' && (
                        <Button variant="outline" size="sm" onClick={() => updateUserStatus(user.id, 'نشط')}>
                          <CheckCircle className="ml-2 h-4 w-4" />
                          تفعيل الحساب
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
