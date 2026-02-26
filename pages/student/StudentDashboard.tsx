import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { geminiService } from '../../services/gemini';
import { Order, Recipe, RecurringPreference, SystemNotification, UnconfirmedMenuReportItem } from '../../types';
import * as XLSX from 'xlsx';
import { CheckCircle, Circle, ChevronRight, History, Calendar, Clock, X, User as UserIcon, Mail, Shield, Star, Trash2, AlertTriangle, Sparkles, PartyPopper, Activity, Brain, Loader2, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [schoolName, setSchoolName] = useState('Cargando...');
  
  // Default tab logic: Check URL query params
  const [activeTab, setActiveTab] = useState<'planner' | 'history' | 'unconfirmed-orders' | 'favorites' | 'nutrition' | 'reports'>('planner');
  
  // Reminder State
  const [showReminder, setShowReminder] = useState(false);
  const [tomorrowDate, setTomorrowDate] = useState('');
  
  // Available dates with menus
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // Favorites
  const [preferences, setPreferences] = useState<RecurringPreference[]>([]);

  // Notifications
  const [activeNotifications, setActiveNotifications] = useState<SystemNotification[]>([]);
  const [dismissedNoteIds, setDismissedNoteIds] = useState<string[]>([]);

  // Nutrition Date Range
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to last 30 days
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // AI Advice State
  const [aiAdvice, setAiAdvice] = useState<{ title: string; text: string; score: number } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Helper for local date YYYY-MM-DD
  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateStr();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'history') {
      setActiveTab('history');
    }

    const userOrders = db.getOrders().filter(o => o.studentId === user?.id);
    setOrders(userOrders);
    setRecipes(db.getRecipes());
    if (user) {
        setPreferences(db.getPreferences(user.id));
    }
    
    // Fetch global variables
    const globalVars = db.getGlobalVariables();
    const schoolVar = globalVars.find(v => v.id === 'schoolName');
    if (schoolVar) {
      setSchoolName(schoolVar.value);
    }

    const validDates = getPublishedMenuDates();
    setAvailableDates(validDates);

    const storedDismissed = JSON.parse(localStorage.getItem('edueats_dismissed_notes') || '[]');
    setDismissedNoteIds(storedDismissed);

    const allNotes = db.getNotifications();
    const relevantNotes = allNotes.filter(n => {
       const isFutureOrToday = n.date >= todayStr;
       const isRoleMatch = n.targetRole === 'all' || n.targetRole === user?.role;
       const isNotDismissed = !storedDismissed.includes(n.id);
       return isFutureOrToday && isRoleMatch && isNotDismissed;
    });
    setActiveNotifications(relevantNotes);

    const d = new Date();
    d.setDate(d.getDate() + 1); 
    const tStr = d.toISOString().split('T')[0];
    setTomorrowDate(tStr);

    const isDismissed = localStorage.getItem(`edueats_dismiss_reminder_${tStr}`);
    const menuExistsForTomorrow = db.getDailyMenu(tStr);

    if (!isDismissed && menuExistsForTomorrow?.isPublished) {
      const hasOrderForTomorrow = userOrders.some(o => o.date === tStr && o.status === 'confirmed');
      if (!hasOrderForTomorrow) {
        setShowReminder(true);
      }
    }

  }, [user, location.search, orders.length]);

  // Reset AI advice when date range changes
  useEffect(() => {
    setAiAdvice(null);
  }, [reportStartDate, reportEndDate]);

  const dismissReminder = () => {
    localStorage.setItem(`edueats_dismiss_reminder_${tomorrowDate}`, 'true');
    setShowReminder(false);
  };

  const dismissNotification = (id: string) => {
      const newDismissed = [...dismissedNoteIds, id];
      setDismissedNoteIds(newDismissed);
      localStorage.setItem('edueats_dismissed_notes', JSON.stringify(newDismissed));
      setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getPublishedMenuDates = () => {
    const allMenus = db.getAllMenus();
    const relevantMenus = allMenus.filter(menu => 
      menu.isPublished === true && menu.date >= todayStr
    );
    return relevantMenus
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => m.date);
  };

  const getOrderStatus = (date: string) => {
    const order = orders.find(o => o.date === date);
    if (order) return 'confirmed';
    return 'pending';
  };

  const getRecipeName = (id: string) => recipes.find(r => r.id === id)?.name || 'Opción seleccionada';

  const deletePreference = (dayOfWeek: number) => {
    if (confirm('¿Deseas eliminar este menú favorito?')) {
        if (user) {
            db.deletePreference(user.id, dayOfWeek);
            setPreferences(db.getPreferences(user.id));
        }
    }
  };

  const historyOrders = orders
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getRoleDisplay = (role: string) => {
     switch(role) {
         case 'student': return 'Estudiante';
         case 'admin': return 'Administrador';
         default: return 'Usuario';
     }
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex];
  };

  // --- STATS CALCULATION (Local) ---
  const statsData = useMemo(() => {
    if (!orders.length || !recipes.length) return null;

    const rangeOrders = orders.filter(o => 
        o.date >= reportStartDate && 
        o.date <= reportEndDate && 
        o.status === 'confirmed'
    ).sort((a, b) => a.date.localeCompare(b.date));

    const dailyStats = rangeOrders.map(order => {
        let totalCals = 0;
        let itemsCount = 0;
        const itemsDetail: string[] = [];

        order.items.forEach(item => {
            const r = recipes.find(rec => rec.id === item.recipeId);
            if (r) {
                totalCals += r.calories;
                itemsCount++;
                itemsDetail.push(r.category);
            }
        });

        return {
            date: order.date,
            day: new Date(order.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            calories: totalCals,
            itemsCount,
            itemsDetail
        };
    });

    const avgCalories = dailyStats.reduce((acc, curr) => acc + curr.calories, 0) / (dailyStats.length || 1);

    return {
        chartData: dailyStats,
        avgCalories: Math.round(avgCalories),
        daysCount: dailyStats.length
    };
  }, [orders, recipes, reportStartDate, reportEndDate]);

  // --- HANDLER: Trigger Gemini Analysis ---
  const handleGenerateAiReport = async () => {
    if (!statsData || statsData.daysCount === 0) return;
    
    setIsLoadingAi(true);
    try {
        const advice = await geminiService.getNutritionalAdvice(statsData.chartData);
        setAiAdvice(advice);
    } catch (error) {
        console.error(error);
        alert("Error al conectar con Gemini AI.");
    } finally {
        setIsLoadingAi(false);
    }
  };

  const handleDownloadReport = () => {
    if (!user) return;

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date + 'T00:00:00');
      const start = new Date(reportStartDate + 'T00:00:00');
      const end = new Date(reportEndDate + 'T00:00:00');
      return orderDate >= start && orderDate <= end;
    });

    if (filteredOrders.length === 0) {
      alert('No se encontraron pedidos en el rango de fechas seleccionado.');
      return;
    }

    const reportData = filteredOrders.map(order => {
      const items = order.items.map(item => getRecipeName(item.recipeId)).join(', ');
      return {
        'Fecha del Pedido': order.date,
        'Estado': order.status === 'confirmed' ? 'Confirmado' : 'Pendiente',
        'Items Pedidos': items
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Pedidos');
    XLSX.writeFile(wb, `Reporte_Pedidos_${user.name}_${reportStartDate}_a_${reportEndDate}.xlsx`);
  };

  const getNotificationStyles = (type: string) => {
      switch(type) {
          case 'alert':
              return {
                  wrapper: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/40 dark:to-orange-900/20 border-red-200 dark:border-red-800',
                  iconBg: 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200',
                  title: 'text-red-900 dark:text-red-100',
                  text: 'text-red-800 dark:text-red-200',
                  icon: AlertTriangle
              };
          case 'success':
              return {
                  wrapper: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/20 border-green-200 dark:border-green-800',
                  iconBg: 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200',
                  title: 'text-green-900 dark:text-green-100',
                  text: 'text-green-800 dark:text-green-200',
                  icon: PartyPopper
              };
          default: 
              return {
                  wrapper: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800',
                  iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200',
                  title: 'text-blue-900 dark:text-blue-100',
                  text: 'text-blue-800 dark:text-blue-200',
                  icon: Sparkles
              };
      }
  };

  const getRecipeCategoryDisplay = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return 'Categoría';
    const category = db.getCategories().find(c => c.id === recipe.category);
    return category?.name || 'Categoría';
  };

  const unconfirmedOrdersReport: UnconfirmedMenuReportItem[] = useMemo(() => {
    const allMenus = db.getAllMenus();
    const userOrders = db.getOrders().filter(o => o.studentId === user?.id);

    // Filter published menus from past dates
    const pastPublishedMenus = allMenus.filter(menu => 
        menu.isPublished && menu.date < todayStr
    );

    // Filter out menus for which the user *did* place an order
    const unconfirmed = pastPublishedMenus.filter(menu => {
        const hasOrder = userOrders.some(order => order.date === menu.date && order.status === 'confirmed');
        return !hasOrder;
    });

    return unconfirmed.map(menu => ({
      id: menu.date, // Using date as ID for simplicity in this report
      date: menu.date,
      recipes: menu.items.map(item => item.recipeId),
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, user, todayStr]);

  return (
    <div className="space-y-6">
      
      {/* User Profile Header */}
      {user && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="bg-gradient-to-br from-primary to-emerald-600 p-0.5 rounded-full shadow-md">
                <div className="bg-white dark:bg-gray-800 p-2 rounded-full">
                   <UserIcon size={32} className="text-primary" />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {user.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                        <Mail size={14} />
                        <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs uppercase tracking-wide">
                        <Shield size={12} />
                        <span>{getRoleDisplay(user.role)}</span>
                    </div>
                    {schoolName && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs uppercase tracking-wide">
                            <span>{schoolName}</span>
                        </div>
                    )}
                     {user.grade && (
                        <div className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-xs">
                            Grado {user.grade}°
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Reminder Banner */}
      {showReminder && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start justify-between gap-4 animate-in slide-in-from-top-2 shadow-sm">
            <div className="flex gap-3">
                <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-full h-fit text-amber-700 dark:text-amber-200">
                   <Clock size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-100">¡No olvides tu almuerzo!</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        Aún no has realizado tu pedido para mañana (<strong>{tomorrowDate}</strong>).
                        Las órdenes cierran a medianoche.
                    </p>
                    <div className="mt-2">
                        <Link to={`/student/order/${tomorrowDate}`} className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors inline-flex items-center gap-1">
                            Ordenar Ahora <ChevronRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>
            <button onClick={dismissReminder} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
                <X size={20} />
            </button>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeNotifications.length > 0 && (
          <div className="grid gap-4 animate-in slide-in-from-top-4 duration-500">
             {activeNotifications.map(note => {
                const style = getNotificationStyles(note.type);
                const Icon = style.icon;
                
                return (
                  <div key={note.id} className={`relative overflow-hidden rounded-2xl border p-1 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md ${style.wrapper}`}>
                      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/40 dark:bg-white/5 blur-2xl"></div>
                      <div className="flex items-start gap-4 p-4 relative z-10">
                          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${style.iconBg}`}>
                             <Icon size={20} />
                          </div>
                          <div className="flex-1 pt-0.5">
                             <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/50 dark:bg-black/20 ${style.title}`}>
                                        {note.type === 'alert' ? 'Importante' : note.type === 'success' ? 'Novedad' : 'Información'}
                                    </span>
                                    <span className="text-[10px] opacity-60 flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                                        <Calendar size={10} /> {note.date}
                                    </span>
                                </div>
                             </div>
                             <p className={`text-sm md:text-base font-medium leading-relaxed ${style.text}`}>
                                {note.message}
                             </p>
                          </div>
                          <button onClick={() => dismissNotification(note.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Descartar">
                             <X size={18} />
                          </button>
                      </div>
                  </div>
                );
             })}
          </div>
      )}

      {/* AI NUTRITION SUMMARY SECTION (NEW) */}
      {statsData && statsData.daysCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* AI Advice Snapshot */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Brain size={200} />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Sparkles size={24} className="text-yellow-300" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Resumen Nutricional IA</h3>
                </div>
                {aiAdvice && (
                  <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12} /> Score: {aiAdvice.score}/100
                  </div>
                )}
              </div>

              {aiAdvice ? (
                <div className="flex-1 flex flex-col justify-center">
                  <h4 className="text-lg font-bold text-white/90 mb-2">{aiAdvice.title}</h4>
                  <p className="text-white/80 text-sm md:text-base leading-relaxed italic">
                    &quot;{aiAdvice.text}&quot;
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-4">
                  <p className="text-white/70 text-sm max-w-md">
                    Analiza tus últimos {statsData.daysCount} días de consumo para recibir consejos personalizados de nuestro experto virtual.
                  </p>
                  <button 
                    onClick={handleGenerateAiReport}
                    disabled={isLoadingAi}
                    className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-2.5 rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoadingAi ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
                    {isLoadingAi ? 'Analizando...' : 'Generar Informe IA'}
                  </button>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-60">
                <span>Basado en {statsData.daysCount} pedidos recientes</span>
                <button onClick={() => setActiveTab('nutrition')} className="hover:text-white transition-colors flex items-center gap-1">
                  Ver detalles <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* Caloric Chart Snapshot */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Activity className="text-primary" size={18} /> Calorías
              </h4>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Promedio</p>
                <p className="text-lg font-black text-gray-800 dark:text-white leading-none">{statsData.avgCalories} <span className="text-[10px] font-normal text-gray-500">kcal</span></p>
              </div>
            </div>
            <div className="flex-1 min-h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.chartData}>
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                    {statsData.chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.calories > 1000 ? '#F59E0B' : entry.calories < 400 ? '#EF4444' : '#10B981'} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-xl border border-gray-100 dark:border-gray-600 text-[10px] font-bold">
                            <p className="text-gray-500 dark:text-gray-400">{payload[0].payload.day}</p>
                            <p className="text-primary">{payload[0].value} kcal</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-4 font-medium">
              Tendencia de los últimos {statsData.daysCount} días
            </p>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b dark:border-gray-700 pb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Mi Plan de Comidas</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {activeTab === 'planner' ? 'Menús disponibles para ordenar' : 
             activeTab === 'history' ? 'Tus pedidos confirmados' : 
             activeTab === 'unconfirmed-orders' ? 'Menús pasados sin pedido' : 
             activeTab === 'nutrition' ? 'Análisis de Inteligencia Artificial' : 
             'Tus días con menú automático'}
          </p>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex space-x-1 overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'planner' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><Calendar size={16} /> Planificador</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><History size={16} /> Historial</button>
          <button onClick={() => setActiveTab('unconfirmed-orders')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'unconfirmed-orders' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><AlertTriangle size={16} /> Pedidos No Confirmados</button>
          <button onClick={() => setActiveTab('nutrition')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'nutrition' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><Sparkles size={16} /> Nutrición IA</button>
          <button onClick={() => setActiveTab('favorites')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'favorites' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><Star size={16} /> Favoritos</button>
          <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'reports' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><FileDown size={16} /> Reportes</button>
        </div>
      </div>

      {/* TAB CONTENT: PLANNER */}
      {activeTab === 'planner' && (
        <>
        {availableDates.length === 0 ? (
           <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
             <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
               <Calendar size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-800 dark:text-white">No hay menús disponibles</h3>
             <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2">
               El administrador aún no ha publicado menús para los próximos días. Revisa más tarde.
             </p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDates
              .filter(date => getOrderStatus(date) !== 'confirmed')
              .map((date) => {
              const status = getOrderStatus(date);
              const dateObj = new Date(date + 'T00:00:00'); 
              const dayNameRaw = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
              const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
              const displayDate = dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
              const isToday = date === todayStr;

              let cardClasses = status === 'confirmed' ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-primary/50 hover:shadow-md cursor-pointer";
              const StatusIcon = status === 'confirmed' ? CheckCircle : Circle;

              if (isToday) {
                  if (status === 'confirmed') cardClasses += " ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900";
                  else cardClasses += " shadow-lg shadow-blue-100 dark:shadow-none ring-1 ring-blue-500 dark:ring-blue-500 scale-[1.02]";
              }

              return (
                <Link to={`/student/order/${date}`} key={date} className={`group relative p-6 rounded-xl border-2 transition-all ${cardClasses}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {dayName}
                        {isToday && <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm animate-pulse"><Star size={10} className="fill-white" /> Hoy</span>}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 font-medium capitalize">{displayDate}</p>
                    </div>
                    <StatusIcon className={status === 'confirmed' ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"} size={24} />
                  </div>
                  <div className="flex items-center text-sm font-medium">
                    {status === 'confirmed' ? (
                      <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle size={14} /> Pedido Realizado</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 px-2 py-1 rounded-md flex items-center gap-1"><Clock size={14} /> Ordenar ahora</span>
                    )}
                  </div>
                  <ChevronRight className="absolute right-4 bottom-4 text-gray-300 dark:text-gray-600 transition-colors" size={20} />
                </Link>
              );
            })}
          </div>
        )}
        </>
      )}

      {/* TAB CONTENT: HISTORY (Unchanged) */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {historyOrders.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {historyOrders.map((order) => {
                const dateObj = new Date(order.date + 'T00:00:00');
                const fullDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const isFuture = order.date >= todayStr;
                return (
                  <div key={order.id} className={`p-6 transition-colors ${isFuture ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white capitalize flex items-center gap-2">
                           {fullDate}
                           {isFuture && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Próximo</span>}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">ID: {order.id.slice(0,8)}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle size={12} /> Confirmado</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {order.items.map((item) => (
                        <div key={item.recipeId} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                            {item.category === 'starter' ? 'Entrada' : item.category === 'main' ? 'Plato Fuerte' : item.category === 'dessert' ? 'Postre' : 'Refrigerio'}
                          </p>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1" title={getRecipeName(item.recipeId)}>
                            {getRecipeName(item.recipeId)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No tienes pedidos en el historial.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: UNCONFIRMED ORDERS */} 
      {activeTab === 'unconfirmed-orders' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {unconfirmedOrdersReport.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {unconfirmedOrdersReport.map((menu) => {
                const dateObj = new Date(menu.date + 'T00:00:00');
                const fullDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                return (
                  <div key={menu.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white capitalize flex items-center gap-2">
                           {fullDate}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Menú ID: {menu.id.slice(0,8)}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><AlertTriangle size={12} /> No Confirmado</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {menu.recipes.map((recipeId) => (
                        <div key={recipeId} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                            {getRecipeCategoryDisplay(recipeId)}
                          </p>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1" title={getRecipeName(recipeId)}>
                            {getRecipeName(recipeId)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">¡Excelente! No tienes menús pasados sin confirmar.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: NUTRITION IA */}
      {activeTab === 'nutrition' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold text-sm">
                    <Calendar size={18} className="text-primary" /> Analizar intervalo:
                </div>
                <input 
                    type="date" 
                    value={reportStartDate} 
                    onChange={e => setReportStartDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="text-gray-400">-</span>
                <input 
                    type="date" 
                    value={reportEndDate} 
                    onChange={e => setReportEndDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            {statsData && statsData.daysCount > 0 ? (
                <>
                  {/* AI Advice Card */}
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden transition-all">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Brain size={120} />
                      </div>
                      <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                      <Sparkles size={24} className="text-yellow-300" />
                                  </div>
                                  <h3 className="text-xl font-bold">Evaluación Nutricional Gemini</h3>
                              </div>
                              
                              {/* Trigger AI Button */}
                              {!aiAdvice && (
                                  <button 
                                    onClick={handleGenerateAiReport}
                                    disabled={isLoadingAi}
                                    className="bg-white text-indigo-700 hover:bg-gray-100 px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                                  >
                                    {isLoadingAi ? <Loader2 className="animate-spin" /> : <Brain size={16} />}
                                    {isLoadingAi ? 'Analizando...' : 'Generar Informe con IA'}
                                  </button>
                              )}
                          </div>
                          
                          {aiAdvice ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                                  <div className="md:col-span-2">
                                      <h4 className="font-bold text-lg mb-2 text-white/90 flex items-center gap-2">
                                         {aiAdvice.title}
                                      </h4>
                                      <p className="text-white/80 leading-relaxed text-sm md:text-base">
                                          &quot;{aiAdvice.text}&quot;
                                      </p>
                                  </div>
                                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col items-center justify-center border border-white/10">
                                      <div className="text-3xl font-black">{aiAdvice.score}/100</div>
                                      <div className="text-xs uppercase tracking-widest opacity-70 mt-1">Puntaje Saludable</div>
                                  </div>
                              </div>
                          ) : (
                              <p className="text-white/70 text-sm">
                                  Haz clic en el botón para que Gemini analice tus {statsData.daysCount} días de pedidos y te de recomendaciones personalizadas.
                              </p>
                          )}
                      </div>
                  </div>

                  {/* Charts & Stats Grid (Local Data) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Main Chart */}
                      <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                          <h4 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                              <Activity className="text-primary" size={20} /> Consumo Calórico Diario
                          </h4>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                    <ReferenceLine y={800} stroke="orange" strokeDasharray="3 3" label={{ value: 'Rec. Max', position: 'insideTopRight', fill: 'orange', fontSize: 10 }} />
                                    <Bar dataKey="calories" name="Calorías" radius={[6, 6, 0, 0]} barSize={40}>
                                        {statsData.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.calories > 1000 ? '#F59E0B' : entry.calories < 400 ? '#EF4444' : '#10B981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Stats Column */}
                      <div className="space-y-4">
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Promedio Diario</p>
                              <div className="flex items-end gap-2 mt-1">
                                  <span className="text-3xl font-black text-gray-800 dark:text-white">{statsData.avgCalories}</span>
                                  <span className="text-sm font-medium text-gray-500 mb-1">kcal</span>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Días Analizados</p>
                              <div className="flex items-end gap-2 mt-1">
                                  <span className="text-3xl font-black text-primary">{statsData.daysCount}</span>
                                  <span className="text-sm font-medium text-gray-500 mb-1">días</span>
                              </div>
                          </div>
                      </div>
                  </div>
                </>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Brain className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Datos Insuficientes</h3>
                    <p className="text-gray-400 mt-2">Realiza pedidos en este rango de fechas para generar tu reporte IA.</p>
                </div>
            )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200 flex gap-3">
                <Star className="shrink-0" size={20} />
                <p>Cuando guardas un menú como favorito para un día (ej. Lunes), el sistema intentará seleccionarlo automáticamente la próxima vez que ordenes para ese día de la semana.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {preferences.length > 0 ? preferences.map((pref) => (
                    <div key={pref.dayOfWeek} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">{getDayName(pref.dayOfWeek)} <Star className="fill-yellow-400 text-yellow-400" size={16} /></h3>
                            <button onClick={() => deletePreference(pref.dayOfWeek)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div className="space-y-2">
                            {pref.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="w-2 h-2 rounded-full bg-primary/50"></span><span>{getRecipeName(item.recipeId)}</span></div>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        <Star size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No tienes menús favoritos guardados.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* TAB CONTENT: REPORTS (NEW) */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold text-sm">
                    <Calendar size={18} className="text-primary" /> Generar reporte de pedidos:
                </div>
                <input 
                    type="date" 
                    value={reportStartDate} 
                    onChange={e => setReportStartDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="text-gray-400">-</span>
                <input 
                    type="date" 
                    value={reportEndDate} 
                    onChange={e => setReportEndDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button 
                    onClick={handleDownloadReport}
                    className="bg-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
                >
                    <FileDown size={18} /> Descargar Excel
                </button>
            </div>

            {/* Report Preview/Summary (Optional) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm text-center text-gray-500 dark:text-gray-400">
                <p>Selecciona un rango de fechas y haz clic en &apos;Descargar Excel&apos; para generar tu reporte.</p>
            </div>
        </div>
      )}
    </div>
  );
};