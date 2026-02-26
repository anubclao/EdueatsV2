
import { Recipe, DailyMenuConfig, Order, User, CategoryDef, RoleDef, RecurringPreference, SystemNotification, SurveyResult, SurveyDefinition, GlobalVariable, GeneratedReport } from '../types';

/* 
  SQL SCHEMA REPRESENTATION (Updated):
  ... existing tables ...

  CREATE TABLE survey_definitions (
    id UUID PRIMARY KEY,
    title VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN
  );

  CREATE TABLE surveys (
    id UUID PRIMARY KEY,
    survey_definition_id UUID REFERENCES survey_definitions(id),
    user_id UUID NOT NULL,
    ...
  );
*/

// --- Mock Data Initialization ---

const MOCK_CATEGORIES: CategoryDef[] = [
  { id: 'vegetarian', name: 'Vegetariano', order: 1 }, // Moved to First Position
  { id: 'soup', name: 'Sopa', order: 2 },
  { id: 'starter', name: 'Entrada', order: 3 },
  { id: 'main', name: 'Plato Fuerte', order: 4 },
  { id: 'dessert', name: 'Postre', order: 5 },
  { id: 'snack', name: 'Refrigerio', order: 6 },
];

const MOCK_ROLES: RoleDef[] = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema', isSystem: true },
  { id: 'student', name: 'Estudiante', description: 'Puede realizar pedidos', isSystem: true },
  { id: 'teacher', name: 'Profesor', description: 'Personal docente. Puede realizar pedidos', isSystem: true },
  { id: 'staff', name: 'Personal Administrativo', description: 'Personal del colegio. Puede realizar pedidos', isSystem: true },
  { id: 'visitor', name: 'Visitante', description: 'Visitante externo. Puede realizar pedidos', isSystem: true },
];

