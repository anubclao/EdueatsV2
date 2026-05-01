import { useState, useEffect, MouseEvent } from 'react';
import { db } from '../../services/db';
import { Recipe, CategoryDef, DailyMenuConfig } from '../../types';
import { Save, AlertCircle, History, Calendar, Edit, Trash2, Search, Image as ImageIcon, Lock } from 'lucide-react';

export const MenuPlanner = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [menuItems, setMenuItems] = useState<{recipeId: string, isMandatory: boolean}[]>([]);
  const [feedback, setFeedback] = useState('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<string[]>([]);
  
  // History State
  const [menuHistory, setMenuHistory] = useState<DailyMenuConfig[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [orderCountsByDate, setOrderCountsByDate] = useState<Record<string, number>>({});

  const loadMenuHistory = async () => {
    const allMenus = await db.getAllMenus();
    setMenuHistory(allMenus);
    const counts = await Promise.all(
      allMenus.map(m => db.getOrderCountByDate(m.date).then(r => ({ date: m.date, count: r.count })))
    );
    setOrderCountsByDate(Object.fromEntries(counts.map(c => [c.date, c.count])));
  };

  const fetchData = async () => {
    const [allRecipes, allCategories] = await Promise.all([
      db.getRecipes(),
      db.getCategories(),
    ]);

    setRecipes(allRecipes);
    setCategories(allCategories);
    await loadMenuHistory();
    await loadMenuForDate(selectedDate);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const loadMenuForDate = async (date: string) => {
    const existingMenu = await db.getDailyMenu(date);
    if (existingMenu) {
      setMenuItems(existingMenu.items);
    } else {
      setMenuItems([]);
    }
  };

  const toggleRecipe = (recipeId: string) => {
    if (selectedDate < todayStr) return; // Prevent editing past via toggle

    setMenuItems(prev => {
      const exists = prev.find(i => i.recipeId === recipeId);
      if (exists) {
        return prev.filter(i => i.recipeId !== recipeId);
      } else {
        return [...prev, { recipeId, isMandatory: false }];
      }
    });
  };

  const toggleMandatory = (recipeId: string, e: MouseEvent) => {
    e.stopPropagation(); 
    if (selectedDate < todayStr) return; // Prevent editing past

    setMenuItems(prev => prev.map(item => 
      item.recipeId === recipeId ? { ...item, isMandatory: !item.isMandatory } : item
    ));
  };

  const saveMenu = async () => {
    if (selectedDate < todayStr) {
        alert("No es posible programar o modificar menús en fechas pasadas.");
        return;
    }

    const existingMenu = await db.getDailyMenu(selectedDate);
    if (existingMenu?.isPublished) {
      alert("El menú para esta fecha ya ha sido publicado y no puede ser publicado de nuevo.");
      return;
    }

    const selectedItems = menuItems.filter(item => item.recipeId);
    if (selectedItems.length === 0) {
      alert("Debes seleccionar al menos una receta antes de publicar el menú.");
      return;
    }

    // If not published, show confirmation dialog
    if (!isMenuPublishedForSelectedDate) {
      setShowPublishConfirm(true);
      return;
    }

    // If already published (and not showing confirm dialog), or after confirmation
    publishMenuConfirmed();
  };

  const publishMenuConfirmed = async () => {
    const config: DailyMenuConfig = {
      date: selectedDate,
      items: menuItems.filter(i => i.recipeId),
      isPublished: true
    };
    await db.saveDailyMenu(config);
    setFeedback('¡Menú guardado exitosamente!');
    setTimeout(() => setFeedback(''), 3000);
    await loadMenuHistory();
    setShowPublishConfirm(false);
  };

  const deleteMenu = async (date: string) => {
    if (confirm(`¿Estás seguro de eliminar el menú del ${date}? Esto podría afectar pedidos existentes.`)) {
        await db.deleteMenu(date);
        await loadMenuHistory();
        if (selectedDate === date) {
            setMenuItems([]);
        }
    }
  };

  const handleEditFromHistory = (date: string) => {
    setSelectedDate(date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredHistory = menuHistory.filter(m => 
    m.date.includes(historyFilter)
  );

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', options);
  };

  const isPastDate = selectedDate < todayStr;
  const isMenuPublishedForSelectedDate = menuHistory.find(menu => menu.date === selectedDate)?.isPublished || false;

  return (
    <div className="space-y-12">
      
      {/* SECTION 1: EDITOR */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Planificador de Menú</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Selecciona recetas disponibles para {selectedDate}</p>
            </div>
            <div className="flex gap-4">
            <input 
                type="date" 
                min={todayStr}
                className={`border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none ${isPastDate ? 'text-red-500 border-red-300' : ''}`}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button 
                onClick={saveMenu}
                disabled={isPastDate || isMenuPublishedForSelectedDate}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all ${
                    isPastDate 
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500 dark:bg-gray-700 dark:text-gray-400' 
                      : 'bg-primary hover:bg-emerald-600 text-white'
                }`}
            >
                {isPastDate || isMenuPublishedForSelectedDate ? <Lock size={18} /> : <Save size={18} />} 
                {isPastDate ? 'Cerrado' : (isMenuPublishedForSelectedDate ? 'Menú Publicado' : 'Publicar Menú')}
            </button>
            </div>
        </div>

        {feedback && (
            <div className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 p-3 rounded-lg text-sm font-medium text-center animate-pulse">
            {feedback}
            </div>
        )}

        {isPastDate && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-3 rounded-lg text-sm flex items-center gap-2 border border-amber-200 dark:border-amber-800">
                <Lock size={16} />
                <span>Estás visualizando un menú pasado. No se permiten ediciones para mantener la integridad del historial.</span>
            </div>
        )}

        {/* Dynamic Grid based on Categories */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isPastDate || isMenuPublishedForSelectedDate ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
            {categories.map(category => (
            <div key={category.id} className="space-y-3">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 capitalize border-b dark:border-gray-700 pb-2 mb-4">
                {category.name}
                </h3>
                {recipes.filter(r => r.category === category.id).map(recipe => {
                const isSelected = menuItems.some(i => i.recipeId === recipe.id);
                const isMandatory = menuItems.find(i => i.recipeId === recipe.id)?.isMandatory;

                return (
                    <div 
                    key={recipe.id}
                    onClick={() => toggleRecipe(recipe.id)}
                    className={`
                        cursor-pointer p-3 rounded-lg border transition-all relative overflow-hidden group
                        ${isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-1 ring-blue-300 dark:ring-blue-800' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'}
                    `}
                    >
                    {/* Thumbnail Image */}
                    <div className="h-20 w-full bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden mb-2 relative">
                         {recipe.imageUrl && !brokenImageIds.includes(recipe.id) ? (
                             <img
                               src={recipe.imageUrl}
                               alt={recipe.name}
                               className="w-full h-full object-cover"
                               onError={() => setBrokenImageIds(prev => prev.includes(recipe.id) ? prev : [...prev, recipe.id])}
                             />
                         ) : (
                             <div className="flex items-center justify-center h-full text-gray-300 dark:text-gray-600">
                                 <ImageIcon size={24} />
                             </div>
                         )}
                         {/* Selection Overlay Checkmark */}
                         {isSelected && (
                             <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                 <div className="bg-blue-500 text-white rounded-full p-1">
                                     <Save size={16} />
                                 </div>
                             </div>
                         )}
                    </div>

                    <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">{recipe.name}</span>
                        <input 
                        type="checkbox" 
                        checked={isSelected} 
                        readOnly 
                        className="accent-primary mt-1"
                        />
                    </div>
                    
                    {isSelected && (
                        <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-800 flex items-center justify-between">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Disponible</span>
                        <button
                            onClick={(e) => toggleMandatory(recipe.id, e)}
                            className={`text-xs px-2 py-1 rounded-md transition-colors ${
                            isMandatory 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {isMandatory ? 'Requerido *' : 'Opcional'}
                        </button>
                        </div>
                    )}
                    </div>
                );
                })}
                {recipes.filter(r => r.category === category.id).length === 0 && (
                <p className="text-xs text-gray-400 italic">No se encontraron recetas.</p>
                )}
            </div>
            ))}
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg flex gap-3 items-start border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>
            <strong>Consejo:</strong> Marcar una receta como &quot;Requerido&quot; en este contexto significa que el estudiante 
            <em>debe</em> elegir una receta de esta categoría. 
            En EduEats, marcar &quot;Requerido&quot; en una receta específica activa la obligatoriedad de la <strong>&quot;Categoría&quot;</strong> para ese día.
            </p>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white">Confirmar Publicación</h3>
            <p className="text-gray-700 dark:text-gray-300">¿Deseas publicar este menú para el día {formatDate(selectedDate)} o prefieres seguir modificándolo?</p>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                type="button" 
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Modificar
              </button>
              <button 
                type="button" 
                onClick={publishMenuConfirmed}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600"
              >
                Confirmar Publicación
              </button>
            </div>
          </div>
        </div>
      )}

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* SECTION 2: HISTORY */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <History className="text-primary" /> Historial de Menús Publicados
             </h3>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="date"
                    placeholder="Filtrar por fecha..." 
                    className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={historyFilter}
                    onChange={e => setHistoryFilter(e.target.value)}
                />
             </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
             {filteredHistory.length > 0 ? (
                 <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredHistory.map((menu) => (
                        <div key={menu.date} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-300">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white capitalize">
                                        {formatDate(menu.date)}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {menu.items.length} Recetas habilitadas • {menu.isPublished ? 'Publicado' : 'Borrador'}
                                    </p>
                                </div>
                            </div>
                            
                            {menu.isPublished && (
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    {(() => {
                                        const hasOrders = (orderCountsByDate[menu.date] ?? 0) > 0;
                                        return hasOrders ? (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 rounded-lg font-medium">
                                                🔒 {orderCountsByDate[menu.date]} pedido{orderCountsByDate[menu.date] !== 1 ? 's' : ''} — no editable
                                            </span>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => deleteMenu(menu.date)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <Trash2 size={16} /> Eliminar
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
             ) : (
                 <div className="p-12 text-center text-gray-400 dark:text-gray-500">
                    <History size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No se encontraron menús publicados para el filtro seleccionado.</p>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};