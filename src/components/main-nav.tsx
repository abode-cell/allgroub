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
  FileText,
  Settings,
  ClipboardList,
  ClipboardCheck,
  Bell,
} from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarContent,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/auth-context';

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
    roles: ['مدير النظام', 'مدير المكتب'],
  },
  {
    href: '/borrowers',
    label: 'المقترضون',
    icon: Landmark,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
   {
    href: '/my-requests',
    label: 'طلباتي',
    icon: ClipboardCheck,
    roles: ['موظف'],
  },
  {
    href: '/reports',
    label: 'التقارير',
    icon: FileText,
    roles: ['مدير النظام', 'مدير المكتب'],
  },
  {
    href: '/requests',
    label: 'الطلبات',
    icon: ClipboardList,
    roles: ['مدير النظام', 'مدير المكتب'],
  },
  {
    href: '/notifications',
    label: 'التنبيهات',
    icon: Bell,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف', 'مستثمر'],
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
  {
    href: '/settings',
    label: 'الإعدادات',
    icon: Settings,
    roles: ['مدير النظام', 'مدير المكتب'],
  },
];

export function MainNav() {
  const pathname = usePathname();
  const { role } = useAuth();

  const menuItems = allMenuItems.filter((item) => item.roles.includes(role));

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
                isActive={
                  item.href === '/'
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                }
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
    </>
  );
}
