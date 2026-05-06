
export type Role = 'admin' | 'student' | 'visitor' | 'driver' | string;

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string; // WhatsApp number
  role: Role;
  grade?: number; // 1-11 for students
  section?: string; // A, B, Unique
  allergies?: string; // Free text for allergies
  emailVerified: boolean;
  verificationToken?: string;
  tokenExpiresAt?: number; // Timestamp (Date.now())
};

// New Dynamic Category Interface
export interface CategoryDef {
  id: string;
  name: string;
  order: number; // To determine the step sequence in OrderFlow
  exclusiveGroup?: string; // Optional: categories sharing the same group are mutually exclusive in the planner
}

// Rule that controls category availability in the student OrderFlow
export interface CategoryRule {
  id: string;
  triggerCategoryId: string; // When student selects from this category...
  effect: 'blocks' | 'requires'; // 'blocks': target locked when trigger selected; 'requires': target only shows if trigger selected
  targetCategoryId: string;  // ...this category is affected
}

// Interface for Dynamic Roles
export interface RoleDef {
  id: string; // The key used in code (e.g., 'teacher')
  name: string; // Display name (e.g., 'Profesor')
  description?: string;
  isSystem: boolean; // If true, cannot be deleted (admin, student, visitor)
}

export interface SystemNotification {
  id: string;
  date: string; // YYYY-MM-DD (The day it is relevant for)
  message: string;
  originalMessage?: string; // To keep track of what the admin typed before AI
  type: 'info' | 'alert' | 'success';
  targetRole: 'all' | 'student' | 'staff';
}

// Previously 'Category' was a union type, now it's just a string referencing CategoryDef.id
// We keep the type alias for compatibility in some places, but conceptually it's a string ID.
export type Category = string; 

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string; // References CategoryDef.id
  calories: number;
  imageUrl?: string; // URL for the recipe image
}

// Configuration for a specific menu day
export interface DailyMenuConfig {
  date: string; // ISO string YYYY-MM-DD
  items: {
    recipeId: string;
    isMandatory: boolean; // Admin rule: must select one of this type?
  }[];
  isPublished: boolean;
}

export interface OrderItem {
  category: string; // References CategoryDef.id
  recipeId: string;
}

export interface Order {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade: number;
  studentSection?: string;
  studentAllergies?: string;
  date: string; // YYYY-MM-DD
  items: OrderItem[];
  status: 'confirmed' | 'pending';
  timestamp: string;
}

export interface RecurringPreference {
  studentId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  items: { category: string; recipeId: string }[];
}

// --- SURVEY TYPES ---
export type SurveyType = 'suggestion' | 'complaint' | 'claim' | 'congratulation';

// 1. Definition of the Survey Period (Created by Admin)
export interface SurveyDefinition {
  id: string;
  title: string; // e.g., "Encuesta Primer Bimestre"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean; // Manual override
  createdAt: string;
}

// 2. The actual response from a user
export interface SurveyResult {
  id: string;
  surveyDefinitionId: string; // Links to the specific period
  userId: string;
  userName: string;
  userRole: string;
  userPhone?: string; // WhatsApp number, optional
  date: string; // ISO Timestamp of submission
  qualityRating: number; // 1-5
  quantityRating: number; // 1-5
  type: SurveyType;
  comment: string;
  adminResponse?: string;
  status: 'pending' | 'resolved';
}

export interface GlobalVariable {
  id: string;
  name: string;
  value: string;
  isSystem?: boolean; // Optional: if true, cannot be deleted, only edited
}

export type ReportType = 'overview' | 'kpi';

export interface GeneratedReport {
  id: string;
  type: ReportType; // e.g., 'overview', 'kpi'
  dateGenerated: string; // ISO string YYYY-MM-DDTHH:mm:ssZ
  title: string;
  content: string; // The markdown/text content of the report
  filtersUsed?: Record<string, unknown>; // JSON object of filters applied (e.g., date ranges)
}

export interface ImportedUserData {
  Nombre: string;
  Email: string;
  Rol: string;
  Grado?: number | string;
  Seccion?: string;
  Alergias?: string;
}

export interface KpiReportData {
  totalOrders: number;
  avgOrderItems: number;
  uniqueUsers: number;
  participationRate: number;
  operatingDays: number;
  topRecipe: { name: string; count: number } | null;
  bottomRecipe: { name: string; count: number } | null;
  orderTrend: { date: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
}

export interface UnconfirmedMenuReportItem {
  id: string; // Unique ID for the menu item (can be date or generated)
  date: string; // YYYY-MM-DD
  recipes: string[]; // List of recipe IDs for this menu
}

export interface ChatbotSource {
  id: string;
  title: string;
  confidence?: number;
}

export interface ChatbotResponse {
  answer: string;
  sources: ChatbotSource[];
  confidence: number;
  fallback: boolean;
  modelUsed: string;
}

export interface AuthStartResponse {
  success: boolean;
  challengeId: string;
  message: string;
  devOtp?: string;
}

export interface AuthVerifyOtpResponse {
  success: boolean;
  user: User;
}
