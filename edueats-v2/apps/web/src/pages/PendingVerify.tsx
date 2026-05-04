import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert } from 'lucide-react';

export const PendingVerify = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
        
        <div className="bg-amber-100 dark:bg-amber-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto relative mb-2">
          <ShieldAlert className="text-amber-600 dark:text-amber-400" size={48} />
          <div className="absolute bottom-0 right-0 bg-red-500 rounded-full p-2 border-4 border-white dark:border-gray-800 shadow-sm">
             <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Activación Pendiente</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Hola <strong>{user?.name}</strong>, tu cuenta ha sido creada pero aún no está activa.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>Para garantizar la seguridad, tu cuenta requiere validacion de correo por enlace.</p>
          <p>Si no encuentras el correo, solicita reenvio desde la pagina de verificacion.</p>
        </div>

        <div className="space-y-4 pt-2">
            <button 
                onClick={logout}
                className="flex items-center justify-center w-full gap-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 py-2 rounded-lg transition-colors font-medium"
            >
                <LogOut size={18} /> Cerrar Sesión
            </button>
        </div>
      </div>
    </div>
  );
};