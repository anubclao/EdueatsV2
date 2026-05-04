import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Mail, ArrowRight, Apple, Carrot, Salad } from 'lucide-react';
import { Link } from 'react-router-dom';

/* Floating food decoration bubble */
const FloatingIcon = ({ icon, top, left, size, delay, opacity }: {
  icon: string; top: string; left: string; size: string; delay: string; opacity: string;
}) => (
  <div
    className="absolute select-none pointer-events-none"
    style={{ top, left, fontSize: size, animationDelay: delay, opacity, animation: 'float 6s ease-in-out infinite' }}
  >
    {icon}
  </div>
);

export const Login = () => {
  const { startOtpLogin, verifyOtpLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setHint('');
    setLoading(true);
    try {
      const result = await startOtpLogin(identifier.trim());
      setChallengeId(result.challengeId);
      setHint('Te enviamos un código de 6 dígitos a tu correo electrónico. Revisa también la carpeta de spam.');
      if (result.devOtp) {
        setHint(`Código de prueba (solo desarrollo): ${result.devOtp}`);
      }
    } catch {
      setError('No se pudo iniciar el acceso seguro. Intenta nuevamente en unos segundos.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    setError('');
    setLoading(true);
    try {
      const ok = await verifyOtpLogin(challengeId, otp.trim());
      if (!ok) setError('No pudimos validar el codigo. Intenta otra vez.');
    } catch {
      setError('Codigo invalido o expirado. Solicita uno nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left panel: decorative school cafeteria theme ── */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 60%, #059669 100%)' }}>

        {/* Subtle dot-grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Floating food icons */}
        <FloatingIcon icon="🍎" top="8%"  left="12%" size="2.8rem" delay="0s"   opacity="0.35" />
        <FloatingIcon icon="🥗" top="15%" left="70%" size="3.2rem" delay="1.2s" opacity="0.30" />
        <FloatingIcon icon="🥕" top="30%" left="5%"  size="2.4rem" delay="0.7s" opacity="0.28" />
        <FloatingIcon icon="🍋" top="22%" left="82%" size="2rem"   delay="2s"   opacity="0.32" />
        <FloatingIcon icon="🥦" top="50%" left="88%" size="2.6rem" delay="0.4s" opacity="0.25" />
        <FloatingIcon icon="🍊" top="62%" left="8%"  size="2.2rem" delay="1.8s" opacity="0.30" />
        <FloatingIcon icon="🥙" top="72%" left="75%" size="3rem"   delay="0.9s" opacity="0.28" />
        <FloatingIcon icon="🍌" top="80%" left="20%" size="2rem"   delay="1.5s" opacity="0.25" />
        <FloatingIcon icon="🥛" top="88%" left="58%" size="2.4rem" delay="0.2s" opacity="0.30" />
        <FloatingIcon icon="🍇" top="42%" left="45%" size="2rem"   delay="2.3s" opacity="0.20" />

        {/* Top branding */}
        <div className="relative z-10 p-8 lg:p-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
              <Salad className="text-white" size={28} />
            </div>
            <span className="text-white text-2xl font-extrabold tracking-tight">EduEats</span>
          </div>
          <p className="text-emerald-200 text-sm font-medium">Sistema de Gestión del Comedor Escolar</p>
        </div>

        {/* Center hero text */}
        <div className="relative z-10 px-8 lg:px-12 text-center">
          {/* Tray illustration */}
          <div className="mx-auto mb-8 w-36 h-36 lg:w-44 lg:h-44 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
            <span className="text-6xl lg:text-7xl select-none">🍽️</span>
          </div>
          <h2 className="text-white text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
            Nutrición inteligente<br/>
            <span className="text-emerald-300">para cada estudiante</span>
          </h2>
          <p className="text-emerald-100/80 text-base lg:text-lg max-w-sm mx-auto leading-relaxed">
            Gestiona menús, pedidos y reportes nutricionales desde un solo lugar.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 p-8 lg:p-12">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Apple size={16}/>, label: 'Menús saludables' },
              { icon: <Carrot size={16}/>, label: 'Recetas nutritivas' },
              { icon: <Salad size={16}/>, label: 'Reportes en tiempo real' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15 text-center">
                <div className="text-emerald-300 flex justify-center mb-1">{item.icon}</div>
                <p className="text-white/80 text-[10px] font-medium leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CSS keyframes injected via style tag */}
        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }`}</style>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
        {/* Mobile top accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 md:hidden" />

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Salad className="text-primary" size={24} />
          </div>
          <span className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight">EduEats</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              ¡Bienvenido de vuelta!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              {challengeId ? 'Ingresa el codigo de 6 digitos.' : 'Ingresa tu correo y recibe tu codigo secreto para acceder al portal escolar.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={challengeId ? handleVerifyOtp : handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {challengeId ? 'Codigo OTP' : 'Correo o Codigo Escolar'}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={challengeId ? 'text' : 'text'}
                  required
                  maxLength={challengeId ? 6 : 120}
                  pattern={challengeId ? '\\d{6}' : undefined}
                  placeholder={challengeId ? '123456' : 'estudiante@edueats.com'}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl outline-none dark:bg-gray-800 dark:text-white transition-all text-sm
                    ${error
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50 dark:border-red-500/50'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white'
                    }`}
                  value={challengeId ? otp : identifier}
                  onChange={(e) => {
                    if (challengeId) setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    else setIdentifier(e.target.value);
                    setError('');
                  }}
                />
              </div>
              {hint && !error && (
                <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5">
                  {hint}
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 mt-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <>{challengeId ? 'Validar Codigo' : 'Enviar Codigo Seguro'} <ArrowRight size={16} /></>
              )}
            </button>

            {challengeId && (
              <button
                type="button"
                onClick={() => {
                  setChallengeId(null);
                  setOtp('');
                  setHint('');
                  setError('');
                }}
                className="w-full text-sm font-semibold text-gray-600 dark:text-gray-300 hover:underline"
              >
                Cambiar correo o codigo escolar
              </button>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">¿Primera vez?</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <Link
            to="/register"
            className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary font-semibold py-3 rounded-xl transition-all text-sm"
          >
            Crear mi cuenta
          </Link>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            Portal exclusivo para estudiantes, docentes y personal autorizado.
          </p>
        </div>
      </div>
    </div>
  );
};