
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import LandingDashboard from './components/LandingDashboard';
import Workspace from './components/Workspace';
import OrganizationSetup from './components/OrganizationSetup';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutDashboard, WifiOff } from 'lucide-react';

/* ── Splash ──────────────────────────────────────────────────────────── */
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black">
    <div className="relative">
      <div
        className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl"
        style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}
      >
        <LayoutDashboard size={36} className="text-black" />
      </div>
      <div
        className="absolute inset-0 rounded-2xl border-2 border-transparent"
        style={{
          borderTopColor: 'rgba(255,255,255,0.6)',
          borderRightColor: 'rgba(255,255,255,0.2)',
          animation: 'spin-slow 1.2s linear infinite',
        }}
      />
    </div>
    <div className="text-center">
      <h1 className="text-white text-2xl font-black tracking-tight mb-1">Facturador AI</h1>
      <p className="text-gray-500 text-sm animate-pulse">Cargando sistema…</p>
    </div>
    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, #6b7280, #ffffff, #6b7280)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s linear infinite',
          width: '60%',
        }}
      />
    </div>
  </div>
);

/* ── Route guards ────────────────────────────────────────────────────── */

/** Requires authenticated user. If user already has an org, redirect to workspace. */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userProfile } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // User already has an org → skip setup
  if (userProfile?.organizationId) return <Navigate to="/workspace" replace />;
  return <>{children}</>;
};

/**
 * Requires authenticated user AND an active organization.
 * If user has no org → redirect to /setup.
 */
const OrgRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userProfile } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile) return <LoadingScreen />; // profile still loading
  if (!userProfile.organizationId) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};

/**
 * Redirect to /workspace if already authenticated + has org.
 * Used on login/landing pages.
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userProfile } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && userProfile?.organizationId) return <Navigate to="/workspace" replace />;
  if (user && userProfile && !userProfile.organizationId) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};

/* ── Offline banner (PWA shell offline) ───────────────────────────────── */
const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  if (isOnline) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-amber-400 text-black text-xs sm:text-sm font-bold px-4 py-2.5 flex items-center justify-center gap-2 shadow-md">
      <WifiOff size={16} className="flex-shrink-0" />
      <span>Sin conexión — la interfaz sigue disponible en modo offline. Los datos se sincronizarán al reconectar.</span>
    </div>
  );
};

/* ── App Routes ──────────────────────────────────────────────────────── */
const AppRoutes: React.FC = () => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <>
      <OfflineBanner />
      <Routes>
      <Route path="/" element={<PublicRoute><LandingDashboard /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Organization setup — shown after first login (no org yet) */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <OrganizationSetup />
          </ProtectedRoute>
        }
      />

      {/* Main workspace — requires auth + org */}
      <Route
        path="/workspace/*"
        element={
          <OrgRoute>
            <OrganizationProvider>
              <Workspace />
            </OrganizationProvider>
          </OrgRoute>
        }
      />
    </Routes>
    </>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
