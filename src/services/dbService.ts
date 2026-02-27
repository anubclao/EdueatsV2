import { supabase } from './supabaseClient';
import { User, CategoryDef, Recipe, DailyMenuConfig, Order, RecurringPreference, SurveyDefinition, SurveyResult, GlobalVariable, SystemNotification, GeneratedReport } from '../types';

// Helper to handle Supabase responses
const handleResponse = <T>(response: { data: T | null; error: Error | null }): T | null => {
  if (response.error) {
    console.error('Supabase error:', response.error);
    throw new Error(response.error.message);
  }
  return response.data;
};

export const dbService = {
  // --- User Management ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    return handleResponse({ data, error }) || [];
  },

  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    return handleResponse({ data, error });
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    return handleResponse({ data, error });
  },

  async createUser(user: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase.from('users').insert([user]).select().single();
    return handleResponse({ data, error });
  },

  async updateUser(user: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase.from('users').update(user).eq('id', user.id).select().single();
    return handleResponse({ data, error });
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Category Management ---
  async getCategories(): Promise<CategoryDef[]> {
    const { data, error } = await supabase.from('categories').select('*').order('order');
    return handleResponse({ data, error }) || [];
  },

  async createCategory(category: Partial<CategoryDef>): Promise<CategoryDef | null> {
    const { data, error } = await supabase.from('categories').insert([category]).select().single();
    return handleResponse({ data, error });
  },

  async updateCategory(category: Partial<CategoryDef>): Promise<CategoryDef | null> {
    const { data, error } = await supabase.from('categories').update(category).eq('id', category.id).select().single();
    return handleResponse({ data, error });
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Recipe Management ---
  async getRecipes(): Promise<Recipe[]> {
    const { data, error } = await supabase.from('recipes').select('*');
    return handleResponse({ data, error }) || [];
  },

  async getRecipe(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
    return handleResponse({ data, error });
  },

  async createRecipe(recipe: Partial<Recipe>): Promise<Recipe | null> {
    const { data, error } = await supabase.from('recipes').insert([recipe]).select().single();
    return handleResponse({ data, error });
  },

  async updateRecipe(recipe: Partial<Recipe>): Promise<Recipe | null> {
    const { data, error } = await supabase.from('recipes').update(recipe).eq('id', recipe.id).select().single();
    return handleResponse({ data, error });
  },

  async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Daily Menu Configuration ---
  async getDailyMenus(): Promise<DailyMenuConfig[]> {
    const { data, error } = await supabase.from('daily_menu_configs').select('*, daily_menu_items(recipe_id, is_mandatory)');
    return handleResponse({ data, error }) || [];
  },

  async getDailyMenu(date: string): Promise<DailyMenuConfig | null> {
    const { data, error } = await supabase.from('daily_menu_configs').select('*, daily_menu_items(recipe_id, is_mandatory)').eq('date', date).single();
    return handleResponse({ data, error });
  },

  async createDailyMenu(menu: Partial<DailyMenuConfig>): Promise<DailyMenuConfig | null> {
    const { date, isPublished, items } = menu;
    const { data, error } = await supabase.from('daily_menu_configs').insert([{ date, is_published: isPublished }]).select().single();
    if (error) throw new Error(error.message);

    if (data && items && items.length > 0) {
      const menuItems = items.map(item => ({ menu_date: data.date, recipe_id: item.recipeId, is_mandatory: item.isMandatory }));
      const { error: itemsError } = await supabase.from('daily_menu_items').insert(menuItems);
      if (itemsError) throw new Error(itemsError.message);
    }
    return data;
  },

  async updateDailyMenu(menu: Partial<DailyMenuConfig>): Promise<DailyMenuConfig | null> {
    const { date, isPublished, items } = menu;
    const { data, error } = await supabase.from('daily_menu_configs').update({ is_published: isPublished }).eq('date', date).select().single();
    if (error) throw new Error(error.message);

    if (data && items) {
      // Delete existing items and insert new ones
      await supabase.from('daily_menu_items').delete().eq('menu_date', date);
      if (items.length > 0) {
        const menuItems = items.map(item => ({ menu_date: data.date, recipe_id: item.recipeId, is_mandatory: item.isMandatory }));
        const { error: itemsError } = await supabase.from('daily_menu_items').insert(menuItems);
        if (itemsError) throw new Error(itemsError.message);
      }
    }
    return data;
  },

  async deleteDailyMenu(date: string): Promise<void> {
    const { error } = await supabase.from('daily_menu_configs').delete().eq('date', date);
    if (error) throw new Error(error.message);
  },

  // --- Order Management ---
  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase.from('orders').select('*, order_items(category, recipe_id)');
    return handleResponse({ data, error }) || [];
  },

  async getOrder(id: string): Promise<Order | null> {
    const { data, error } = await supabase.from('orders').select('*, order_items(category, recipe_id)').eq('id', id).single();
    return handleResponse({ data, error });
  },

  async createOrder(order: Partial<Order>): Promise<Order | null> {
    const { studentId, studentName, studentGrade, studentSection, studentAllergies, date, items, status, timestamp } = order;
    const { data, error } = await supabase.from('orders').insert([{ student_id: studentId, student_name: studentName, student_grade: studentGrade, student_section: studentSection, student_allergies: studentAllergies, date, status, timestamp }]).select().single();
    if (error) throw new Error(error.message);

    if (data && items && items.length > 0) {
      const orderItems = items.map(item => ({ order_id: data.id, category: item.category, recipe_id: item.recipeId }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw new Error(itemsError.message);
    }
    return handleResponse({ data, error });
  },

  async updateOrder(order: Partial<Order>): Promise<Order | null> {
    const { id, studentId, studentName, studentGrade, studentSection, studentAllergies, date, items, status, timestamp } = order;
    const { data, error } = await supabase.from('orders').update({ student_id: studentId, student_name: studentName, student_grade: studentGrade, student_section: studentSection, student_allergies: studentAllergies, date, status, timestamp }).eq('id', id).select().single();
    if (error) throw new Error(error.message);

    if (data && items) {
      await supabase.from('order_items').delete().eq('order_id', id);
      if (items.length > 0) {
        const orderItems = items.map(item => ({ order_id: data.id, category: item.category, recipe_id: item.recipeId }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw new Error(itemsError.message);
      }
    }
    return handleResponse({ data, error });
  },

  async deleteOrder(id: string): Promise<void> {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Recurring Preferences ---
  async getPreferences(studentId: string): Promise<RecurringPreference[]> {
    const { data, error } = await supabase.from('recurring_preferences').select('*, recurring_preference_items(category, recipe_id)').eq('student_id', studentId);
    return handleResponse({ data, error }) || [];
  },

  async createPreference(preference: Partial<RecurringPreference>): Promise<RecurringPreference | null> {
    const { studentId, dayOfWeek, items } = preference;
    const { data, error } = await supabase.from('recurring_preferences').insert([{ student_id: studentId, day_of_week: dayOfWeek }]).select().single();
    if (error) throw new Error(error.message);

    if (data && items && items.length > 0) {
      const preferenceItems = items.map(item => ({ student_id: data.student_id, day_of_week: data.day_of_week, category: item.category, recipe_id: item.recipeId }));
      const { error: itemsError } = await supabase.from('recurring_preference_items').insert(preferenceItems);
      if (itemsError) throw new Error(itemsError.message);
    }
    return handleResponse({ data, error });
  },

  async updatePreference(preference: Partial<RecurringPreference>): Promise<RecurringPreference | null> {
    const { studentId, dayOfWeek, items } = preference;
    const { data, error } = await supabase.from('recurring_preferences').update({ day_of_week: dayOfWeek }).eq('student_id', studentId).eq('day_of_week', dayOfWeek).select().single();
    if (error) throw new Error(error.message);

    if (data && items) {
      await supabase.from('recurring_preference_items').delete().eq('student_id', studentId).eq('day_of_week', dayOfWeek);
      if (items.length > 0) {
        const preferenceItems = items.map(item => ({ student_id: data.student_id, day_of_week: data.day_of_week, category: item.category, recipe_id: item.recipeId }));
        const { error: itemsError } = await supabase.from('recurring_preference_items').insert(preferenceItems);
        if (itemsError) throw new Error(itemsError.message);
      }
    }
    return handleResponse({ data, error });
  },

  async deletePreference(studentId: string, dayOfWeek: number): Promise<void> {
    const { error } = await supabase.from('recurring_preferences').delete().eq('student_id', studentId).eq('day_of_week', dayOfWeek);
    if (error) throw new Error(error.message);
  },

  // --- Survey Management ---
  async getSurveyDefinitions(): Promise<SurveyDefinition[]> {
    const { data, error } = await supabase.from('survey_definitions').select('*');
    return handleResponse({ data, error }) || [];
  },

  async createSurveyDefinition(survey: Partial<SurveyDefinition>): Promise<SurveyDefinition | null> {
    const { data, error } = await supabase.from('survey_definitions').insert([survey]).select().single();
    return handleResponse({ data, error });
  },

  async updateSurveyDefinition(survey: Partial<SurveyDefinition>): Promise<SurveyDefinition | null> {
    const { data, error } = await supabase.from('survey_definitions').update(survey).eq('id', survey.id).select().single();
    return handleResponse({ data, error });
  },

  async deleteSurveyDefinition(id: string): Promise<void> {
    const { error } = await supabase.from('survey_definitions').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async getSurveyResults(): Promise<SurveyResult[]> {
    const { data, error } = await supabase.from('survey_results').select('*');
    return handleResponse({ data, error }) || [];
  },

  async createSurveyResult(result: Partial<SurveyResult>): Promise<SurveyResult | null> {
    const { data, error } = await supabase.from('survey_results').insert([result]).select().single();
    return handleResponse({ data, error });
  },

  async updateSurveyResult(result: Partial<SurveyResult>): Promise<SurveyResult | null> {
    const { data, error } = await supabase.from('survey_results').update(result).eq('id', result.id).select().single();
    return handleResponse({ data, error });
  },

  async deleteSurveyResult(id: string): Promise<void> {
    const { error } = await supabase.from('survey_results').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Global Variables ---
  async getGlobalVariables(): Promise<GlobalVariable[]> {
    const { data, error } = await supabase.from('global_variables').select('*');
    return handleResponse({ data, error }) || [];
  },

  async getGlobalVariable(id: string): Promise<GlobalVariable | null> {
    const { data, error } = await supabase.from('global_variables').select('*').eq('id', id).single();
    return handleResponse({ data, error });
  },

  async setGlobalVariable(variable: Partial<GlobalVariable>): Promise<GlobalVariable | null> {
    const { data, error } = await supabase.from('global_variables').upsert([variable], { onConflict: 'id' }).select().single();
    return handleResponse({ data, error });
  },

  // --- System Notifications ---
  async getNotifications(): Promise<SystemNotification[]> {
    const { data, error } = await supabase.from('system_notifications').select('*').order('date', { ascending: false });
    return handleResponse({ data, error }) || [];
  },

  async createNotification(notification: Partial<SystemNotification>): Promise<SystemNotification | null> {
    const { data, error } = await supabase.from('system_notifications').insert([notification]).select().single();
    return handleResponse({ data, error });
  },

  async updateNotification(notification: Partial<SystemNotification>): Promise<SystemNotification | null> {
    const { data, error } = await supabase.from('system_notifications').update(notification).eq('id', notification.id).select().single();
    return handleResponse({ data, error });
  },

  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase.from('system_notifications').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Reports (Generated) ---
  async getGeneratedReports(): Promise<GeneratedReport[]> {
    const { data, error } = await supabase.from('generated_reports').select('*').order('date_generated', { ascending: false });
    return handleResponse({ data, error }) || [];
  },

  async createGeneratedReport(report: Partial<GeneratedReport>): Promise<GeneratedReport | null> {
    const { data, error } = await supabase.from('generated_reports').insert([report]).select().single();
    return handleResponse({ data, error });
  },

  // --- Authentication (Supabase handles this directly, but we can add wrappers if needed) ---
  // async signUp(email: string, password: string, userName: string): Promise<User | null> { /* ... */ },
  // async signIn(email: string, password: string): Promise<User | null> { /* ... */ },
  // async signOut(): Promise<void> { /* ... */ },
};
