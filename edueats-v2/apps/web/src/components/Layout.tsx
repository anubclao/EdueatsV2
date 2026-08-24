import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, CalendarDays, ChefHat, Salad, Moon, Sun, Users, Tags, Shield, Menu, X, CalendarRange, FileBarChart, Megaphone, MessageSquare, HeartHandshake, Settings, History, Bot, GitBranch } from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';
interface NavItemProps {
  to: string;
  icon?: React.ElementType;
  label: string;
  isSubItem?: boolean;
}

const NavItem = ({ to, icon: Icon, label, isSubItem = false }: NavItemProps) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`
        flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-200 group relative overflow-hidden
        ${active 
          ? "bg-primary text-white shadow-lg shadow-primary/25 translate-x-1" 
          : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary hover:shadow-sm"
        }
        ${isSubItem ? "text-sm py-2" : "py-3"}
      `}
    >
      {Icon && (
        <Icon 
          size={isSubItem ? 16 : 20} 
          className={`
            transition-colors duration-200 flex-shrink-0
            ${active ? "text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-primary"}
          `} 
        />
      )}
      <span className="font-medium z-10">{label}</span>
      
      {/* Active Indicator Dot */}
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />}
    </Link>
  );
};

interface CollapsibleNavItemProps {
  icon: React.ElementType;
  label: string;
  baseRoute: string;
  children: ReactNode;
}

const CollapsibleNavItem = ({ icon: Icon, label, baseRoute, children }: CollapsibleNavItemProps) => {
  const location = useLocation();
  const isActiveParent = location.pathname.startsWith(baseRoute);
  const [isOpen, setIsOpen] = useState(isActiveParent);

  useEffect(() => {
    setIsOpen(isActiveParent);
  }, [isActiveParent]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden w-full text-left
          ${isActiveParent 
            ? "bg-primary text-white shadow-lg shadow-primary/25 translate-x-1" 
            : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary hover:shadow-sm"
          }
        `}
      >
        {Icon && (
          <Icon 
            size={20} 
            className={`
              transition-colors duration-200 flex-shrink-0
              ${isActiveParent ? "text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-primary"}
            `} 
          />
        )}
        <span className="font-medium z-10">{label}</span>
        {isActiveParent && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />}
      </button>
      {isOpen && (
        <div className="pl-8 pt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

export const Layout = ({ children }: { children?: ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check system preference or local storage
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setDarkMode(true);
    }
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">{children}</div>;
  }

  const roleLabel = user.role === 'admin' 
    ? 'Administración' 
    : user.role === 'student' 
      ? `Estudiante • Grado ${user.grade}°` 
      : 'Visitante';

  // Mapa de rutas a nombres de página para el header móvil
  const pageNames: Record<string, string> = {
    '/admin/dashboard': 'Panel Principal',
    '/admin/recipes': 'Recetas',
    '/admin/menu': 'Planificador de Menú',
    '/admin/notifications': 'Notificaciones',
    '/admin/surveys': 'Encuestas y PQR',
    '/admin/reports/overview': 'Reportes Generales',
    '/admin/reports/kpi': 'Métricas KPI',
    '/admin/reports/history': 'Historial de Reportes',
    '/admin/categories': 'Categorías',
    '/admin/category-conditions': 'Condiciones',
    '/admin/users': 'Usuarios',
    '/admin/roles': 'Roles y Permisos',
    '/admin/global-variables': 'Variables Globales',
    '/admin/assistant': 'Asistente EduEats',
    '/student/dashboard': 'Mi Semana',
    '/student/survey': 'Calificar Servicio',
    '/student/assistant': 'Asistente EduEats',
  };
  const currentPageName = pageNames[location.pathname] ?? 'EduEats';

  const NavigationLinks = () => (
    <div className="space-y-1">
      {user.role === 'admin' ? (
        <>
          <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Gestión
          </div>
          <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Panel Principal" />
          <NavItem to="/admin/recipes" icon={ChefHat} label="Recetas" />
          <NavItem to="/admin/menu" icon={CalendarRange} label="Planificador de Menú" />
          <NavItem to="/admin/notifications" icon={Megaphone} label="Notificaciones" />
          <NavItem to="/admin/surveys" icon={MessageSquare} label="Encuestas y PQR" />
          {/* Asistente EduEats desactivado temporalmente (evento en vivo 2026-08-24).
              Lo dejamos comentado para rehabilitar facilmente post-evento. */}
          {/* <NavItem to="/admin/assistant" icon={Bot} label="Asistente EduEats" /> */}
          <CollapsibleNavItem icon={FileBarChart} label="Reportes" baseRoute="/admin/reports">
            <NavItem to="/admin/reports/overview" label="Reportes Generales" isSubItem />
            <NavItem to="/admin/reports/kpi" label="Métricas KPI" isSubItem />
            <NavItem to="/admin/reports/history" icon={History} label="Historial de Reportes" isSubItem />
          </CollapsibleNavItem>
          
          <div className="px-4 py-2 mt-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Sistema
          </div>
          <NavItem to="/admin/categories" icon={Tags} label="Categorías" />
          <NavItem to="/admin/category-conditions" icon={GitBranch} label="Condiciones" />
          <NavItem to="/admin/users" icon={Users} label="Usuarios" />
          <NavItem to="/admin/roles" icon={Shield} label="Roles y Permisos" />
          <NavItem to="/admin/global-variables" icon={Settings} label="Variables Globales" />
        </>
      ) : (
        <>
          <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Menú
          </div>
          <NavItem to="/student/dashboard" icon={CalendarDays} label="Mi Semana" />
          <NavItem to="/student/survey" icon={HeartHandshake} label="Calificar Servicio" />
          {/* Asistente EduEats desactivado temporalmente (evento en vivo 2026-08-24). */}
          {/* <NavItem to="/student/assistant" icon={Bot} label="Asistente EduEats" /> */}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col transition-colors duration-200 flex-shrink-0 z-20">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Salad className="text-primary" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">EduEats</h1>
          </div>
          
          <div className="flex flex-col space-y-1 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className="font-bold text-gray-800 dark:text-white truncate text-sm">{user.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</span>
            <span className="text-[10px] font-bold text-primary dark:text-emerald-400 uppercase tracking-wider pt-1">{roleLabel}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <NavigationLinks />
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">
          <button 
            onClick={toggleDarkMode}
            className="flex items-center space-x-3 px-4 py-3 w-full text-left text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm hover:shadow"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium text-sm">{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 w-72 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <Salad className="text-primary" size={20} />
                </div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white">EduEats</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-3 mb-1">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {user.name.charAt(0)}
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <p className="font-bold text-gray-800 dark:text-white truncate text-sm">{user.name}</p>
                   <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                 </div>
               </div>
               <p className="text-xs text-primary dark:text-emerald-400 font-bold uppercase mt-2 pl-13 ml-13">{roleLabel}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <NavigationLinks />
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={logout} className="flex items-center space-x-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <LogOut size={20} />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 md:hidden px-3 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm">
           <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg flex-shrink-0">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <Salad className="text-primary flex-shrink-0" size={20} />
              <span className="font-bold text-gray-800 dark:text-white text-sm truncate">{currentPageName}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
             <button onClick={toggleDarkMode} className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>
          </div>
        </header>
        <div className="flex-1 p-3 sm:p-5 md:p-8 max-w-7xl mx-auto w-full pb-safe overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};