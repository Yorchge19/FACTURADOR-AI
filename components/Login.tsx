import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, validatePassword } from '../contexts/AuthContext';
import { rateLimiter } from '../services/rateLimiter';
import {
  Lock, Mail, Loader2, AlertCircle, LogIn, UserPlus, ArrowLeft, Eye, EyeOff,
  Sparkles, Shield, Zap, LayoutDashboard, Check, X
} from 'lucide-react';

const Login: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side rate limit gate
    if (rateLimiter.isBlocked()) {
      const mins = rateLimiter.secondsUntilReset();
      setError(`Demasiados intentos. Espere ${Math.ceil(mins / 60)} minuto(s) e intente de nuevo.`);
      return;
    }

    // Password complexity check on registration
    if (isRegistering) {
      const passError = validatePassword(password);
      if (passError) { setError(passError); return; }
    }

    setIsLoading(true);
    try {
      if (isRegistering) { await register(email, password); }
      else { await login(email, password); }
      navigate('/workspace');
    } catch (err: any) {
      // Handle rate-limit thrown from AuthContext
      if (err?.message?.startsWith('TOO_MANY_ATTEMPTS:')) {
        const mins = err.message.split(':')[1];
        setError(`Demasiados intentos. Espere ${mins} minuto(s) e intente de nuevo.`);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Credenciales incorrectas. Verifique su email y contráseña.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contráseña debe tener al menos 8 caracteres, una mayúscula y un número.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intente más tarde.');
      } else {
        setError('Error al procesar solicitud. Intente nuevamente.');
      }
    } finally { setIsLoading(false); }
  };

  const pillFeatures = [
    { icon: Shield, label: 'Datos seguros' },
    { icon: Zap, label: 'Acceso instantáneo' },
    { icon: Sparkles, label: 'Potenciado por IA' },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden bg-black">

      {/* ── LEFT PANEL (desktop) ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Background orbs — white tones */}
        <div className="animate-orb absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
        <div className="animate-orb-alt absolute bottom-[-5%] right-[-5%] w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #d1d5db 0%, transparent 65%)' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

        {/* Floating icon decorations */}
        <div className="absolute top-24 right-16 border border-white/15 bg-white/5 rounded-2xl p-4 animate-float shadow-2xl">
          <LayoutDashboard size={28} className="text-gray-300" />
        </div>
        <div className="absolute bottom-32 left-16 border border-white/15 bg-white/5 rounded-2xl p-4 animate-float-alt shadow-2xl">
          <Shield size={24} className="text-gray-400" />
        </div>
        <div className="absolute top-1/2 right-8 border border-white/10 bg-white/5 rounded-2xl p-3 animate-float-slow shadow-xl">
          <Sparkles size={20} className="text-gray-400" />
        </div>

        {/* Main left content */}
        <div className={`relative z-10 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
              <LayoutDashboard size={28} className="text-black" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white">Facturador AI</h1>
              <p className="text-gray-500 text-xs font-medium">Sistema de Gestión Empresarial</p>
            </div>
          </div>

          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Tu negocio,<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #9ca3af 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              más inteligente
            </span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md mb-10">
            Gestiona facturación, inventario y clientes con el poder de la inteligencia artificial.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 items-center">
            {pillFeatures.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="border border-white/15 bg-white/5 flex items-center gap-3 px-5 py-3 rounded-full shadow-lg"
                style={{ animation: `slideUp 0.6s ${0.1 + i * 0.15}s ease-out both` }}
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <Icon size={14} className="text-gray-300" />
                </div>
                <span className="text-gray-300 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ───────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 relative bg-gray-50 overflow-y-auto">
        {/* Back button */}
        <button onClick={() => navigate('/')}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 sm:gap-2 bg-white border border-gray-200 text-gray-600 hover:text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-md">
          <ArrowLeft size={14} className="sm:w-4 sm:h-4" />Inicio
        </button>

        <div className={`w-full max-w-md transition-all duration-700 mt-12 sm:mt-0 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-black flex items-center justify-center shadow-xl flex-shrink-0">
              <LayoutDashboard size={20} className="text-white sm:w-[22px] sm:h-[22px]" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">Facturador AI</h1>
          </div>

          {/* Card */}
          <div className="rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-100">

            {/* Card header — black */}
            <div className="relative p-6 sm:p-8 overflow-hidden bg-black">
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, -40%)' }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(-40%, 40%)' }} />
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

              <div className="relative">
                <p className="text-gray-500 text-sm font-medium mb-1">
                  {isRegistering ? 'Crear una cuenta nueva' : 'Bienvenido de nuevo'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {isRegistering ? 'Regístrate' : 'Inicia sesión'}
                </h2>
              </div>
            </div>

            {/* Form body */}
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 text-gray-900 rounded-xl border border-gray-200 animate-fade-in">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-gray-500" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Correo electrónico</label>
                  <div className="relative group">
                    <Mail size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
                    <input type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all text-sm" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                  <div className="relative group">
                    <Lock size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
                    <input type={showPassword ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all text-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {/* Password requirements — only shown during registration */}
                  {isRegistering && (
                    <div className="mt-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requisitos de contraseña</p>
                      {[
                        { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
                        { label: 'Al menos una letra mayúscula', met: /[A-Z]/.test(password) },
                        { label: 'Al menos un número', met: /[0-9]/.test(password) },
                        { label: 'Al menos un carácter especial (!@#$%^&*…)', met: /[^A-Za-z0-9]/.test(password) },
                      ].map(({ label, met }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span
                            className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300"
                            style={{
                              backgroundColor: met ? '#000000' : '#e5e7eb',
                            }}
                          >
                            {met
                              ? <Check size={10} color="#ffffff" strokeWidth={3} />
                              : <X size={8} color="#9ca3af" strokeWidth={3} />}
                          </span>
                          <span className={`text-xs transition-colors duration-300 ${met ? 'text-gray-900 font-medium' : 'text-gray-400'
                            }`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                  className="btn-shimmer w-full flex justify-center items-center gap-2.5 py-3.5 bg-black text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:bg-gray-900 hover:shadow-xl">
                  {isLoading ? (
                    <><Loader2 size={18} className="animate-spin" />Procesando...</>
                  ) : isRegistering ? (
                    <><UserPlus size={18} />Crear Cuenta</>
                  ) : (
                    <><LogIn size={18} />Ingresar al Sistema</>
                  )}
                </button>

                {/* Toggle */}
                <div className="text-center pt-1">
                  <button type="button"
                    onClick={() => { setError(''); setIsRegistering(!isRegistering); }}
                    className="text-sm text-gray-500 hover:text-black transition-colors font-medium">
                    {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                  </button>
                </div>
              </form>

              {/* Security note */}
              <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Shield size={12} className="text-gray-400" />
                <span>Conexión cifrada y datos protegidos</span>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © 2026 Facturador AI. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
