import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  phone: z.string().optional(),
  role: z.enum(['مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر']),
});

export const passwordSchema = z.object({
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد على الأقل')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل')
    .regex(/[\W_]/, 'يجب أن تحتوي على رمز خاص واحد على الأقل'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

// Borrower validation schemas
export const borrowerSchema = z.object({
  name: z.string().min(2, 'اسم المقترض يجب أن يكون حرفين على الأقل'),
  nationalId: z.string().min(10, 'رقم الهوية يجب أن يكون 10 أرقام على الأقل'),
  phone: z.string().min(10, 'رقم الجوال يجب أن يكون 10 أرقام على الأقل'),
  amount: z.number().positive('مبلغ القرض يجب أن يكون أكبر من صفر'),
  loanType: z.enum(['اقساط', 'مهلة']),
  dueDate: z.string().min(1, 'تاريخ الاستحقاق مطلوب'),
});

export const installmentLoanSchema = borrowerSchema.extend({
  rate: z.number().positive('نسبة الفائدة يجب أن تكون أكبر من صفر'),
  term: z.number().positive('مدة القرض يجب أن تكون أكبر من صفر'),
});

export const graceLoanSchema = borrowerSchema.extend({
  discount: z.number().min(0, 'الخصم لا يمكن أن يكون سالباً').optional(),
});

// Investor validation schemas
export const investorSchema = z.object({
  name: z.string().min(2, 'اسم المستثمر يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  phone: z.string().min(10, 'رقم الجوال يجب أن يكون 10 أرقام على الأقل'),
  installmentCapital: z.number().min(0, 'رأس مال الأقساط لا يمكن أن يكون سالباً'),
  graceCapital: z.number().min(0, 'رأس مال المهلة لا يمكن أن يكون سالباً'),
  installmentProfitShare: z.number().min(0).max(100, 'نسبة الربح يجب أن تكون بين 0 و 100'),
  gracePeriodProfitShare: z.number().min(0).max(100, 'نسبة الربح يجب أن تكون بين 0 و 100'),
}).refine(data => data.installmentCapital > 0 || data.graceCapital > 0, {
  message: 'يجب إدخال رأس مال واحد على الأقل',
  path: ['installmentCapital'],
});

// Transaction validation schemas
export const transactionSchema = z.object({
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().min(1, 'وصف العملية مطلوب'),
  type: z.enum(['إيداع رأس المال', 'سحب من رأس المال']),
  capitalSource: z.enum(['installment', 'grace']),
  withdrawalMethod: z.enum(['نقدي', 'بنكي']).optional(),
});

// Support ticket validation
export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'الموضوع يجب أن يكون 5 أحرف على الأقل'),
  message: z.string().min(10, 'الرسالة يجب أن تكون 10 أحرف على الأقل'),
});

// Validation helper functions
export const validateBorrower = (data: any, loanType: 'اقساط' | 'مهلة') => {
  const baseSchema = borrowerSchema;
  
  if (loanType === 'اقساط') {
    return installmentLoanSchema.safeParse(data);
  } else {
    return graceLoanSchema.safeParse(data);
  }
};

export const validateInvestor = (data: any) => {
  return investorSchema.safeParse(data);
};

export const validateTransaction = (data: any) => {
  return transactionSchema.safeParse(data);
};

export const validateSupportTicket = (data: any) => {
  return supportTicketSchema.safeParse(data);
};

export const validatePassword = (data: any) => {
  return passwordSchema.safeParse(data);
};