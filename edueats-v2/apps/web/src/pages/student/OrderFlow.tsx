import { useState, useEffect, FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { DailyMenuConfig, Recipe, CategoryDef, CategoryRule, OrderItem, Order } from '../../types';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Utensils, Apple, Coffee, Soup, CircleDashed, Lock, X, Edit2, CheckCircle2, Star, Sparkles, Leaf } from 'lucide-react';

// --- Helpers ---
const getCategoryIcon = (catId: string, size = 24) => {
  if (catId.includes('soup') || catId.includes('sopa')) return <Soup size={size} />;
  if (catId.includes('start') || catId.includes('entr')) return <Utensils size={size} />; // Reused but distinct in context
  if (catId.includes('vegetarian') || catId.includes('veg')) return <Leaf size={size} />;
  if (catId.includes('main') || catId.includes('fuerte') || catId.includes('princ')) return <Utensils size={size} />;
  if (catId.includes('dessert') || catId.includes('postr')) return <Coffee size={size} />;
  if (catId.includes('snack') || catId.includes('refri')) return <Apple size={size} />;
  return <CircleDashed size={size} />;
};

const getCategoryColorClass = (catId: string) => {
  if (catId.includes('soup') || catId.includes('sopa')) return 'bg-orange-400';
  if (catId.includes('start') || catId.includes('entr')) return 'bg-emerald-500';
  if (catId.includes('vegetarian') || catId.includes('veg')) return 'bg-green-600';
  if (catId.includes('main') || catId.includes('fuerte') || catId.includes('princ')) return 'bg-blue-500';
  if (catId.includes('dessert') || catId.includes('postr')) return 'bg-pink-500';
  if (catId.includes('snack') || catId.includes('refri')) return 'bg-amber-500';
  return 'bg-gray-500';
};

const getRecipeEmoji = (recipe: Recipe): string => {
  const name = recipe.name.toLowerCase();
  const cat = recipe.category.toLowerCase();
  
  if (cat.includes('soup')) return '🍜';
  if (cat.includes('start')) return name.includes('ensalada') ? '🥗' : '🥕';
  if (cat.includes('vegetarian')) return '🥦';
  if (cat.includes('main')) {
    if (name.includes('pollo')) return '🍗';
    if (name.includes('carne') || name.includes('hamburguesa')) return '🥩';
    if (name.includes('pescado') || name.includes('atun')) return '🐟';
    if (name.includes('pasta') || name.includes('espagueti')) return '🍝';
    return '🥘';
  }
  if (cat.includes('dessert')) return name.includes('manzana') || name.includes('fruta') ? '🍎' : '🧁';
  if (cat.includes('snack')) return name.includes('jugo') ? '🧃' : '🍪';
  
  return '🍽️';
};

const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  const dayNameRaw = date.toLocaleDateString('es-ES', { weekday: 'long' });
  return dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
};

interface ItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const VisualCard: FC<ItemProps> = ({ recipe, isSelected, onSelect, disabled }) => {
  const emoji = getRecipeEmoji(recipe);
  const hasImage = !!recipe.imageUrl;

