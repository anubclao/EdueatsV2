export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'kitchen';
  emailVerified: boolean;
  grade?: number;
  section?: string;
  allergies?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type Role = 'admin' | 'student' | 'kitchen';

export type CategoryDef = {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  category: string;
  ingredients: string[];
  allergens?: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DailyMenuItem = {
  recipeId: string;
  isMandatory: boolean;
};

export type DailyMenuConfig = {
  date: string;
  isPublished: boolean;
  items: DailyMenuItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  category: string;
  recipeId: string;
};

export type Order = {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade: number;
  studentSection: string;
  studentAllergies?: string[];
  date: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RecurringPreferenceItem = {
  category: string;
  recipeId: string;
};

export type RecurringPreference = {
  studentId: string;
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
  items: RecurringPreferenceItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type SurveyQuestion = {
  id: string;
  type: 'text' | 'rating' | 'choice';
  question: string;
  options?: string[]; // For 'choice' type
};

export type SurveyDefinition = {
  id: string;
  name: string;
  description?: string;
  questions: SurveyQuestion[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SurveyResultItem = {
  questionId: string;
  answer: string | number;
};

export type SurveyResult = {
  id: string;
  surveyId: string;
  studentId: string;
  results: SurveyResultItem[];
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GlobalVariable = {
  id: string;
  name: string;
  value: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemNotification = {
  id: string;
  title: string;
  message: string;
  date: string;
  targetRoles: Role[];
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type KpiReportData = {
  date: string;
  totalOrders: number;
  vegetarianOrders: number;
  veganOrders: number;
  glutenFreeOrders: number;
  averageRating: number;
  // Add more KPI fields as needed
};

export type UnconfirmedMenuReportItem = {
  date: string;
  unconfirmedOrders: number;
  // Add more fields as needed
};

export type GeneratedReport = {
  id: string;
  type: 'kpi' | 'unconfirmed_menu';
  dateGenerated: string;
  reportData: KpiReportData | UnconfirmedMenuReportItem[];
  createdAt?: string;
  updatedAt?: string;
};
