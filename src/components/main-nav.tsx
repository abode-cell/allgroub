import {
  LayoutDashboard,
  Landmark,
  Calculator,
  FileText,
  Settings,
  ClipboardList,
  ClipboardCheck,
  Bell,
  UserCog,
  LifeBuoy,
  PiggyBank,
  FileUp,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const allMenuItems: MenuItem[] = [
  {
    href: '/',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف', 'مستثمر'],
  },
  {
    href: '/investors',
    label: 'المستثمرون',
    icon: PiggyBank,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
  {
    href: '/borrowers',
    label: 'القروض',
    icon: Landmark,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
  {
    href: '/import',
    label: 'استيراد',
    icon: FileUp,
    roles: ['مدير النظام', 'مدير المكتب'],
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
    label: 'الحاسبة',
    icon: Calculator,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف'],
  },
  {
    href: '/support',
    label: 'الدعم',
    icon: LifeBuoy,
    roles: ['مدير النظام', 'مدير المكتب', 'موظف', 'مستثمر'],
  },
  {
    href: '/settings',
    label: 'الإعدادات',
    icon: Settings,
    roles: ['مدير النظام', 'مدير المكتب'],
  },
];
