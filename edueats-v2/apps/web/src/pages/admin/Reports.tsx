import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import { Order, User, Recipe, DailyMenuConfig, GeneratedReport } from '../../types';
import { Download, Calendar, AlertCircle, TrendingUp } from 'lucide-react';

const AdminOrdersChart = lazy(() => import('../../components/charts/AdminOrdersChart'));

export const Reports = () => {
  // Dates: Default to current week
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const date = new Date(d.setDate(diff));
    return date.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getStartOfWeek());
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [menus, setMenus] = useState<DailyMenuConfig[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setOrders(await db.getOrders());
      setUsers(await db.getUsers());
      setMenus(await db.getAllMenus());
      setRecipes(await db.getRecipes());
    };
    loadData();
  }, []);

  // --- DATA PROCESSING ---

  // 1. Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.date >= startDate && o.date <= endDate && o.status === 'confirmed');
  }, [orders, startDate, endDate]);

  // 2. Business Days in Range (Days with a published menu)
  const activeDays = useMemo(() => {
    return menus
        .filter(m => m.date >= startDate && m.date <= endDate && m.isPublished)
        .map(m => m.date)
        .sort();
  }, [menus, startDate, endDate]);

  // 3. Target Users (Students/Staff)
  const targetUsers = useMemo(() => {
    return users.filter(u => ['student', 'teacher', 'staff'].includes(u.role) && u.emailVerified);
  }, [users]);

  // 4. Missing Orders Calculation
  const missingOrdersData = useMemo(() => {
    const missing: {date: string, user: User}[] = [];
    
    activeDays.forEach(day => {
        // Find users who have NO order for this day
        const dayOrders = filteredOrders.filter(o => o.date === day);
        const userIdsWithOrder = new Set(dayOrders.map(o => o.studentId));
        
        targetUsers.forEach(user => {
            if (!userIdsWithOrder.has(user.id)) {
                missing.push({ date: day, user });
            }
        });
    });
    return missing;
  }, [activeDays, filteredOrders, targetUsers]);

  // 5. KPIs
  const totalPotentialOrders = activeDays.length * targetUsers.length;
  const actualOrders = filteredOrders.length;
  const participationRate = totalPotentialOrders > 0 ? Math.round((actualOrders / totalPotentialOrders) * 100) : 0;

  // 6. Chart Data: Published vs Confirmed (Supply vs Demand Variation)
  const chartData = useMemo(() => {
    return activeDays.map(day => {
        const dayOrders = filteredOrders.filter(o => o.date === day);
        return {
            date: day,
            pedidos: dayOrders.length,
            faltantes: targetUsers.length - dayOrders.length
        };
    });
  }, [activeDays, filteredOrders, targetUsers]);

  // 7. Top Dishes
  const topDishes = useMemo(() => {
     const counts: Record<string, number> = {};
     filteredOrders.forEach(o => {
         // Assuming main dish is vital
         const main = o.items.find(i => i.category.includes('main'))?.recipeId;
         if (main) {
             const name = recipes.find(r => r.id === main)?.name || 'Desconocido';
             counts[name] = (counts[name] || 0) + 1;
         }
     });
     return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5);
  }, [filteredOrders, recipes]);

    const handleDownload = async () => {
        const { generateAdvancedReport } = await import('../../utils/excel');
        await generateAdvancedReport(filteredOrders, recipes, {start: startDate, end: endDate}, missingOrdersData);

    const report: GeneratedReport = {
      id: crypto.randomUUID(),
      type: 'overview',
      dateGenerated: new Date().toISOString(),
      title: `Reporte general ${startDate} a ${endDate}`,
      content: [
        `Pedidos confirmados: ${filteredOrders.length}`,
        `Días operativos: ${activeDays.length}`,
        `Participación: ${participationRate}%`,
        `Usuarios sin pedido: ${missingOrdersData.length}`,
      ].join('\n'),
      filtersUsed: { startDate, endDate },
    };

    await db.saveGeneratedReport(report);
  };

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b dark:border-gray-700 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-primary" /> Reportes y Métricas
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
             Análisis de consumo, participación y usuarios sin pedido.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 px-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-sm font-medium dark:text-gray-300">Rango:</span>
            </div>
            <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-gray-400">-</span>
            <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
                onClick={handleDownload}
                className="ml-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-bold shadow-sm transition-colors"
            >
                <Download size={16} /> Excel Completo
            </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Pedidos (Rango)</p>
            <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{filteredOrders.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Días Operativos</p>
             <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{activeDays.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Tasa Participación</p>
             <div className="flex items-end gap-2">
                <p className={`text-3xl font-black mt-1 ${participationRate < 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {participationRate}%
                </p>
                <span className="text-xs text-gray-400 mb-1">vs Potencial</span>
             </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Usuarios Sin Pedido</p>
             <p className="text-3xl font-black text-amber-500 mt-1">{missingOrdersData.length}</p>
             <p className="text-[10px] text-gray-400">Acumulado por día</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CHART: Orders vs Missing */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-800 dark:text-white mb-6">Comportamiento Diario (Confirmados vs Faltantes)</h3>
            <div className="h-72 w-full min-w-0">
                                <Suspense fallback={<div className="h-full rounded-xl bg-gray-50 dark:bg-gray-700/40 animate-pulse" />}>
                                    <AdminOrdersChart data={chartData} />
                                </Suspense>
            </div>
          </div>

          {/* CHART: Top Dishes */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <h3 className="font-bold text-gray-800 dark:text-white mb-6">Top 5 Platos Fuertes</h3>
             <div className="space-y-4">
                 {topDishes.map((dish, idx) => (
                     <div key={idx} className="relative">
                         <div className="flex justify-between text-sm mb-1">
                             <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">{dish.name}</span>
                             <span className="font-bold text-gray-900 dark:text-white">{dish.count}</span>
                         </div>
                         <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                             <div 
                                className="h-full rounded-full" 
                                style={{ 
                                    width: `${(dish.count / (topDishes[0]?.count || 1)) * 100}%`,
                                    backgroundColor: COLORS[idx % COLORS.length]
                                }} 
                             />
                         </div>
                     </div>
                 ))}
                 {topDishes.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Sin datos en este rango</p>}
             </div>
          </div>
      </div>

      {/* TABLE: Missing Orders Audit */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <AlertCircle size={18} className="text-amber-500" />
                    Auditoría de Pedidos Faltantes
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Lista detallada de usuarios que no registraron pedido en días operativos.
                </p>
              </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                      <tr>
                          <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Fecha</th>
                          <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Usuario</th>
                          <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Rol</th>
                          <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Grado</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {missingOrdersData.length > 0 ? (
                          missingOrdersData.slice(0, 50).map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-3 font-mono text-gray-500">{item.date}</td>
                                  <td className="px-6 py-3 font-medium text-gray-800 dark:text-white">{item.user.name}</td>
                                  <td className="px-6 py-3 text-gray-600 dark:text-gray-400 capitalize">{item.user.role}</td>
                                  <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{item.user.grade || '-'}</td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                  ¡Excelente! Todos los usuarios activos realizaron sus pedidos.
                              </td>
                          </tr>
                      )}
                      {missingOrdersData.length > 50 && (
                          <tr>
                              <td colSpan={4} className="px-6 py-3 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800">
                                  ... y {missingOrdersData.length - 50} más. Descarga el Excel para ver todo.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};