import { useEffect, useState } from 'react';
import { db } from '../../services/db';
import { Order, Recipe, CategoryDef, OrderItem } from '../../types';
import { Download, Filter, Users, ChefHat, ClipboardList, Utensils, PlusCircle } from 'lucide-react';
import { exportOrdersToExcel } from '../../utils/excel';

// Helper for local date string YYYY-MM-DD
const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
};

export const Dashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateStr());
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  
  // Batch Order Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchGrade, setBatchGrade] = useState(1);
  const [batchSection, setBatchSection] = useState('A');
  const [batchCount, setBatchCount] = useState(15);

  const loadData = async () => {
    setOrders(await db.getOrders());
    setRecipes(await db.getRecipes());
    setCategories(await db.getCategories());
  };

  useEffect(() => {
    loadData();
  }, [showBatchModal]); // Refresh when modal closes

  // --- Filter Logic ---
  const filteredOrders = orders.filter(o => {
    const matchDate = o.date === selectedDate;
    const matchGrade = selectedGrade === 'All' || o.studentGrade.toString() === selectedGrade;
    const matchStatus = o.status === 'confirmed'; 
    return matchDate && matchGrade && matchStatus;
  });

  // --- Aggregation: Kitchen Summary (Dynamic) ---
  const getRecipeCount = (categoryId: string) => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      const item = order.items.find(i => i.category === categoryId);
      if (item) {
        counts[item.recipeId] = (counts[item.recipeId] || 0) + 1;
      }
    });
    
    return Object.entries(counts).map(([id, count]) => {
      const recipe = recipes.find(r => r.id === id);
      return { name: recipe?.name || 'Desconocido', count };
    }).sort((a, b) => b.count - a.count);
  };

  // --- Aggregation: Logistics Table (Dynamic) ---
  const grades = Array.from(new Set(filteredOrders.map(o => o.studentGrade))).sort((a, b) => Number(a) - Number(b));
  
  const logisticsData = grades.map(grade => {
    const gradeOrders = filteredOrders.filter(o => o.studentGrade === grade);
    
    const catCounts: Record<string, number> = {};
    categories.forEach(cat => {
        catCounts[cat.id] = gradeOrders.filter(o => o.items.some(i => i.category === cat.id)).length;
    });

    return {
      grade,
      totalStudents: gradeOrders.length,
      catCounts
    };
  });

  const handleExport = () => {
    void exportOrdersToExcel(filteredOrders, recipes, `Reporte_Menu_${selectedDate}.xlsx`);
  };

  // --- Batch Order Logic (Dynamic) ---
  const handleBatchSubmit = async () => {
    // 1. Get menu for date
    const menu = await db.getDailyMenu(selectedDate);
    if (!menu) {
      alert("No hay menú configurado para esta fecha. Ve al Planificador primero.");
      return;
    }

    // 2. Select first available item in each category automatically
    const orderItems: OrderItem[] = [];
    
    categories.forEach(cat => {
        // Find a recipe in the menu that belongs to this category
        const menuItem = menu.items.find(item => {
             const r = recipes.find(rec => rec.id === item.recipeId);
             return r?.category === cat.id;
        });

        if (menuItem) {
            orderItems.push({ category: cat.id, recipeId: menuItem.recipeId });
        }
    });

    if (orderItems.length === 0) {
       alert("El menú de esta fecha no tiene recetas válidas asociadas a las categorías actuales.");
       return;
    }

    // 3. Generate dummy orders
    const newOrders: Order[] = [];
    for(let i=0; i<batchCount; i++) {
        newOrders.push({
            id: crypto.randomUUID(),
            studentId: `batch-${batchGrade}-${batchSection}-${i}-${Date.now()}`,
            studentName: `Estudiante ${i+1} (${batchGrade}${batchSection})`,
            studentGrade: Number(batchGrade),
            studentSection: batchSection,
            date: selectedDate,
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            items: orderItems
        });
    }

    await db.submitBatchOrders(newOrders);
    await loadData();
    setShowBatchModal(false);
    alert(`Se generaron ${batchCount} pedidos para Grado ${batchGrade}-${batchSection} exitosamente.`);
  };

  const allGrades = Array.from({length: 11}, (_, i) => i + 1);
  const totalMainDishes = filteredOrders.reduce((acc, order) => {
      // Assuming 'main' is the key or searching for category with 'main' in id/name
      // Better: Count total items of the category with name "Plato Fuerte" or id 'main'
      const mainCat = categories.find(c => c.id.includes('main') || c.name.toLowerCase().includes('fuerte'));
      if (mainCat && order.items.some(i => i.category === mainCat.id)) return acc + 1;
      return acc;
  }, 0);

  // Helper colors for categories (cycling)
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b dark:border-gray-700 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-primary" /> 
            Panel de Administración
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Resumen Operativo y Logístico</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center w-full xl:w-auto">
          <button
            onClick={() => setShowBatchModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors text-sm font-bold order-2 sm:order-1"
          >
            <PlusCircle size={16} /> <span className="sm:hidden md:inline">Pedido Masivo</span>
          </button>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg order-1 sm:order-2">
            <Filter size={16} className="text-gray-400 shrink-0" />
            <select 
              value={selectedGrade} 
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none dark:text-white w-full sm:w-auto"
            >
              <option value="All">Todos los Grados</option>
              {allGrades.map(g => <option key={g} value={g}>Grado {g}°</option>)}
            </select>
          </div>

          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 order-1 sm:order-3"
          />

          <button 
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors text-sm font-bold order-3 sm:order-4 w-full sm:w-auto"
          >
            <Download size={16} /> <span className="sm:hidden md:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 sm:gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-3 rounded-full text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase truncate">Confirmados</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{filteredOrders.length}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 sm:gap-4">
           <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 sm:p-3 rounded-full text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Utensils size={20} />
          </div>
           <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase truncate">Platos Fuertes</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {totalMainDishes > 0 ? totalMainDishes : filteredOrders.length}
            </p>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 sm:gap-4">
           <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 sm:p-3 rounded-full text-amber-600 dark:text-amber-400 flex-shrink-0">
            <ChefHat size={20} />
          </div>
           <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase truncate">Grupos Activos</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{logisticsData.length}</p>
          </div>
        </div>
      </div>

      {/* Kitchen View (Operational - Dynamic) */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <ChefHat size={20} className="text-gray-500" /> Resumen de Cocina (Producción)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat, idx) => {
            const stats = getRecipeCount(cat.id);
            const colorClass = colors[idx % colors.length];

            return (
              <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className={`px-4 py-2 font-bold text-xs uppercase tracking-wider ${colorClass}`}>
                  {cat.name}
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {stats.length > 0 ? (
                    stats.map((item) => (
                      <div key={item.name} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{item.name}</span>
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md text-xs font-bold">
                          {item.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm italic">Sin pedidos</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logistics View (Detailed Table - Dynamic) */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Users size={20} className="text-gray-500" /> Resumen Logístico (Por Grado)
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <p className="text-xs text-gray-400 text-right px-4 pt-2 md:hidden">← Desliza para ver más →</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Grupo</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">Total Pedidos</th>
                  {categories.map(cat => (
                    <th key={cat.id} className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">{cat.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {logisticsData.length > 0 ? (
                  logisticsData.map((row) => (
                    <tr key={row.grade} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {row.grade === 0 || !row.grade ? 'Personal / Otros' : `Grado ${row.grade}°`}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                           {row.totalStudents}
                         </span>
                      </td>
                      {categories.map(cat => (
                         <td key={cat.id} className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                            {row.catCounts[cat.id]}
                         </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={categories.length + 2} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                      No hay pedidos confirmados para esta fecha/filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Batch Order Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Cargar Pedido por Grupo</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Esta herramienta genera pedidos automáticos para todo un curso para la fecha <strong>{selectedDate}</strong>. 
              Se seleccionará automáticamente la primera opción disponible de cada categoría en el menú.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grado</label>
                <select 
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={batchGrade}
                  onChange={e => setBatchGrade(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11].map(g => <option key={g} value={g}>{g}°</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sección</label>
                <select 
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={batchSection}
                  onChange={e => setBatchSection(e.target.value)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="Unica">Única</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad Estudiantes</label>
                <input 
                  type="number" 
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={batchCount}
                  onChange={e => setBatchCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBatchSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generar Pedidos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};