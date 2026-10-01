import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogIn, LogOut, LayoutDashboard, ArrowRight, Zap, Shield, BarChart3,
  FileText, Package, Users, TrendingUp, CheckCircle2, Sparkles, ChevronRight,
  Receipt, Brain, Globe, Star
} from 'lucide-react';

/* ── Floating particle ───────────────────────────────────────────────── */
const Particle: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: '3px', height: '3px',
      background: 'rgba(255,255,255,0.35)',
      animation: `particleDrift ${6 + Math.random() * 6}s ease-in-out infinite`,
      animationDelay: `${Math.random() * 5}s`,
      ...style,
    }}
  />
);

/* ── Feature card ────────────────────────────────────────────────────── */
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  delay: string;
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, desc, delay }) => (
  <div
    className="card-hover bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 group cursor-default"
    style={{ animation: `slideUp 0.7s ${delay} ease-out both` }}
  >
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-black dark:bg-white shadow-lg group-hover:scale-110 transition-transform duration-300">
      <Icon size={22} className="text-white dark:text-black" />
    </div>
    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

/* ── News card ───────────────────────────────────────────────────────── */
interface NewsCardProps {
  badge: string;
  badgeBg: string;
  title: string;
  desc: string;
  date: string;
  delay: string;
}
const NewsCard: React.FC<NewsCardProps> = ({ badge, badgeBg, title, desc, date, delay }) => (
  <div
    className="card-hover bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm group cursor-default"
    style={{ animation: `slideUp 0.7s ${delay} ease-out both` }}
  >
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${badgeBg}`}>
      <Sparkles size={10} />
      {badge}
    </div>
    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-black transition-colors">{title}</h4>
    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-4">{desc}</p>
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-700 dark:text-gray-300 group-hover:translate-x-1 transition-all" />
    </div>
  </div>
);

/* ── Main Component ──────────────────────────────────────────────────── */
const LandingDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    style: { left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` },
  }));

  const features = [
    { icon: FileText, title: 'Facturación Digital', desc: 'Genera facturas profesionales en segundos con plantillas personalizables y exportación PDF.', delay: '0.1s' },
    { icon: Package, title: 'Control de Inventario', desc: 'Gestiona tu stock en tiempo real con alertas automáticas de inventario bajo.', delay: '0.2s' },
    { icon: Users, title: 'Gestión de Clientes', desc: 'Centraliza toda la información de tus clientes y su historial de compras.', delay: '0.3s' },
    { icon: BarChart3, title: 'Reportes Avanzados', desc: 'Visualiza el rendimiento de tu negocio con gráficos interactivos en tiempo real.', delay: '0.4s' },
    { icon: Brain, title: 'Asistencia con IA', desc: 'Motor de inteligencia artificial que te sugiere optimizaciones y detecta anomalías.', delay: '0.5s' },
    { icon: Shield, title: 'Datos Seguros', desc: 'Cifrado de extremo a extremo y copias de seguridad automáticas en la nube.', delay: '0.6s' },
  ];

  const news = [
    { badge: 'Nuevo', badgeBg: 'bg-gray-900 text-white dark:text-black', title: 'Módulo de Gastos Automáticos', desc: 'El sistema genera automáticamente registros de gastos basados en el costo de tus ventas.', date: '21 Feb, 2026', delay: '0.15s' },
    { badge: 'Mejora', badgeBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', title: 'Reportes con Gráficos Interactivos', desc: 'Nuevo módulo de reportes con visualizaciones avanzadas y exportación a PDF optimizada.', date: '15 Feb, 2026', delay: '0.3s' },
    { badge: 'Sistema', badgeBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', title: 'Optimización de Rendimiento', desc: 'Mejoras en carga de datos y sincronización con la nube para una experiencia más fluida.', date: '10 Feb, 2026', delay: '0.45s' },
  ];

  const stats = [
    { value: '10x', label: 'Más rápido', icon: Zap },
    { value: '99.9%', label: 'Uptime garantizado', icon: Globe },
    { value: '0', label: 'Empresas activas', icon: TrendingUp },
    { value: '5.0★', label: 'Satisfacción', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 font-sans overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-black">
        {/* Animated background orbs — grayscale */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="animate-orb absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
          <div className="animate-orb-alt absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #d1d5db 0%, transparent 70%)' }} />
          <div className="animate-orb absolute top-[20%] right-[15%] w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          {particles.map(p => <Particle key={p.id} style={p.style} />)}
        </div>

        {/* ── NAV ── */}
        <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${mounted ? 'animate-slide-in-left' : 'opacity-0'}`}>
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                <LayoutDashboard size={20} className="text-black" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border-2 border-black animate-pulse" />
            </div>
            <div>
              <span className="text-white font-bold text-xl tracking-tight">Facturador AI</span>
              <span className="ml-2 text-[10px] font-semibold bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/20">v1.0</span>
            </div>
          </div>

          <div className={`flex items-center gap-3 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
            {user ? (
              <>
                <button onClick={() => navigate('/workspace')}
                  className="btn-shimmer flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl hover:bg-gray-100 transition-all font-semibold text-sm shadow-lg">
                  <LayoutDashboard size={16} />Workspace
                </button>
                <button onClick={logout}
                  className="flex items-center gap-2 px-4 py-2.5 border border-white/20 text-gray-300 hover:text-white hover:border-white/40 rounded-xl transition-all font-medium text-sm">
                  <LogOut size={16} />Salir
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')}
                className="btn-shimmer flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl hover:bg-gray-100 transition-all font-semibold text-sm shadow-lg">
                <LogIn size={16} />Iniciar Sesión
              </button>
            )}
          </div>
        </nav>

        {/* ── HERO CONTENT ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 text-center">
          {/* Badge */}
          <div className="animate-slide-up inline-flex items-center gap-2 border border-white/20 bg-white/5 rounded-full px-4 py-2 mb-8">
            <Sparkles size={14} className="text-gray-300" />
            <span className="text-gray-300 text-sm font-medium">Potenciado por Inteligencia Artificial</span>
          </div>

          {/* Headline */}
          <h1 className="animate-slide-up-delay-1 text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            Gestiona tu negocio{' '}
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #d1d5db 50%, #9ca3af 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              con inteligencia
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-slide-up-delay-2 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Facturación, inventario, clientes y reportes — todo en un solo lugar, impulsado por IA para que tomes decisiones más inteligentes.
          </p>

          {/* CTAs */}
          <div className="animate-slide-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            {!user ? (
              <>
                <button onClick={() => navigate('/login')}
                  className="btn-shimmer group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 hover:bg-gray-100">
                  Comenzar Gratis
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-8 py-4 border border-white/20 text-white rounded-2xl font-semibold text-lg hover:bg-white/10 transition-all">
                  Ver Demo <ChevronRight size={18} />
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/workspace')}
                className="btn-shimmer group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 hover:bg-gray-100">
                Ir al Workspace
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="animate-fade-in mt-10 flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
            {['Sin tarjeta requerida', 'Configuración en 2 minutos', 'Soporte 24/7'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-white" />{t}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1080 80 360 0 0 40L0 80Z" fill="#f9fafb" />
          </svg>
        </div>
      </div>

      {/* ── STATS BAR ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ value, label, icon: Icon }, i) => (
            <div key={label} className="flex flex-col items-center text-center group"
              style={{ animation: `slideUp 0.6s ${0.1 * i}s ease-out both` }}>
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 group-hover:bg-black dark:bg-white transition-colors duration-300">
                <Icon size={18} className="text-gray-700 dark:text-gray-300 group-hover:text-white dark:text-black transition-colors duration-300" />
              </div>
              <p className="text-2xl font-black text-black dark:text-white">{value}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES GRID ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14" style={{ animation: 'slideUp 0.7s ease-out both' }}>
          <span className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Zap size={14} />Funcionalidades
          </span>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3">Todo lo que necesitas</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">Una plataforma completa para gestionar cada aspecto de tu empresa.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── NEWS / UPDATES ───────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12" style={{ animation: 'slideUp 0.7s ease-out both' }}>
            <span className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 mb-4 shadow-sm">
              <Receipt size={14} />Novedades
            </span>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Actualizaciones recientes</h2>
            <p className="text-gray-500 dark:text-gray-400">Siempre mejorando para ofrecerte la mejor experiencia.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map(n => <NewsCard key={n.title} {...n} />)}
          </div>
        </div>
      </section>

      {/* ── CTA BOTTOM ───────────────────────────────────────────────── */}
      {!user && (
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="relative rounded-3xl p-12 overflow-hidden shadow-2xl bg-black">
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              <Sparkles size={40} className="text-gray-400 mx-auto mb-4 animate-pulse-soft" />
              <h2 className="text-4xl font-black text-white mb-4">¿Listo para empezar?</h2>
              <p className="text-gray-400 text-lg mb-8">Únete a cientos de empresas que ya optimizaron su facturación con IA.</p>
              <button onClick={() => navigate('/login')}
                className="btn-shimmer inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all hover:bg-gray-100">
                <LogIn size={20} />
                Crear cuenta gratis
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-black text-gray-500 dark:text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
              <LayoutDashboard size={14} className="text-black" />
            </div>
            <span className="font-bold text-white dark:text-black">Facturador AI</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">v1.0</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">© 2026 Facturador AI. Todos los derechos reservados.</p>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900 animate-pulse" />
            Sistema operativo
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingDashboard;
