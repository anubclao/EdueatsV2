import { useState, FormEvent } from 'react';
import { Role } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Salad, UserPlus, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';

export const Register = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registrationDone, setRegistrationDone] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'student',
    grade: '1',
    section: 'A',
    allergies: ''
  });

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePhone = (phone: string) => {
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Check if it has exactly 10 digits (standard for mobile in many regions like Colombia)
    // If the user includes country code (e.g. 57), we might need to be careful.
    // The prompt says "10 digits", so I'll enforce exactly 10 digits.
    return digits.length === 10;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(formData.email)) {
        setError('El formato del correo electrónico no es válido.');
        return;
    }

    if (!validatePhone(formData.phone)) {
        setError('El número de teléfono debe tener exactamente 10 dígitos.');
        return;
    }

    setIsSubmitting(true);
    
    const newUser: User = {
      id: crypto.randomUUID(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role as Role,
      grade: formData.role === 'student' ? Number(formData.grade) : undefined,
      section: formData.role === 'student' ? formData.section : undefined,
      allergies: formData.allergies,
      emailVerified: false
    };

    try {
      const result = await db.registerUser(newUser);
      if (result.success) {
        setRegisteredName(newUser.name);
        setRegistrationDone(true);
      } else {
        setError("¡El usuario ya existe! No puedes registrarte nuevamente con este correo.");
      }
    } catch {
      setError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Vista de éxito: cuenta creada, pendiente de autorizacion admin ---
  if (registrationDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4 dark:from-gray-900 dark:to-gray-800 animate-in fade-in duration-500">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="text-green-600 dark:text-green-400" size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">¡Solicitud enviada!</h2>
          
          <p className="text-gray-600 dark:text-gray-300">
            Hola, <strong>{registeredName}</strong>. Tu registro fue recibido correctamente y ahora esta pendiente de autorizacion por parte del administrador del colegio.
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
            Cuando te autoricen, inicia sesion con tu correo y recibirás un codigo de 6 digitos en ese mismo correo.
          </div>

          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-primary hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
          >
            Ir al inicio de sesion <ArrowRight size={20} />
          </button>

          <p className="text-xs text-gray-400 mt-4">
            No necesitas activar por enlace; solo esperar autorizacion.
          </p>
        </div>
      </div>
    );
  }

  // --- Formulario de Registro ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-3 sm:p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-5 sm:p-8 space-y-4 sm:space-y-6 my-4">
        <div className="text-center">
          <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Salad className="text-primary" size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Crear Cuenta</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Únete a EduEats para gestionar tu alimentación</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo <span className="text-red-500">*</span></label>
            <input 
              required
              type="text"
              className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico <span className="text-red-500">*</span></label>
            <input 
              required
              type="email"
              className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.email}
              onChange={e => {
                  setFormData({...formData, email: e.target.value});
                  setError('');
              }}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono / WhatsApp <span className="text-red-500">*</span></label>
            <input 
              required
              type="tel"
              placeholder="Ej: 3001234567"
              className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-gray-400 mt-1">Ingresa los 10 dígitos de tu celular</p>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol <span className="text-red-500">*</span></label>
              <select 
                required
                className="w-full mt-1 border rounded-lg p-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                disabled={isSubmitting}
              >
                <option value="student">Estudiante</option>
                <option value="teacher">Profesor</option>
                <option value="staff">Personal Administrativo</option>
                <option value="visitor">Visitante</option>
              </select>
          </div>

          {/* Logic: Only show Grade/Section if role is Student */}
          {formData.role === 'student' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grado <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full mt-1 border rounded-lg p-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.grade}
                  onChange={e => setFormData({...formData, grade: e.target.value})}
                  disabled={isSubmitting}
                >
                  <optgroup label="Primaria">
                    {[1,2,3,4,5].map(g => <option key={g} value={g}>{g}°</option>)}
                  </optgroup>
                  <optgroup label="Bachillerato">
                    {[6,7,8,9,10,11].map(g => <option key={g} value={g}>{g}°</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sección <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full mt-1 border rounded-lg p-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.section}
                  onChange={e => setFormData({...formData, section: e.target.value})}
                  disabled={isSubmitting}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="Unica">Única</option>
                </select>
              </div>
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alergias u Observaciones</label>
             <textarea 
               rows={2}
               className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               placeholder="Ej: Alérgico al maní, intolerante a la lactosa..."
               value={formData.allergies}
               onChange={e => setFormData({...formData, allergies: e.target.value})}
               disabled={isSubmitting}
             />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Registrando...
              </>
            ) : (
              <>
                <UserPlus size={20} /> Crear Cuenta
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-primary hover:underline text-sm font-medium">
            ¿Ya tienes cuenta? Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};