const MOCK_RECIPES: Recipe[] = [
  // SOPAS
  {
    id: 's1',
    name: 'Crema de Tomate',
    description: 'Tomates asados con un toque de albahaca fresca',
    category: 'soup',
    calories: 150,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23acbe346499?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's2',
    name: 'Ajiaco Santafereño',
    description: 'Sopa tradicional de papa con guascas',
    category: 'soup',
    calories: 250,
    imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  // ENTRADAS
  { 
    id: '1', 
    name: 'Bastones de Zanahoria', 
    description: 'Frescos con dip de queso crema', 
    category: 'starter', 
    calories: 80,
    imageUrl: 'https://images.unsplash.com/photo-1599525679908-10023a887036?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '2', 
    name: 'Ensalada César', 
    description: 'Clásica con crutones, parmesano y aderezo especial', 
    category: 'starter', 
    calories: 180,
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80'
  },
  // PLATOS FUERTES
  { 
    id: '3', 
    name: 'Pollo a la Parrilla', 
    description: 'Pechuga marinada con hierbas finas y limón', 
    category: 'main', 
    calories: 450,
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '4', 
    name: 'Espagueti Boloñesa', 
    description: 'Pasta al dente con salsa de carne casera italiana', 
    category: 'main', 
    calories: 550,
    imageUrl: 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?auto=format&fit=crop&w=800&q=80'
  },
  // VEGETARIANO
  { 
    id: 'v1', 
    name: 'Hamburguesa de Lentejas', 
    description: 'Opción vegetariana rica en proteína con pan integral', 
    category: 'vegetarian', 
    calories: 380,
    imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: 'v2', 
    name: 'Bowl de Quinoa y Vegetales', 
    description: 'Mix nutritivo con aguacate y vinagreta de limón', 
    category: 'vegetarian', 
    calories: 320,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
  },
  // POSTRES
  { 
    id: '6', 
    name: 'Pie de Manzana', 
    description: 'Receta casera tibia con canela', 
    category: 'dessert', 
    calories: 300,
    imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '7', 
    name: 'Ensalada de Frutas', 
    description: 'Mix de frutas de temporada frescas picadas', 
    category: 'dessert', 
    calories: 150,
    imageUrl: 'https://images.unsplash.com/photo-1564518086208-7264ae49992d?auto=format&fit=crop&w=800&q=80'
  },
  // REFRIGERIOS
  { 
    id: '8', 
    name: 'Yogur Griego', 
    description: 'Cremosidad natural con miel orgánica y granola crujiente', 
    category: 'snack', 
    calories: 120,
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '9', 
    name: 'Barrita de Cereal', 
    description: 'Energía saludable con avena, miel y frutos secos', 
    category: 'snack', 
    calories: 180,
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80'
  },
];

const MOCK_DAILY_MENUS: DailyMenuConfig[] = [
  {
    date: '2026-02-22', // Today
    items: [
      { recipeId: 's1', isMandatory: false }, // Crema de Tomate
      { recipeId: '1', isMandatory: false },  // Bastones de Zanahoria
      { recipeId: '3', isMandatory: true },   // Pollo a la Parrilla (main)
      { recipeId: '6', isMandatory: false },  // Pie de Manzana
    ],
    isPublished: true,
  },
  {
    date: '2026-02-23', // Tomorrow
    items: [
      { recipeId: 's2', isMandatory: false }, // Ajiaco Santafereño
      { recipeId: '2', isMandatory: false },  // Ensalada César
      { recipeId: 'v1', isMandatory: true },  // Hamburguesa de Lentejas (vegetarian main)
      { recipeId: '7', isMandatory: false },  // Ensalada de Frutas
    ],
    isPublished: true,
  },
  {
    date: '2026-02-24', // Day after tomorrow
    items: [
      { recipeId: 's1', isMandatory: false },
      { recipeId: 'v2', isMandatory: true }, // Bowl de Quinoa y Vegetales (vegetarian main)
      { recipeId: '8', isMandatory: false }, // Yogur Griego
    ],
    isPublished: false, // This one is not published yet
  },
];

const STORAGE_KEYS = {
  RECIPES: 'edueats_recipes',
  MENUS: 'edueats_menus',
  ORDERS: 'edueats_orders',
  USERS: 'edueats_users_db',
  CATEGORIES: 'edueats_categories',
  ROLES: 'edueats_roles',
  PREFERENCES: 'edueats_preferences',
  NOTIFICATIONS: 'edueats_notifications',
  SURVEY_DEFINITIONS: 'edueats_survey_defs',
  SURVEY_RESULTS: 'edueats_survey_results',
  GLOBAL_VARIABLES: 'edueats_global_vars',
  GENERATED_REPORTS: 'edueats_generated_reports'
};

// --- Helpers ---

const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setStorage = <T>(key: string, val: T) => {
  localStorage.setItem(key, JSON.stringify(val));
};

const generateToken = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// --- Service Methods ---

export const db = {
  // --- GLOBAL VARIABLES CRUD ---
  getGlobalVariables: (): GlobalVariable[] => {
    const storedVars = getStorage(STORAGE_KEYS.GLOBAL_VARIABLES, []);
    // Ensure system vars are always present and up-to-date
    const systemVars: GlobalVariable[] = [
      { id: 'schoolName', name: 'Colegio', value: 'EduEats School', isSystem: true },
    ];
    // Initialize map with system variables, ensuring isSystem is true
    const varMap = new Map<string, GlobalVariable>(systemVars.map(sv => [sv.id, { ...sv, isSystem: true }]));
    // Merge stored variables, overriding system defaults if they exist, but preserving isSystem flag
    storedVars.forEach((storedVar: GlobalVariable) => {
      const existingSystemVar = varMap.get(storedVar.id);
      if (existingSystemVar && existingSystemVar.isSystem) {
        // If it's a system variable, update its value/name but keep isSystem true
        varMap.set(storedVar.id, { ...storedVar, isSystem: true });
      } else {
        // Otherwise, just add/update the user-defined variable
        varMap.set(storedVar.id, storedVar);
      }
    });
    return Array.from(varMap.values());
  },

  addGlobalVariable: (variable: GlobalVariable) => {
    const vars = db.getGlobalVariables();
    if (vars.some(v => v.id === variable.id)) return { success: false, message: 'Ya existe una variable con este ID.' };
    vars.push(variable);
    setStorage(STORAGE_KEYS.GLOBAL_VARIABLES, vars);
    return { success: true };
  },

  updateGlobalVariable: (variable: GlobalVariable) => {
    const vars = db.getGlobalVariables();
    const index = vars.findIndex(v => v.id === variable.id);
    if (index !== -1) {
      // Preserve isSystem flag if it's a system variable
      const existingVar = vars[index];
      vars[index] = { ...variable, isSystem: existingVar.isSystem };
      setStorage(STORAGE_KEYS.GLOBAL_VARIABLES, vars);
      return { success: true };
    }
    return { success: false, message: 'Variable no encontrada.' };
  },

  deleteGlobalVariable: (id: string) => {
    const vars = db.getGlobalVariables();
    const varToDelete = vars.find(v => v.id === id);
    if (varToDelete && varToDelete.isSystem) return { success: false, message: 'No se puede eliminar una variable del sistema.' };
    setStorage(STORAGE_KEYS.GLOBAL_VARIABLES, vars.filter(v => v.id !== id));
    return { success: true };
  },

  // --- GENERATED REPORTS CRUD ---
  saveGeneratedReport: (report: GeneratedReport) => {
    const reports = db.getGeneratedReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);
    if (existingIndex !== -1) {
      reports[existingIndex] = report;
    } else {
      reports.push(report);
    }
    setStorage(STORAGE_KEYS.GENERATED_REPORTS, reports);
  },

  getGeneratedReports: (): GeneratedReport[] => {
    return getStorage<GeneratedReport[]>(STORAGE_KEYS.GENERATED_REPORTS, []).sort((a, b) => new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime());
  },

  deleteGeneratedReport: (id: string) => {
    const reports = db.getGeneratedReports();
    setStorage(STORAGE_KEYS.GENERATED_REPORTS, reports.filter(r => r.id !== id));
  },

  // --- ROLES CRUD ---
  getRoles: (): RoleDef[] => {
    const storedRoles = getStorage(STORAGE_KEYS.ROLES, MOCK_ROLES);
    const systemRoles = MOCK_ROLES.filter(r => r.isSystem);
    const roleMap = new Map(storedRoles.map(r => [r.id, r]));
    systemRoles.forEach(sr => roleMap.set(sr.id, sr));
    return Array.from(roleMap.values());
  },

  addRole: (role: RoleDef) => {
    const roles = db.getRoles();
    if (roles.some(r => r.id === role.id)) return false;
    roles.push(role);
    setStorage(STORAGE_KEYS.ROLES, roles);
    return true;
  },

  updateRole: (role: RoleDef) => {
    const roles = db.getRoles();
    const index = roles.findIndex(r => r.id === role.id);
    if (index !== -1) {
      roles[index] = { ...role, isSystem: roles[index].isSystem };
      setStorage(STORAGE_KEYS.ROLES, roles);
    }
  },

  deleteRole: (id: string) => {
    const roles = db.getRoles();
    const roleToDelete = roles.find(r => r.id === id);
    if (roleToDelete && roleToDelete.isSystem) return false;
    setStorage(STORAGE_KEYS.ROLES, roles.filter(r => r.id !== id));
    return true;
  },

  // --- CATEGORIES CRUD ---
  getCategories: (): CategoryDef[] => {
    return getStorage(STORAGE_KEYS.CATEGORIES, MOCK_CATEGORIES).sort((a, b) => a.order - b.order);
  },

  addCategory: (category: CategoryDef) => {
    const categories = getStorage<CategoryDef[]>(STORAGE_KEYS.CATEGORIES, MOCK_CATEGORIES);
    categories.push(category);
    setStorage(STORAGE_KEYS.CATEGORIES, categories);
  },

  updateCategory: (category: CategoryDef) => {
    const categories = getStorage<CategoryDef[]>(STORAGE_KEYS.CATEGORIES, MOCK_CATEGORIES);
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      categories[index] = category;
      setStorage(STORAGE_KEYS.CATEGORIES, categories);
    }
  },

  deleteCategory: (id: string) => {
    const categories = getStorage<CategoryDef[]>(STORAGE_KEYS.CATEGORIES, MOCK_CATEGORIES);
    setStorage(STORAGE_KEYS.CATEGORIES, categories.filter(c => c.id !== id));
  },

  // --- RECIPES ---
  getRecipes: (): Recipe[] => {
    return getStorage(STORAGE_KEYS.RECIPES, []); // Default to empty array, init will seed if truly empty
  },

  addRecipe: (recipe: Recipe) => {
    const recipes = getStorage<Recipe[]>(STORAGE_KEYS.RECIPES, MOCK_RECIPES);
    recipes.push(recipe);
    setStorage(STORAGE_KEYS.RECIPES, recipes);
  },

  updateRecipe: (updatedRecipe: Recipe) => {
    const recipes = getStorage<Recipe[]>(STORAGE_KEYS.RECIPES, MOCK_RECIPES);
    const index = recipes.findIndex(r => r.id === updatedRecipe.id);
    if (index !== -1) {
      recipes[index] = updatedRecipe;
      setStorage(STORAGE_KEYS.RECIPES, recipes);
    }
  },

  deleteRecipe: (id: string) => {
    const recipes = getStorage<Recipe[]>(STORAGE_KEYS.RECIPES, MOCK_RECIPES);
    setStorage(STORAGE_KEYS.RECIPES, recipes.filter(r => r.id !== id));
  },

  // --- MENUS ---
  getAllMenus: (): DailyMenuConfig[] => {
    return getStorage<DailyMenuConfig[]>(STORAGE_KEYS.MENUS, []).sort((a, b) => b.date.localeCompare(a.date));
  },

  getDailyMenu: (date: string): DailyMenuConfig | null => {
    const menus = getStorage<DailyMenuConfig[]>(STORAGE_KEYS.MENUS, []);
    return menus.find(m => m.date === date) || null;
  },

  saveDailyMenu: (menu: DailyMenuConfig) => {
    const menus = getStorage<DailyMenuConfig[]>(STORAGE_KEYS.MENUS, []);
    const existingIndex = menus.findIndex(m => m.date === menu.date);
    if (existingIndex >= 0) {
      menus[existingIndex] = menu;
    } else {
      menus.push(menu);
    }
    setStorage(STORAGE_KEYS.MENUS, menus);
  },

  deleteMenu: (date: string) => {
    const menus = getStorage<DailyMenuConfig[]>(STORAGE_KEYS.MENUS, []);
    const newMenus = menus.filter(m => m.date !== date);
    setStorage(STORAGE_KEYS.MENUS, newMenus);
  },

  // --- ORDERS ---
  getOrders: (): Order[] => {
    return getStorage(STORAGE_KEYS.ORDERS, []);
  },

  submitOrder: (order: Order) => {
    const orders = getStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
    const existingIndex = orders.findIndex(o => o.studentId === order.studentId && o.date === order.date);
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.push(order);
    }
    setStorage(STORAGE_KEYS.ORDERS, orders);
  },

  submitBatchOrders: (orders: Order[]) => {
    const currentOrders = getStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
    const newOrders = [...currentOrders, ...orders];
    setStorage(STORAGE_KEYS.ORDERS, newOrders);
  },

  // --- USERS ---
  getUsers: (): User[] => {
    return getStorage<User[]>(STORAGE_KEYS.USERS, []);
  },

  registerUser: (user: User): { success: boolean, token: string } => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    if (users.find(u => u.email === user.email)) {
      return { success: false, token: '' };
    }
    
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const newUser: User = { 
      ...user,
      verificationToken: user.verificationToken || token, 
      tokenExpiresAt: user.tokenExpiresAt || expiresAt,
      emailVerified: user.emailVerified ?? false
    };
    
    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);
    return { success: true, token };
  },

  updateUser: (user: User): { success: boolean, message?: string } => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    
    // Check for Duplicate Email (excluding self)
    const duplicate = users.find(u => u.email === user.email && u.id !== user.id);
    if (duplicate) {
        return { success: false, message: 'El correo electrónico ya está en uso por otro usuario.' };
    }

    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      // Preserve sensitive fields if not updating them explicitly
      const existingUser = users[index];
      
      // Logic for token cleanup if verified
      if (user.emailVerified && !existingUser.emailVerified) {
        user.verificationToken = undefined;
        user.tokenExpiresAt = undefined;
      }
      
      users[index] = user;
      setStorage(STORAGE_KEYS.USERS, users);
      return { success: true };
    } else {
        // If user doesn't exist, we could add, but strictly this is update. 
        // For robustness in this app structure, let's treat unknown ID as error or create.
        // Let's assume create for flexibility but with checks.
        if (users.find(u => u.email === user.email)) {
             return { success: false, message: 'El correo electrónico ya está en uso.' };
        }
        users.push(user);
        setStorage(STORAGE_KEYS.USERS, users);
        return { success: true };
    }
  },

  deleteUser: (id: string) => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    setStorage(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
  },

  verifyUser: (token: string): { status: 'success' | 'invalid' | 'expired' } => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const userIndex = users.findIndex(u => u.verificationToken === token);
    
    if (userIndex === -1) return { status: 'invalid' };
    
    const user = users[userIndex];
    if (user.tokenExpiresAt && Date.now() > user.tokenExpiresAt) {
      return { status: 'expired' };
    }

    users[userIndex].emailVerified = true;
    users[userIndex].verificationToken = undefined; 
    users[userIndex].tokenExpiresAt = undefined;
    setStorage(STORAGE_KEYS.USERS, users);
    
    return { status: 'success' };
  },

  resendVerificationToken: (email: string): { success: boolean, token?: string, name?: string } => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.email === email);
    if (index === -1) return { success: false };
    
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    
    users[index].verificationToken = token;
    users[index].tokenExpiresAt = expiresAt;
    setStorage(STORAGE_KEYS.USERS, users);
    
    return { success: true, token, name: users[index].name };
  },

  findUserByEmail: (email: string): User | undefined => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    return users.find(u => u.email === email);
  },

  // --- PREFERENCES ---
  getPreferences: (studentId: string): RecurringPreference[] => {
    const all = getStorage<RecurringPreference[]>(STORAGE_KEYS.PREFERENCES, []);
    return all.filter(p => p.studentId === studentId);
  },

  savePreference: (pref: RecurringPreference) => {
    const all = getStorage<RecurringPreference[]>(STORAGE_KEYS.PREFERENCES, []);
    const filtered = all.filter(p => !(p.studentId === pref.studentId && p.dayOfWeek === pref.dayOfWeek));
    filtered.push(pref);
    setStorage(STORAGE_KEYS.PREFERENCES, filtered);
  },

  deletePreference: (studentId: string, dayOfWeek: number) => {
    const all = getStorage<RecurringPreference[]>(STORAGE_KEYS.PREFERENCES, []);
    const filtered = all.filter(p => !(p.studentId === studentId && p.dayOfWeek === dayOfWeek));
    setStorage(STORAGE_KEYS.PREFERENCES, filtered);
  },

  // --- NOTIFICATIONS ---
  getNotifications: (): SystemNotification[] => {
    return getStorage<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, [])
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  addNotification: (note: SystemNotification) => {
    const notes = getStorage<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notes.push(note);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notes);
  },

  deleteNotification: (id: string) => {
    const notes = getStorage<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notes.filter(n => n.id !== id));
  },

  // --- SURVEYS (New Implementation) ---

  // 1. Definition Management
  getSurveyDefinitions: (): SurveyDefinition[] => {
    return getStorage<SurveyDefinition[]>(STORAGE_KEYS.SURVEY_DEFINITIONS, []).sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  createSurveyDefinition: (def: SurveyDefinition) => {
    const defs = db.getSurveyDefinitions();
    defs.push(def);
    setStorage(STORAGE_KEYS.SURVEY_DEFINITIONS, defs);
  },

  updateSurveyDefinition: (def: SurveyDefinition) => {
    const defs = db.getSurveyDefinitions();
    const index = defs.findIndex(d => d.id === def.id);
    if (index !== -1) {
      defs[index] = def;
      setStorage(STORAGE_KEYS.SURVEY_DEFINITIONS, defs);
    }
  },

  deleteSurveyDefinition: (id: string) => {
    const defs = db.getSurveyDefinitions();
    setStorage(STORAGE_KEYS.SURVEY_DEFINITIONS, defs.filter(d => d.id !== id));
  },

  // 2. Results Management
  saveSurvey: (survey: SurveyResult): { success: boolean, message?: string } => {
    const surveys = getStorage<SurveyResult[]>(STORAGE_KEYS.SURVEY_RESULTS, []);
    
    // Check if user has already responded to this survey period
    const existing = surveys.find(s => s.userId === survey.userId && s.surveyDefinitionId === survey.surveyDefinitionId);
    if (existing) {
        return { success: false, message: "Ya has respondido a esta encuesta." };
    }

    surveys.push(survey);
    setStorage(STORAGE_KEYS.SURVEY_RESULTS, surveys);
    return { success: true };
  },

  getSurveys: (surveyDefId?: string): SurveyResult[] => {
    const all = getStorage<SurveyResult[]>(STORAGE_KEYS.SURVEY_RESULTS, []);
    if (surveyDefId) {
        return all.filter(s => s.surveyDefinitionId === surveyDefId);
    }
    return all.sort((a,b) => b.date.localeCompare(a.date));
  },

  updateSurvey: (survey: SurveyResult) => {
    const surveys = getStorage<SurveyResult[]>(STORAGE_KEYS.SURVEY_RESULTS, []);
    const index = surveys.findIndex(s => s.id === survey.id);
    if (index !== -1) {
      surveys[index] = survey;
      setStorage(STORAGE_KEYS.SURVEY_RESULTS, surveys);
    }
  },

  hasUserResponded: (userId: string, surveyDefId: string): boolean => {
    const surveys = getStorage<SurveyResult[]>(STORAGE_KEYS.SURVEY_RESULTS, []);
    return surveys.some(s => s.userId === userId && s.surveyDefinitionId === surveyDefId);
  },

  init: () => {
    // Ensure recipes are initialized if localStorage is empty
    const currentRecipes = getStorage<Recipe[]>(STORAGE_KEYS.RECIPES, []);
    if (currentRecipes.length === 0 && MOCK_RECIPES.length > 0) {
      setStorage(STORAGE_KEYS.RECIPES, MOCK_RECIPES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      setStorage(STORAGE_KEYS.CATEGORIES, MOCK_CATEGORIES);
    }
    // Ensure menus are initialized if localStorage is empty
    const currentMenus = getStorage<DailyMenuConfig[]>(STORAGE_KEYS.MENUS, []);
    if (currentMenus.length === 0 && MOCK_DAILY_MENUS.length > 0) {
      setStorage(STORAGE_KEYS.MENUS, MOCK_DAILY_MENUS);
    }
    
    // Ensure Super Admin Exists
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    if (!users.find(u => u.email === 'superadmin@edueats.com')) {
      const superAdmin: User = {
        id: 'super-admin-01',
        name: 'Super Admin',
        email: 'superadmin@edueats.com',
        phone: '573000000000',
        role: 'admin',
        emailVerified: true
      };
      users.push(superAdmin);
      setStorage(STORAGE_KEYS.USERS, users);
    }

    // Ensure global variables exist
    const globalVars = getStorage<GlobalVariable[]>(STORAGE_KEYS.GLOBAL_VARIABLES, []);
    if (!globalVars.find(v => v.id === 'schoolName')) {
      db.addGlobalVariable({ id: 'schoolName', name: 'Colegio', value: 'EduEats School', isSystem: true });
    }

    // Ensure Test Teacher Exists
    if (!users.find(u => u.email === 'profesor@edueats.com')) {
      const testTeacher: User = {
        id: 'test-teacher-01',
        name: 'Profesor de Prueba',
        email: 'profesor@edueats.com',
        phone: '573001112233',
        role: 'teacher',
        emailVerified: true
      };
      users.push(testTeacher);
      setStorage(STORAGE_KEYS.USERS, users);
    }

    // Ensure Test Student Exists
    if (!users.find(u => u.email === 'estudiante@edueats.com')) {
      const testStudent: User = {
        id: 'test-student-01',
        name: 'Estudiante de Prueba',
        email: 'estudiante@edueats.com',
        phone: '573004445566',
        role: 'student',
        grade: 5,
        section: 'A',
        emailVerified: true
      };
      users.push(testStudent);
      setStorage(STORAGE_KEYS.USERS, users);
    }
  }
};

db.init();
