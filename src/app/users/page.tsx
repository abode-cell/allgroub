'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Hourglass } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, UserRole } from '@/lib/types';

const statusVariant: { [key: string]: 'default' | 'secondary' } = {
  نشط: 'default',
  معلق: 'secondary',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { users, updateUserStatus, updateUserRole } = useData();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role !== 'مدير النظام') {
      router.replace('/');
    }
  }, [currentUser, router]);

  if (currentUser?.role !== 'مدير النظام') {
    return null;
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUserRole(userId, newRole);
  };

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              إدارة المستخدمين
            </h1>
            <p className="text-muted-foreground mt-1">
              تفعيل وتغيير أدوار المستخدمين المسجلين في النظام.
            </p>
          </header>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة المستخدمين</CardTitle>
            <CardDescription>
              عرض جميع المستخدمين وحالات حساباتهم. قم بتفعيل الحسابات المعلقة
              وتغيير الأدوار.
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
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) =>
                          handleRoleChange(user.id, newRole)
                        }
                        disabled={user.id === currentUser.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="اختر دورًا" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مدير النظام">مدير النظام</SelectItem>
                          <SelectItem value="مدير المكتب">مدير المكتب</SelectItem>
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
                      {user.status === 'معلق' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserStatus(user.id, 'نشط')}
                        >
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
