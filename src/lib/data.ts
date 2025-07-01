import type { Borrower, Investor, User, SupportTicket, Notification } from '@/lib/types';

export const usersData: User[] = [
  { id: '1', name: 'مدير النظام', email: 'admin@example.com', role: 'مدير النظام', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000001', registrationDate: '2023-01-10T10:00:00.000Z', allowEmployeeSubmissions: true, permissions: {}, defaultTrialPeriodDays: 14 },
];

export const investorsData: Investor[] = [];

export const borrowersData: Borrower[] = [];

export const notificationsData: Notification[] = [];

export const supportTicketsData: SupportTicket[] = [];
