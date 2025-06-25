'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Landmark,
  Calculator,
  BrainCircuit,
  PanelLeft,
  FileText
} from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useRole, UserRole } from '@/contexts/role-context';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const allMenuItems = [
  {
    href: '/',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف', 'مستثمر'],
  },
  {
    href: '/investors',
    label: 'المستثمرون',
    icon: Users,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
  {
    href: '/borrowers',
    label: 'المقترضون',
    icon: Landmark,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
   {
    href: '/reports',
    label: 'التقارير',
    icon: FileText,
    roles: ['مدير النظام', 'مدير المكتب'],
  },
  {
    href: '/calculator',
    label: 'حاسبة القروض',
    icon: Calculator,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
  {
    href: '/summarize',
    label: 'تحليل بالذكاء الاصطناعي',
    icon: BrainCircuit,
    roles: ['مدير النظام', 'مدير المكتب'],
  },
];

export function MainNav() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    <>
      <SidebarHeader className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <span className="font-semibold text-lg">تمويل</span>
        </Link>
        <div className="block md:hidden">
          <SidebarTrigger>
            <PanelLeft />
          </SidebarTrigger>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
       <SidebarSeparator />
      <SidebarFooter>
        <div className="flex flex-col gap-3 p-2">
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">محاكاة الدور</Label>
                 <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                    <SelectTrigger>
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
            <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent">
            <Avatar>
                <AvatarImage data-ai-hint="profile picture" src="https://placehold.co/40x40.png" alt="User" />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-sidebar-foreground">
                {role}
                </span>
                <span className="text-xs text-muted-foreground">
                admin@example.com
                </span>
            </div>
            </div>
        </div>
      </SidebarFooter>
    </>
  );
}