  return (
    <div 
      onClick={() => !disabled && onSelect(recipe.id)}
      className={`
        relative overflow-hidden transition-all duration-300 rounded-[2rem] border-[4px] h-full group
        ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}
        ${isSelected 
          ? 'border-green-500 scale-[1.02] shadow-2xl ring-4 ring-green-500/30' 
          : disabled 
            ? 'border-gray-200 dark:border-gray-700 grayscale'
            : 'border-transparent hover:border-blue-400 hover:scale-[1.02] hover:shadow-xl'
        }
      `}
    >
      {/* Background Image or Fallback */}
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800">
         {hasImage ? (
            <img 
              src={recipe.imageUrl} 
              alt={recipe.name} 
              className={`w-full h-full object-cover transition-transform duration-700 ${!disabled && 'group-hover:scale-110'}`}
            />
         ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
               <span className="text-8xl md:text-9xl filter grayscale opacity-20">{emoji}</span>
            </div>
         )}
         {/* Gradient Overlay for Text Readability */}
         <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity ${isSelected ? 'opacity-90' : 'opacity-70'}`} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-5 md:p-6 text-white min-h-[180px] md:min-h-[240px]">
         <div className="mb-auto self-end">
            {isSelected ? (
                <div className="bg-green-500 text-white rounded-full p-2 shadow-lg animate-in zoom-in spin-in-12">
                   <Check className="w-5 h-5 md:w-7 md:h-7" strokeWidth={4} />
                </div>
            ) : (
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white/50" />
            )}
         </div>

         <div className={`transition-all duration-300 ${isSelected ? 'translate-y-0' : 'translate-y-2'}`}>
            <h3 className="font-black text-xl md:text-3xl leading-tight shadow-black drop-shadow-md">
                {recipe.name}
            </h3>
            <p className="text-gray-200 text-xs md:text-sm mt-1 md:mt-2 line-clamp-2 font-medium opacity-90">
                {recipe.description}
            </p>
            <div className="mt-2 md:mt-3 inline-flex items-center px-2 py-1 rounded bg-black/30 backdrop-blur-sm text-[10px] md:text-xs text-white/90">
                {recipe.calories} kcal
            </div>
         </div>
      </div>
    </div>
  );
};

const CompactItem: FC<ItemProps> = ({ recipe, isSelected, onSelect, disabled }) => (
  <div 
    onClick={() => !disabled && onSelect(recipe.id)}
    className={`
      p-3 md:p-4 rounded-xl border transition-all flex items-center gap-3 md:gap-4
      ${disabled ? 'cursor-default' : 'cursor-pointer'}
      ${isSelected 
        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md ring-1 ring-primary' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }
      ${!isSelected && disabled ? 'opacity-50' : ''}
      ${!disabled && !isSelected ? 'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm' : ''}
    `}
  >
    {/* Thumbnail */}
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-xl md:text-2xl">
                {getRecipeEmoji(recipe)}
            </div>
        )}
    </div>

    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-gray-800 dark:text-white text-base md:text-lg truncate">{recipe.name}</h3>
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{recipe.description}</p>
    </div>
    
    <div className={`
      w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0
      ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600'}
    `}>
      {isSelected && <Check size={12} />}
    </div>
  </div>
);

export const OrderFlow = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [menuConfig, setMenuConfig] = useState<DailyMenuConfig | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [rules, setRules] = useState<CategoryRule[]>([]);
  
  // States for Read-Only Logic
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [existingOrder, setExistingOrder] = useState<Order | undefined>(undefined);
  
  // Confirmation Modal State
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveAsPreference, setSaveAsPreference] = useState(false);

  // Preference Auto-fill notification
  const [autoFilled, setAutoFilled] = useState(false);

  // Loading state to distinguish "loading" from "menu not found"
  const [isLoaded, setIsLoaded] = useState(false);

  const isKidsMode = user?.grade && user.grade <= 5;
  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };
  const todayStr = getLocalDateStr();

  useEffect(() => {
    if (!date) return;

    // 1. Validation: Cannot order for today or past unless just viewing an existing order
    const isPastOrToday = date <= todayStr;

    const loadData = async () => {
      const [config, allRecipes, allCats, orders] = await Promise.all([
        db.getDailyMenu(date),
        db.getRecipes(),
        db.getCategories(),
        db.getOrders(),
      ]);

      const allRules = await db.getCategoryRules();
      setRules(allRules);

      const existing = orders.find(o => o.studentId === user?.id && o.date === date);

      setMenuConfig(config);
      setRecipes(allRecipes);
      setCategories(allCats);
      setExistingOrder(existing);
      setIsLoaded(true);

      if (existing) {
        const loadedSelections: Record<string, string | null> = {};
        existing.items.forEach(item => {
          loadedSelections[item.category] = item.recipeId;
        });
        setSelections(loadedSelections);

        // If confirmed, enable Read Only mode (Cannot edit)
        if (existing.status === 'confirmed') {
          setIsReadOnly(true);
        }
      } else if (isPastOrToday) {
        // No order exists, but date is passed. Lock it.
        setIsReadOnly(true);
      } else if (user && config) {
        // --- AUTO-FILL LOGIC ---
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        const preferences = await db.getPreferences(user.id);
        const dayPref = preferences.find(p => p.dayOfWeek === dayOfWeek);

        if (dayPref) {
          const newSelections: Record<string, string | null> = {};
          let matchCount = 0;

          dayPref.items.forEach(prefItem => {
            // Check if preferred item is in today's menu
            const isAvailable = config.items.some(menuItem => menuItem.recipeId === prefItem.recipeId);
            if (isAvailable) {
              newSelections[prefItem.category] = prefItem.recipeId;
              matchCount++;
            }
          });

          if (matchCount > 0) {
            setSelections(newSelections);
            setAutoFilled(true);
            // Auto hide the toast after 5s
            setTimeout(() => setAutoFilled(false), 5000);
          }
        }
      }
    };

    loadData();
  }, [date, user]);

  // Loading spinner (before data arrives)
  if (!isLoaded) {
    return (
      <div className="text-center py-12 dark:text-white">
        <h2 className="text-xl font-semibold">Cargando menú...</h2>
      </div>
    );
  }

  // --- Menú eliminado por el administrador ---
  if (!menuConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl">
          <div className="bg-amber-100 dark:bg-amber-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Menú no disponible</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            El menú para la fecha <strong>{date}</strong> fue eliminado o no está disponible. Contacta al administrador si crees que es un error.
          </p>
          <button onClick={() => navigate('/student/dashboard')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold w-full">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // --- Logic for "Date Closed" without order → redirect to unconfirmed tab ---
  if (!existingOrder && date && date <= todayStr) {
      navigate('/student/dashboard?tab=unconfirmed-orders', { replace: true });
      return null;
  }

  // --- Logic for Confirmed Order Summary (Read Only View) ---
  if (isReadOnly && existingOrder) {
      return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8 border border-green-100 dark:border-green-900/30">
                <div className="text-center mb-8">
                    <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">¡Pedido Confirmado!</h2>
                    <p className="text-gray-500 dark:text-gray-400">Menú para el {date}</p>
                    <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full inline-block border border-yellow-100">
                        🔒 No se puede editar después de confirmar
                    </div>
                </div>

                <div className="space-y-4">
                    {categories.map(cat => {
                        const selectedId = selections[cat.id];
                        if (!selectedId) return null;
                        const recipe = recipes.find(r => r.id === selectedId);
                        if (!recipe) return null;
                        
                        const colorClass = getCategoryColorClass(cat.id);

                        return (
                            <div key={cat.id} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                                {/* Color Strip */}
                                <div className={`w-2 self-stretch ${colorClass}`} />
                                
                                <div className="p-4 flex-1 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                        {recipe.imageUrl ? (
                                            <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">
                                                {getRecipeEmoji(recipe)}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{cat.name}</p>
                                    <h4 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{recipe.name}</h4>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <button 
                    onClick={() => navigate('/student/dashboard?tab=history')}
                    className="mt-8 w-full bg-gray-900 dark:bg-black text-white py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform"
                >
                    Volver al Historial
                </button>
            </div>
        </div>
      );
  }

  // --- Standard Ordering Wizard ---

  const currentCategory = categories[currentStepIndex];
  
  const availableRecipes = recipes.filter(r => 
    r.category === currentCategory.id && 
    menuConfig.items.some(i => i.recipeId === r.id)
  );

  const isVegStep = currentCategory.id === 'vegetarian' || currentCategory.id === 'vegetariano';
  const isVegSelected = selections[currentCategory.id];

  // --- Category Rules Helpers ---

  // Returns true when A blocks B AND B blocks A (mutually exclusive choice — show both, pick one)
  const isMutualBlock = (triggerCatId: string, targetCatId: string): boolean =>
    rules.some(r => r.effect === 'blocks' && r.triggerCategoryId === targetCatId && r.targetCategoryId === triggerCatId);

  // A category is "hard-blocked" (step skipped) only when the block is one-directional.
  // For mutual blocks, we keep the step visible so the user can switch their choice.
  const isCategoryBlocked = (catId: string, sels: Record<string, string | null>): boolean =>
    rules.some(r =>
      r.effect === 'blocks' &&
      r.targetCategoryId === catId &&
      !!sels[r.triggerCategoryId] &&
      !isMutualBlock(r.triggerCategoryId, catId)
    );

  const isCategoryHidden = (catId: string, sels: Record<string, string | null>): boolean => {
    const reqs = rules.filter(r => r.effect === 'requires' && r.targetCategoryId === catId);
    if (reqs.length === 0) return false;
    return !reqs.some(r => !!sels[r.triggerCategoryId]);
  };

  const isCatAvailable = (catId: string, sels: Record<string, string | null>): boolean =>
    !isCategoryBlocked(catId, sels) && !isCategoryHidden(catId, sels);

  const getNextAvailableIndex = (from: number, sels: Record<string, string | null>): number => {
    let next = from + 1;
    while (next < categories.length && !isCatAvailable(categories[next].id, sels)) next++;
    return next;
  };

  const getPrevAvailableIndex = (from: number, sels: Record<string, string | null>): number => {
    let prev = from - 1;
    while (prev >= 0 && !isCatAvailable(categories[prev].id, sels)) prev--;
    return prev;
  };

  // Active steps for progress bar
  const activeCategories = categories.filter(c => isCatAvailable(c.id, selections));
  const activeStepPos = activeCategories.findIndex(c => c.id === currentCategory.id);

  // --- Selection Logic ---
  const handleSelect = (recipeId: string) => {
    if (isReadOnly) return;

    setSelections(prev => {
      const newState = { ...prev };
      
      // 1. Toggle selection for current category
      const isDeselecting = newState[currentCategory.id] === recipeId;
      newState[currentCategory.id] = isDeselecting ? null : recipeId;

      // 2. Logic: If on Vegetarian step and selecting a dish, we might want to clear others just in case they went back/forth
      if (!isDeselecting && isVegStep) {
          const SAVORY_CATEGORIES = ['soup', 'starter', 'main'];
          SAVORY_CATEGORIES.forEach(catId => newState[catId] = null);
      }

      // 3. Rules: if a selection triggers a 'blocks' rule, clear the blocked category's selection
      if (!isDeselecting) {
        rules
          .filter(r => r.effect === 'blocks' && r.triggerCategoryId === currentCategory.id)
          .forEach(r => { newState[r.targetCategoryId] = null; });
        // Also clear hidden-by-requires categories that are no longer triggered
        categories.forEach(cat => {
          if (isCategoryHidden(cat.id, newState)) newState[cat.id] = null;
        });
      }

      return newState;
    });
  };

  const handleNext = () => {
    // Vegetarian shortcut: if veg is selected, skip everything and confirm
    if (isVegStep && isVegSelected) {
      setShowConfirmation(true);
      return;
    }
    const nextIndex = getNextAvailableIndex(currentStepIndex, selections);
    if (nextIndex >= categories.length) {
      setShowConfirmation(true);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  };

  const handleBack = () => {
    const prevIndex = getPrevAvailableIndex(currentStepIndex, selections);
    if (prevIndex < 0) {
      navigate('/student/dashboard');
    } else {
      setCurrentStepIndex(prevIndex);
    }
  };

  const submitOrder = async () => {
    if (!user || !date) return;

    const orderItems: OrderItem[] = Object.entries(selections)
      .filter(([_category, id]) => { console.log(_category); return id !== null; })
      .map(([cat, id]) => ({ category: cat, recipeId: id as string }));

    // Submit Order
    await db.submitOrder({
      id: existingOrder ? existingOrder.id : crypto.randomUUID(),
      studentId: user.id,
      studentName: user.name,
      studentGrade: user.grade || 0,
      studentSection: user.section,
      studentAllergies: user.allergies,
      date: date,
      items: orderItems,
      status: 'confirmed',
      timestamp: new Date().toISOString()
    });

    // Save Preference if checked
    if (saveAsPreference) {
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        const prefItems = orderItems.map(i => ({ category: i.category, recipeId: i.recipeId }));
        
        await db.savePreference({
            studentId: user.id,
            dayOfWeek,
            items: prefItems
        });
    }

    // Refresh view will trigger the Read Only summary or redirect
    navigate('/student/dashboard?tab=history');
  };

  const progress = ((activeStepPos + 1) / Math.max(activeCategories.length, 1)) * 100;
  
  // Logic for Next Button state:
  // - Veg Step: Always enabled (Optional)
  // - Others: Must select unless empty options
  
  // For a mutual-block step: if the sibling category already has a selection, this step is optional
  const mutualBlockSiblingSelected = rules.some(r =>
    r.effect === 'blocks' &&
    r.targetCategoryId === currentCategory.id &&
    !!selections[r.triggerCategoryId] &&
    isMutualBlock(r.triggerCategoryId, currentCategory.id)
  );

  let isNextDisabled = !selections[currentCategory.id]; 
  
  if (isVegStep) isNextDisabled = false; // Always allow moving forward on optional step
  if (mutualBlockSiblingSelected) isNextDisabled = false; // Sibling already chosen — this step is optional
  if (availableRecipes.length === 0) isNextDisabled = false;

  // Button Label Logic
  let buttonLabel = currentStepIndex === categories.length - 1 ? 'REVISAR PEDIDO' : 'SIGUIENTE';
  if (isVegStep) {
      buttonLabel = isVegSelected ? 'REVISAR Y CONFIRMAR' : 'VER MENÚ TRADICIONAL';
  }

  return (
    <div className="max-w-5xl mx-auto dark:text-white">
      {/* Auto-fill Toast */}
      {autoFilled && (
        <div className="fixed top-20 right-4 md:right-8 z-50 bg-yellow-50 dark:bg-yellow-900/80 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-500">
            <Sparkles className="text-yellow-500" size={20} />
            <div>
                <p className="font-bold text-sm">¡Favoritos aplicados!</p>
                <p className="text-xs">Hemos pre-seleccionado tu menú recurrente.</p>
            </div>
            <button onClick={() => setAutoFilled(false)} className="ml-2 hover:bg-yellow-100 dark:hover:bg-yellow-800 p-1 rounded-full"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className={`
        p-4 md:p-6 rounded-b-3xl md:rounded-3xl text-white mb-6 shadow-lg transition-colors sticky top-0 md:top-2 z-40
        ${isKidsMode ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gray-900'}
      `}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <ArrowLeft size={isKidsMode ? 28 : 24} />
          </button>
          <div className="flex flex-col items-center">
             <h2 className={`${isKidsMode ? 'text-2xl md:text-4xl' : 'text-lg md:text-xl'} font-bold capitalize flex items-center gap-2 md:gap-3 drop-shadow-md`}>
               {isKidsMode && getCategoryIcon(currentCategory.id, isKidsMode ? 32 : 40)}
               {currentCategory.name}
             </h2>
             {isKidsMode && <span className="text-sm md:text-lg font-medium opacity-90 mt-1 bg-black/10 px-3 py-1 rounded-full">Paso {activeStepPos + 1} de {activeCategories.length}</span>}
          </div>
          <div className="w-8" />
        </div>
        
        <div className="h-3 md:h-4 bg-black/20 rounded-full overflow-hidden border border-white/10">
          <div 
            className={`h-full transition-all duration-300 ease-out ${isKidsMode ? 'bg-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.6)]' : 'bg-primary'}`}
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-2 md:px-4 pb-32">
        {/* Warning if nothing selected (Excluding Optional Steps) */}
        {isNextDisabled && !isVegStep && (
           <div className="flex items-center justify-center gap-2 text-center text-base md:text-lg text-amber-600 dark:text-amber-400 mb-6 font-bold animate-bounce">
              <AlertTriangle size={20} />
              <span>¡Selecciona una opción!</span>
           </div>
        )}

        {/* Banner de regla activa */}
        {(() => {
          const blockingRule = rules.find(r => r.effect === 'blocks' && r.targetCategoryId === currentCategory.id && !!selections[r.triggerCategoryId]);
          const requireRule  = rules.find(r => r.effect === 'requires' && r.targetCategoryId === currentCategory.id);
          const triggerName  = (r: typeof blockingRule) => r ? (categories.find(c => c.id === r.triggerCategoryId)?.name ?? r.triggerCategoryId) : '';

          if (blockingRule && isMutualBlock(blockingRule.triggerCategoryId, currentCategory.id)) {
            // Mutual block: sibling already selected — inform the user they can switch or continue
            return (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl flex items-center gap-3 border border-blue-100 dark:border-blue-800">
                <CheckCircle2 size={18} className="flex-shrink-0 text-blue-500" />
                <p className="text-sm">
                  Ya elegiste de <strong>{triggerName(blockingRule)}</strong>. Puedes continuar o <strong>cambiar tu elección aquí</strong> — solo se confirmará una proteína.
                </p>
              </div>
            );
          }

          if (blockingRule) return (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-800">
              <Lock size={18} className="flex-shrink-0" />
              <p className="text-sm">Esta categoría está <strong>bloqueada</strong> porque elegiste <strong>{triggerName(blockingRule)}</strong>. El paso se omitirá automáticamente.</p>
            </div>
          );
          if (requireRule && !selections[requireRule.triggerCategoryId]) return (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl flex items-center gap-3 border border-blue-100 dark:border-blue-800">
              <Lock size={18} className="flex-shrink-0" />
              <p className="text-sm">Esta categoría solo estará disponible si elegiste de <strong>{triggerName(requireRule)}</strong>.</p>
            </div>
          );
          return null;
        })()}

        {/* Info Box for Vegetarian Step */}
        {isVegStep && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-xl text-center shadow-sm border border-green-100 dark:border-green-800">
            <p className="font-medium text-sm md:text-base">
              <strong>Opción Alternativa:</strong> Si eliges el menú vegetariano, este reemplazará la sopa, entrada y plato fuerte del menú tradicional.
            </p>
            <p className="text-xs mt-1 opacity-80">
              Si prefieres el menú tradicional (con proteína animal), simplemente continúa sin seleccionar nada aquí.
            </p>
          </div>
        )}

        <div className={`grid ${isKidsMode ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : 'grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'}`}>
          {availableRecipes.map(recipe => (
            isKidsMode 
              ? <VisualCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  isSelected={selections[currentCategory.id] === recipe.id} 
                  onSelect={handleSelect}
                  disabled={isReadOnly} 
                />
              : <CompactItem 
                  key={recipe.id} 
                  recipe={recipe} 
                  isSelected={selections[currentCategory.id] === recipe.id} 
                  onSelect={handleSelect}
                  disabled={isReadOnly}
                />
          ))}
        </div>

        {availableRecipes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
             <div className="bg-gray-100 dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
               <Utensils size={40} />
             </div>
            <p className="text-xl">No hay opciones disponibles para esta categoría hoy.</p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-center z-50 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        <button 
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`
            w-full max-w-2xl text-white font-black rounded-2xl flex items-center justify-center gap-4 transition-all shadow-lg hover:shadow-xl
            ${isNextDisabled 
               ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed scale-100 py-3 md:py-4 shadow-none' 
               : isKidsMode 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 py-4 md:py-6 text-xl md:text-2xl hover:scale-105 shadow-green-500/25' 
                  : 'bg-gray-900 hover:bg-black py-4 px-8 hover:scale-[1.02] shadow-gray-900/20'
            }
          `}
        >
          {buttonLabel}
          {!isNextDisabled && <ArrowRight size={isKidsMode ? 28 : 20} strokeWidth={3} />}
        </button>
      </div>

      {/* CONFIRMATION POPUP MODAL */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-primary/10 dark:bg-primary/20 p-6 text-center border-b border-primary/10 flex-shrink-0">
              <div className="bg-white dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <CheckCircle2 size={32} className="text-primary" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">Confirma tu Pedido</h3>
              <p className="text-gray-500 dark:text-gray-300 text-sm">Revisa tus elecciones antes de enviar.</p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
              {categories.map(cat => {
                const selectedId = selections[cat.id];
                // Don't show empty categories in confirmation if they are optional or skipped
                if (!selectedId) return null;

                const recipe = recipes.find(r => r.id === selectedId);
                if (!recipe) return null;
                
                const colorClass = getCategoryColorClass(cat.id);

                return (
                  <div key={cat.id} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center group hover:shadow-md transition-all">
                     {/* Color Strip */}
                     <div className={`w-2 self-stretch ${colorClass}`} />
                     
                     <div className="p-4 flex-1 flex items-center gap-4">
                         <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                            {recipe.imageUrl ? (
                                <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                    {getRecipeEmoji(recipe)}
                                </div>
                            )}
                         </div>
                         
                         <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{cat.name}</p>
                           <h4 className="font-bold text-gray-800 dark:text-white text-lg leading-tight truncate">{recipe.name}</h4>
                         </div>

                         <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-full flex-shrink-0">
                           <Check size={18} strokeWidth={3} />
                         </div>
                     </div>
                  </div>
                )
              })}
            </div>

            {/* Save Preference Checkbox */}
            {date && (
               <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-b border-yellow-100 dark:border-yellow-800 flex-shrink-0">
                  <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${saveAsPreference ? 'bg-yellow-500 border-yellow-500' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600'}`}>
                          {saveAsPreference && <Check size={14} className="text-white" />}
                          <input type="checkbox" className="hidden" checked={saveAsPreference} onChange={e => setSaveAsPreference(e.target.checked)} />
                      </div>
                      <div className="flex-1">
                          <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-yellow-100">
                             <Star size={16} className={saveAsPreference ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'} />
                             Guardar como favorito
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                             Si marcas esto, EduEats pre-seleccionará este menú automáticamente cada <strong>{getDayName(date)}</strong>.
                          </p>
                      </div>
                  </label>
               </div>
            )}

            <div className="p-6 pt-2 grid grid-cols-2 gap-3 bg-white dark:bg-gray-800 z-10 relative flex-shrink-0">
               <button 
                 onClick={() => setShowConfirmation(false)}
                 className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
               >
                 <Edit2 size={18} /> Modificar
               </button>
               <button 
                 onClick={submitOrder}
                 className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02]"
               >
                 <Check size={18} strokeWidth={3} /> Confirmar
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};