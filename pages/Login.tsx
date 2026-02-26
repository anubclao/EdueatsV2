import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Salad, UserCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Login = () => {
  const { login, loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleStandardLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (loginWithEmail(email)) {
      // AuthContext/Router handles redirect based on role
    } else {
      setError("No encontramos una cuenta con este correo. Verifica o regístrate.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 space-y-8">
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Salad className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bienvenido a EduEats</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Inicia sesión en tu portal</p>
        </div>

        {/* Standard Login */}
        <form onSubmit={handleStandardLogin} className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
             <input 
              type="email" 
              required
              placeholder="estudiante@edueats.com"
              className={`w-full border rounded-lg p-3 outline-none dark:bg-gray-700 dark:text-white transition-all
                ${error 
                  ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50 dark:border-red-500/50' 
                  : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/50'
                }`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
             />
             {error && (
               <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm animate-in slide-in-from-top-1">
                 <AlertCircle size={16} />
                 <span>{error}</span>
               </div>
             )}
          </div>
          <button type="submit" className="w-full bg-gray-900 dark:bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">
            Iniciar Sesión
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-gray-700"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">O prueba cuentas Demo</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => login('admin')}
            className="flex flex-col items-center p-3 border hover:border-blue-300 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800 rounded-xl transition-all"
          >
            <ShieldCheck className="text-blue-600 dark:text-blue-400 mb-1" size={24} />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Demo Admin</span>
          </button>

          <button
            onClick={() => login('student', 5)}
            className="flex flex-col items-center p-3 border hover:border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800 rounded-xl transition-all"
          >
            <UserCircle className="text-emerald-600 dark:text-emerald-400 mb-1" size={24} />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Demo Estudiante</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};