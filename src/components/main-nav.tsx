
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
  KeyRound,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole, PermissionKey } from '@/lib/types';

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  permission?: PermissionKey;
};

export const allMenuItems: MenuItem[] = [
  {
    href: '/',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    roles: ['مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر'],
  },
  {
    href: '/investors',
    label: 'المستثمرون',
    icon: PiggyBank,
    roles: ['مدير المكتب', 'مساعد مدير المكتب', 'موظف'],
    permission: 'manageInvestors',
  },
  {
    href: '/borrowers',
    label: 'القروض',
    icon: Landmark,
    roles: ['مدير المكتب', 'مساعد مدير المكتب', 'موظف'],
    permission: 'manageBorrowers',
  },
  {
    href: '/import',
    label: 'استيراد',
    icon: FileUp,
    roles: ['مدير المكتب', 'مساعد مدير المكتب'],
    permission: 'importData',
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
    roles: ['مدير المكتب', 'مساعد مدير المكتب'],
    permission: 'viewReports',
  },
  {
    href: '/requests',
    label: 'الطلبات',
    icon: ClipboardList,
    roles: ['مدير المكتب', 'مساعد مدير المكتب'],
    permission: 'manageRequests',
  },
  {
    href: '/notifications',
    label: 'التنبيهات',
    icon: Bell,
    roles: ['مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر'],
  },
  {
    href: '/calculator',
    label: 'الحاسبة',
    icon: Calculator,
    roles: ['مدير المكتب', 'مساعد مدير المكتب', 'موظف'],
    permission: 'useCalculator',
  },
  {
    href: '/ai-support',
    label: 'مساعد الدعم الفني',
    icon: Sparkles,
    roles: ['مدير النظام'],
  },
  {
    href: '/support',
    label: 'الدعم',
    icon: LifeBuoy,
    roles: ['مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر'],
  },
  {
    href: '/settings',
    label: 'الإعدادات',
    icon: Settings,
    roles: ['مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب'],
    permission: 'accessSettings',
  },
];
