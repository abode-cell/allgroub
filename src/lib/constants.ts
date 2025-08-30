// Application constants
export const APP_CONFIG = {
  NAME: 'منصة عال',
  DESCRIPTION: 'منصة متكاملة لإدارة التمويل والاستثمارات والقروض',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'qzmpty678@gmail.com',
  SUPPORT_PHONE: '0598360380',
} as const;

// User roles and permissions
export const USER_ROLES = {
  SYSTEM_ADMIN: 'مدير النظام',
  OFFICE_MANAGER: 'مدير المكتب',
  ASSISTANT_MANAGER: 'مساعد مدير المكتب',
  EMPLOYEE: 'موظف',
  INVESTOR: 'مستثمر',
} as const;

export const USER_STATUS = {
  ACTIVE: 'نشط',
  PENDING: 'معلق',
  REJECTED: 'مرفوض',
  DELETED: 'محذوف',
} as const;

// Loan types and statuses
export const LOAN_TYPES = {
  INSTALLMENT: 'اقساط',
  GRACE_PERIOD: 'مهلة',
} as const;

export const BORROWER_STATUS = {
  REGULAR: 'منتظم',
  LATE: 'متأخر',
  FULLY_PAID: 'مسدد بالكامل',
  DEFAULTED: 'متعثر',
  PENDING: 'معلق',
  REJECTED: 'مرفوض',
} as const;

export const PAYMENT_STATUS = {
  REGULAR: 'منتظم',
  LATE_ONE: 'متأخر بقسط',
  LATE_TWO: 'متأخر بقسطين',
  DEFAULTED: 'متعثر',
  LEGAL_ACTION: 'تم اتخاذ الاجراءات القانونيه',
  PARTIAL_PAID: 'مسدد جزئي',
  GRACE_GIVEN: 'تم الإمهال',
  FULLY_PAID: 'تم السداد',
} as const;

// Transaction types
export const TRANSACTION_TYPES = {
  CAPITAL_DEPOSIT: 'إيداع رأس المال',
  CAPITAL_WITHDRAWAL: 'سحب من رأس المال',
} as const;

export const WITHDRAWAL_METHODS = {
  CASH: 'نقدي',
  BANK: 'بنكي',
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  BASE_INTEREST_RATE: 15,
  INVESTOR_SHARE_PERCENTAGE: 70,
  SALARY_REPAYMENT_PERCENTAGE: 65,
  GRACE_TOTAL_PROFIT_PERCENTAGE: 25,
  GRACE_INVESTOR_SHARE_PERCENTAGE: 33.3,
  DEFAULT_TRIAL_PERIOD_DAYS: 14,
  INVESTOR_LIMIT: 50,
  EMPLOYEE_LIMIT: 5,
  ASSISTANT_LIMIT: 2,
  BRANCH_LIMIT: 3,
} as const;

// UI Constants
export const ITEMS_PER_PAGE = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'yyyy/MM/dd',
  INPUT: 'yyyy-MM-dd',
  FULL: 'PPpp',
} as const;

// Currency settings
export const CURRENCY_CONFIG = {
  LOCALE: 'ar-SA',
  CURRENCY: 'SAR',
  MINIMUM_FRACTION_DIGITS: 2,
  MAXIMUM_FRACTION_DIGITS: 2,
} as const;

// Validation rules
export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MIN_NAME_LENGTH: 2,
  MIN_NATIONAL_ID_LENGTH: 10,
  MIN_PHONE_LENGTH: 10,
  MAX_LOAN_AMOUNT: 10000000, // 10 million SAR
  MIN_LOAN_AMOUNT: 1000, // 1000 SAR
  MAX_INTEREST_RATE: 50, // 50%
  MIN_INTEREST_RATE: 0.1, // 0.1%
  MAX_LOAN_TERM: 30, // 30 years
  MIN_LOAN_TERM: 0.5, // 6 months
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'خطأ في الاتصال بالشبكة',
  PERMISSION_DENIED: 'ليس لديك صلاحية للقيام بهذا الإجراء',
  DATA_NOT_FOUND: 'البيانات المطلوبة غير موجودة',
  INVALID_INPUT: 'البيانات المدخلة غير صالحة',
  SERVER_ERROR: 'خطأ في الخادم',
  AUTHENTICATION_FAILED: 'فشل في المصادقة',
  SESSION_EXPIRED: 'انتهت صلاحية الجلسة',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'تم إنشاء المستخدم بنجاح',
  USER_UPDATED: 'تم تحديث المستخدم بنجاح',
  USER_DELETED: 'تم حذف المستخدم بنجاح',
  BORROWER_CREATED: 'تم إضافة القرض بنجاح',
  BORROWER_UPDATED: 'تم تحديث القرض بنجاح',
  INVESTOR_CREATED: 'تم إضافة المستثمر بنجاح',
  INVESTOR_UPDATED: 'تم تحديث المستثمر بنجاح',
  TRANSACTION_CREATED: 'تم إضافة العملية المالية بنجاح',
  CONFIG_UPDATED: 'تم تحديث الإعدادات بنجاح',
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
} as const;