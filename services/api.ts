import type {
  User, Recipe, CategoryDef, RoleDef, DailyMenuConfig, Order,
  RecurringPreference, SystemNotification, SurveyDefinition, SurveyResult,
  GlobalVariable, GeneratedReport
} from '../types';

// En desarrollo: vacío (el proxy Vite redirige /api → localhost:3001)
// En producción (Hostinger): define VITE_API_BASE=https://tu-dominio.com en las variables de entorno
const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const get  = <T>(path: string)                => req<T>(path);
const post = <T>(path: string, body: unknown) => req<T>(path, { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const put  = <T>(path: string, body: unknown) => req<T>(path, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const del  = <T>(path: string)                => req<T>(path, { method: 'DELETE' });

export const db = {
  // Global Variables
  getGlobalVariables: ()                        => get<GlobalVariable[]>('/variables'),
  addGlobalVariable:  (v: GlobalVariable)       => post<{ success: boolean; message?: string }>('/variables', v),
  updateGlobalVariable: (v: GlobalVariable)     => put<{ success: boolean }>(`/variables/${v.id}`, v),
  deleteGlobalVariable: (id: string)            => del<{ success: boolean; message?: string }>(`/variables/${id}`),

  // Generated Reports
  getGeneratedReports:   ()                          => get<GeneratedReport[]>('/reports'),
  saveGeneratedReport:   (r: GeneratedReport)        => post<void>('/reports', r),
  deleteGeneratedReport: (id: string)                => del<void>(`/reports/${id}`),

  // Roles
  getRoles:   ()                  => get<RoleDef[]>('/roles'),
  addRole:    (r: RoleDef)        => post<{ success: boolean }>('/roles', r).then(res => res.success),
  updateRole: (r: RoleDef)        => put<void>(`/roles/${r.id}`, r),
  deleteRole: (id: string)        => del<{ success: boolean }>(`/roles/${id}`).then(res => res.success),

  // Categories
  getCategories:    ()                    => get<CategoryDef[]>('/categories'),
  addCategory:      (c: CategoryDef)      => post<void>('/categories', c),
  updateCategory:   (c: CategoryDef)      => put<void>(`/categories/${c.id}`, c),
  deleteCategory:   (id: string)          => del<void>(`/categories/${id}`),

  // Recipes
  getRecipes:   ()               => get<Recipe[]>('/recipes'),
  addRecipe:    (r: Recipe)      => post<void>('/recipes', r),
  updateRecipe: (r: Recipe)      => put<void>(`/recipes/${r.id}`, r),
  deleteRecipe: (id: string)     => del<void>(`/recipes/${id}`),

  // Menus
  getAllMenus:   ()                       => get<DailyMenuConfig[]>('/menus'),
  getDailyMenu: (date: string)           => get<DailyMenuConfig | null>(`/menus/${date}`),
  saveDailyMenu: (m: DailyMenuConfig)    => post<void>('/menus', m),
  deleteMenu:   (date: string)           => del<void>(`/menus/${date}`),

  // Orders
  getOrders:          ()               => get<Order[]>('/orders'),
  getOrderCountByDate:(date: string)   => get<{ count: number }>(`/orders/count-by-date/${date}`),
  submitOrder:        (o: Order)       => post<void>('/orders', o),
  submitBatchOrders:  (orders: Order[]) => post<void>('/orders/batch', orders),

  // Users
  getUsers: () => get<User[]>('/users'),
  registerUser: (u: User) => post<{ success: boolean; token: string }>('/users/register', u),
  updateUser:   (u: User) => put<{ success: boolean; message?: string }>(`/users/${u.id}`, u),
  deleteUser:   (id: string) => del<void>(`/users/${id}`),
  findUserByEmail: (email: string) =>
    get<User | null>(`/users/email/${encodeURIComponent(email)}`),
  verifyUser: (token: string) =>
    post<{ status: 'success' | 'invalid' | 'expired' }>('/users/verify', { token }),
  resendVerificationToken: (email: string) =>
    post<{ success: boolean; token?: string; name?: string }>('/users/resend-verification', { email }),

  // Preferences
  getPreferences:   (studentId: string)                      => get<RecurringPreference[]>(`/preferences/${studentId}`),
  savePreference:   (p: RecurringPreference)                 => post<void>('/preferences', p),
  deletePreference: (studentId: string, dayOfWeek: number)   => del<void>(`/preferences/${studentId}/${dayOfWeek}`),

  // Notifications
  getNotifications:   ()                           => get<SystemNotification[]>('/notifications'),
  addNotification:    (n: SystemNotification)      => post<void>('/notifications', n),
  deleteNotification: (id: string)                 => del<void>(`/notifications/${id}`),

  // Surveys
  getSurveyDefinitions:    ()                         => get<SurveyDefinition[]>('/surveys/definitions'),
  createSurveyDefinition:  (d: SurveyDefinition)      => post<void>('/surveys/definitions', d),
  updateSurveyDefinition:  (d: SurveyDefinition)      => put<void>(`/surveys/definitions/${d.id}`, d),
  deleteSurveyDefinition:  (id: string)               => del<void>(`/surveys/definitions/${id}`),
  getSurveys: (surveyDefId?: string) =>
    get<SurveyResult[]>(`/surveys/results${surveyDefId ? `?surveyDefId=${surveyDefId}` : ''}`),
  saveSurvey:   (s: SurveyResult) => post<{ success: boolean; message?: string }>('/surveys/results', s),
  updateSurvey: (s: SurveyResult) => put<void>(`/surveys/results/${s.id}`, s),
  hasUserResponded: (userId: string, surveyDefId: string) =>
    get<boolean>(`/surveys/results/check?userId=${userId}&surveyDefId=${surveyDefId}`),

  // init es no-op; el servidor maneja la inicialización
  init: () => {},
};
