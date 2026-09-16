
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users,
  Settings as SettingsIcon, Menu, LogOut, X,
  PieChart, Receipt, ChevronLeft, ChevronRight,
  Cloud, WifiOff, Wallet, Home, Sparkles, Bell, Lock,
  Crown, ShieldCheck, Building2, ClipboardList
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { isFirebaseInitialized } from '../services/firebase';
import { Permission } from '../types';

interface LayoutProps { children: React.ReactNode; }

interface MenuItem {
  path: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  highlight?: boolean;
  permission?: Permission;  // if undefined — always visible (e.g. dashboard override for owner)
  ownerOnly?: boolean;
}
interface MenuGroup { label: string; items: MenuItem[]; }

const ALL_MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { path: '/workspace', icon: LayoutDashboard, label: 'Panel', exact: true, permission: 'view_dashboard' },
    ],
  },
  {
    label: 'Facturación',
    items: [
      { path: '/workspace/invoices',       icon: FileText,  label: 'Facturas',       permission: 'view_invoices'  },
      { path: '/workspace/create-invoice', icon: FileText,  label: 'Nueva Factura',  permission: 'create_invoices', highlight: true },
      { path: '/workspace/create-receipt', icon: Wallet,    label: 'Nuevo Recibo',   permission: 'create_invoices' },
      { path: '/workspace/expenses',       icon: Receipt,   label: 'Gastos',         permission: 'manage_expenses' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/workspace/inventory', icon: Package,       label: 'Inventario',         permission: 'manage_inventory' },
      { path: '/workspace/inventory-count', icon: ClipboardList, label: 'Tomas de Inventario', permission: 'manage_inventory' },
      { path: '/workspace/customers', icon: Users,         label: 'Clientes',           permission: 'manage_customers' },
      { path: '/workspace/reports',   icon: PieChart,      label: 'Reportes',           permission: 'view_reports'    },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/workspace/cierre',   icon: Lock,          label: 'Cierre de Caja', permission: 'view_cierre',   highlight: true },
      { path: '/workspace/settings', icon: SettingsIcon,  label: 'Configuración',  permission: 'manage_settings' },
      { path: '/workspace/users',    icon: ShieldCheck,   label: 'Usuarios',       permission: 'manage_users',   ownerOnly: true },
    ],
  },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile]       = useState(false);
  const { logout, user } = useAuth();
  const { organization, member, isOwner, hasPermission } = useOrganization();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [location, isMobile]);

  const isActive = (path: string, exact?: boolean) =>
    exact
      ? location.pathname === path || location.pathname === path + '/'
      : location.pathname.startsWith(path);

  // Filter menu items based on role/permissions
  const visibleGroups: MenuGroup[] = ALL_MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.ownerOnly && !isOwner) return false;
      if (!item.permission) return true;
      return hasPermission(item.permission);
    }),
  })).filter(group => group.items.length > 0);

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const userEmail   = user?.email ?? '';
  const orgName     = organization?.name ?? '—';
  const roleLabel   = isOwner ? 'Owner' : 'Usuario';

  return (
    <div className="flex h-screen bg-[#f5f5f7] overflow-hidden relative isolate font-sans">

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64 translate-x-0 shadow-2xl shadow-black/40' : 'w-64 -translate-x-full lg:w-[72px] lg:translate-x-0'}`}
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)' }}
      >
        {/* Logo / Header */}
        <div className={`h-16 px-4 flex items-center border-b border-white/[0.06] flex-shrink-0 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-lg shadow-white/20">
                  <Sparkles size={14} className="text-black" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-black animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-bold text-[15px] tracking-tight leading-none truncate max-w-[140px]">{orgName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isOwner && <Crown size={9} className="text-yellow-400 flex-shrink-0" />}
                  <p className="text-[10px] text-gray-500 font-medium">{roleLabel}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/20">
                <span className="text-black font-black text-sm">
                  {orgName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-black animate-pulse" />
            </div>
          )}
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all border border-white/10 flex-shrink-0"
              title={sidebarOpen ? 'Contraer' : 'Expandir'}>
              {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>



        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-5 scroll-smooth">
          {visibleGroups.map(group => (
            <div key={group.label}>
              {sidebarOpen && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = isActive(item.path, item.exact);
                  return (
                    <Link key={item.path} to={item.path}
                      className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group
                        ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                        ${active
                          ? 'bg-white text-black shadow-lg shadow-white/10'
                          : item.highlight && !active
                          ? 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white'
                          : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'}`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-black -ml-2 hidden lg:block" />
                      )}
                      <div className="relative flex-shrink-0 flex items-center justify-center">
                        <item.icon size={18} className="min-w-[18px]" />
                        {!sidebarOpen && !isMobile && (
                          <div className="absolute left-12 bg-white text-black text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl font-semibold">
                            {item.label}
                          </div>
                        )}
                      </div>
                      {sidebarOpen && (
                        <span className="text-sm font-medium leading-none">{item.label}</span>
                      )}
                      {item.ownerOnly && sidebarOpen && !active && (
                        <span className="ml-auto text-[9px] font-bold bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded-md border border-yellow-400/20">
                          OWNER
                        </span>
                      )}
                      {item.highlight && sidebarOpen && !active && !item.ownerOnly && (
                        <span className="ml-auto text-[9px] font-bold bg-white/15 text-gray-300 px-1.5 py-0.5 rounded-md border border-white/10">
                          NUEVO
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 border-t border-white/[0.06] space-y-2">
          {sidebarOpen && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold border
              ${isFirebaseInitialized ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-red-900/20 text-red-400 border-red-800/30'}`}>
              {isFirebaseInitialized
                ? <><Cloud size={12} /><span>Conectado · Cloud</span></>
                : <><WifiOff size={12} /><span>Modo Local</span></>}
              <span className={`ml-auto h-1.5 w-1.5 rounded-full ${isFirebaseInitialized ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
            </div>
          )}
          <button onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-white/5 hover:text-gray-200 transition-all group ${!sidebarOpen ? 'justify-center' : ''}`}
            title="Ir al Inicio">
            <div className="relative">
              <Home size={18} />
              {!sidebarOpen && !isMobile && (
                <div className="absolute left-12 bg-white text-black text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl font-semibold top-1/2 -translate-y-1/2">
                  Inicio
                </div>
              )}
            </div>
            {sidebarOpen && <span className="text-sm font-medium">Inicio</span>}
          </button>
          <button onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-all group ${!sidebarOpen ? 'justify-center' : ''}`}
            title="Cerrar Sesión">
            <div className="relative">
              <LogOut size={18} />
              {!sidebarOpen && !isMobile && (
                <div className="absolute left-12 bg-white text-black text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl font-semibold top-1/2 -translate-y-1/2">
                  Cerrar Sesión
                </div>
              )}
            </div>
            {sidebarOpen && <span className="text-sm font-medium">Salir</span>}
          </button>
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] mt-1">
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-xs flex-shrink-0 shadow-md">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 font-semibold truncate">{userEmail}</p>
                <div className="flex items-center gap-1">
                  {isOwner && <Crown size={9} className="text-yellow-400" />}
                  <p className="text-[10px] text-gray-600 font-medium">{roleLabel}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Facturador AI</span>
            </div>
          </div>
          <button className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-800 font-bold text-xs border border-gray-200 hover:bg-gray-200 transition-colors">
            {userInitial}
          </button>
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 h-14 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-medium">{orgName}</span>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900">
                {ALL_MENU_GROUPS.flatMap(g => g.items).find(i =>
                  i.exact
                    ? location.pathname === i.path || location.pathname === i.path + '/'
                    : location.pathname.startsWith(i.path)
                )?.label ?? 'Inicio'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
              {new Date().toLocaleDateString('es-CR', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <button className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
              {isOwner && <Crown size={12} className="text-yellow-500" />}
              <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {userInitial}
              </div>
              <span className="text-xs font-semibold text-gray-600">{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth bg-[#f5f5f7]">
          <div className="max-w-[1920px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
