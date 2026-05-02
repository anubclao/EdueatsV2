import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Salad, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Login = () => {
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleStandardLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (await loginWithEmail(email)) {
      // AuthContext/Router handles redirect based on role
    } else {
      setError("No encontramos una cuenta con este correo. Verifica o regístrate.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Salad className="text-primary" size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Bienvenido a EduEats</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Inicia sesión en tu portal</p>
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