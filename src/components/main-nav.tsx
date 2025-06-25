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
} from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const menuItems = [
  {
    href: '/',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
  },
  {
    href: '/investors',
    label: 'المستثمرون',
    icon: Users,
  },
  {
    href: '/borrowers',
    label: 'المقترضون',
    icon: Landmark,
  },
  {
    href: '/calculator',
    label: 'حاسبة القروض',
    icon: Calculator,
  },
  {
    href: '/summarize',
    label: 'تلخيص بالذكاء الاصطناعي',
    icon: BrainCircuit,
  },
];

export function MainNav() {
  const pathname = usePathname();

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
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent">
          <Avatar>
            <AvatarImage src="https://placehold.co/40x40.png" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">
              مدير المنصة
            </span>
            <span className="text-xs text-muted-foreground">
              admin@example.com
            </span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
