
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users,
  Settings as SettingsIcon, Menu, LogOut, X,
  PieChart, Receipt, ChevronLeft, ChevronRight,
  Cloud, WifiOff, Wallet, Home, Sparkles, Bell, Lock,
  Crown, ShieldCheck, Building2, ClipboardList,
  AlertTriangle, Clock, DollarSign, CheckCircle2, Search, Sun, Moon, FileSpreadsheet, Glasses, Wrench, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { isFirebaseInitialized } from '../services/firebase';
import { Permission, Product, Invoice } from '../types';
import { getNotificationSummary } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  products?: Product[];
  invoices?: Invoice[];
  onSearchOpen?: () => void;
}

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
      { path: '/workspace/invoices',       icon: FileText,       label: 'Facturas',         permission: 'view_invoices'  },
      { path: '/workspace/create-invoice', icon: FileText,       label: 'Nueva Factura',    permission: 'create_invoices', highlight: true },
      { path: '/workspace/quotes',         icon: FileSpreadsheet, label: 'Cotizaciones',     permission: 'manage_quotes' },
      { path: '/workspace/create-quote',   icon: FileSpreadsheet, label: 'Nueva Cotización', permission: 'manage_quotes' },
      { path: '/workspace/lens-simulation', icon: Glasses,       label: 'Simulación',       permission: 'use_lens_simulation' },
      { path: '/workspace/create-receipt', icon: Wallet,         label: 'Nuevo Recibo',     permission: 'create_invoices' },
      { path: '/workspace/expenses',       icon: Receipt,        label: 'Gastos',           permission: 'manage_expenses' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/workspace/inventory', icon: Package,       label: 'Inventario',         permission: 'manage_inventory' },
      { path: '/workspace/inventory-count', icon: ClipboardList, label: 'Tomas de Inventario', permission: 'manage_inventory' },
      { path: '/workspace/lab-orders', icon: Wrench,        label: 'Laboratorio',        permission: 'manage_lab_orders' },
      { path: '/workspace/create-lab-order', icon: Wrench, label: 'Nueva Orden Lab',    permission: 'manage_lab_orders' },
      { path: '/workspace/customers', icon: Users,         label: 'Clientes',           permission: 'manage_customers' },
      { path: '/workspace/goals',     icon: Target,        label: 'Metas de Venta',     permission: 'manage_goals' },
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

const Layout: React.FC<LayoutProps> = ({ children, products = [], invoices = [], onSearchOpen }) => {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile]       = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const notifRef                      = useRef<HTMLDivElement>(null);
  const notifMobileRef                = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();
  const { organization, member, isOwner, hasPermission } = useOrganization();
  const { theme, toggleTheme } = useTheme();

  const notifications = useMemo(() => getNotificationSummary(products, invoices), [products, invoices]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = notifRef.current?.contains(target);
      const insideMobile = notifMobileRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) setNotifOpen(false);
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

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
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] overflow-hidden relative isolate font-sans">

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
        <header className="lg:hidden bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center justify-between shadow-sm z-30 flex-shrink-0 relative">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-700 dark:text-gray-300">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Facturador AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSearchOpen?.()}
              className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Buscar"
            >
              <Search size={16} />
            </button>
            <div className="relative" ref={notifMobileRef}>
              <button onClick={() => setNotifOpen(v => !v)} className="relative h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell size={16} />
                {notifications.total > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] font-black text-white leading-none">
                    {notifications.total > 99 ? '99+' : notifications.total}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="fixed left-2 right-2 top-[60px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in max-h-[70vh] flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <Bell size={14} className="text-gray-600 dark:text-gray-400" /> Notificaciones
                      {notifications.total > 0 && (
                        <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications.total}</span>
                      )}
                    </h3>
                    <button onClick={() => setNotifOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.total === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-3">
                          <CheckCircle2 size={20} className="text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Sin notificaciones</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Todo está al día</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {notifications.lowStock.length > 0 && (
                          <div className="p-3">
                            <button onClick={() => { setNotifOpen(false); navigate('/workspace/inventory'); }} className="w-full flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wide">
                                <Package size={12} /> Stock bajo <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.lowStock.length}</span>
                              </span>
                              <ChevronRight size={12} className="text-gray-400" />
                            </button>
                            <div className="space-y-1">
                              {notifications.lowStock.slice(0, 3).map(p => (
                                <button key={p.id} onClick={() => { setNotifOpen(false); navigate('/workspace/inventory'); }} className="w-full text-left p-2 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{p.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{p.sku} · {p.stock} unidades</p>
                                  </div>
                                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {notifications.overdue.length > 0 && (
                          <div className="p-3">
                            <button onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }} className="w-full flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 text-xs font-bold text-red-700 uppercase tracking-wide">
                                <Clock size={12} /> Vencidas <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.overdue.length}</span>
                              </span>
                              <ChevronRight size={12} className="text-gray-400" />
                            </button>
                            <div className="space-y-1">
                              {notifications.overdue.slice(0, 3).map(inv => (
                                <button key={inv.id} onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }} className="w-full text-left p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100">
                                  <p className="text-sm font-semibold truncate">{inv.number}</p>
                                  <p className="text-xs text-gray-500 truncate">{inv.customerName} · Venció {new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-CR')}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {notifications.pending.length > 0 && (
                          <div className="p-3">
                            <button onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }} className="w-full flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide">
                                <DollarSign size={12} /> Pendientes <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.pending.length}</span>
                              </span>
                              <ChevronRight size={12} className="text-gray-400" />
                            </button>
                            <div className="space-y-1">
                              {notifications.pending.slice(0, 3).map(inv => (
                                <button key={inv.id} onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }} className="w-full text-left p-2 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100">
                                  <p className="text-sm font-semibold truncate">{inv.number}</p>
                                  <p className="text-xs text-gray-500 truncate">{inv.customerName}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {userInitial}
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 h-14 bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 dark:text-gray-400 font-medium">{orgName}</span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {ALL_MENU_GROUPS.flatMap(g => g.items).find(i =>
                  i.exact
                    ? location.pathname === i.path || location.pathname === i.path + '/'
                    : location.pathname.startsWith(i.path)
                )?.label ?? 'Inicio'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 dark:text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-1.5 rounded-xl hidden sm:flex">
              {new Date().toLocaleDateString('es-CR', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <button
              onClick={() => onSearchOpen?.()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-semibold shadow-sm"
              aria-label="Buscar (Ctrl+K)"
              title="Buscar (Ctrl+K / ⌘K)"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Buscar</span>
              <span className="hidden lg:inline-flex items-center gap-1 ml-1">
                <span className="px-1 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono leading-none text-gray-600 dark:text-gray-300">⌘</span>
                <span className="px-1 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono leading-none text-gray-600 dark:text-gray-300">K</span>
              </span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Cambiar tema"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                aria-label="Notificaciones"
              >
                <Bell size={16} />
                {notifications.total > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white leading-none shadow-sm">
                    {notifications.total > 99 ? '99+' : notifications.total}
                  </span>
                )}
                {notifications.total > 0 && !notifOpen && (
                  <span className="absolute -top-1 -right-1 h-[18px] w-[18px] rounded-full bg-red-500 opacity-30 animate-ping pointer-events-none" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[90vw] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <Bell size={14} className="text-gray-600 dark:text-gray-400" /> Notificaciones
                      {notifications.total > 0 && (
                        <span className="ml-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications.total}</span>
                      )}
                    </h3>
                    <button onClick={() => setNotifOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {notifications.total === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-3">
                          <CheckCircle2 size={20} className="text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Sin notificaciones</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Todo está al día</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {/* Stock bajo */}
                        {notifications.lowStock.length > 0 && (
                          <div className="p-3">
                            <button
                              onClick={() => { setNotifOpen(false); navigate('/workspace/inventory'); }}
                              className="w-full flex items-center justify-between mb-2 group"
                            >
                              <span className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wide">
                                <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                                  <Package size={12} className="text-amber-600" />
                                </span>
                                Stock bajo
                                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.lowStock.length}</span>
                              </span>
                              <span className="text-[11px] text-gray-400 group-hover:text-amber-600 flex items-center gap-1">Ver inventario <ChevronRight size={12} /></span>
                            </button>
                            <div className="space-y-1">
                              {notifications.lowStock.slice(0, 5).map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => { setNotifOpen(false); navigate('/workspace/inventory'); }}
                                  className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-amber-50/70 border border-transparent hover:border-amber-100 transition-colors group/item"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover/item:text-amber-800">{p.name}</p>
                                    <p className="text-xs text-gray-500 font-mono truncate">{p.sku} · Stock: <span className="font-bold text-red-600">{p.stock}</span></p>
                                  </div>
                                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 ml-2" />
                                </button>
                              ))}
                              {notifications.lowStock.length > 5 && (
                                <p className="text-xs text-gray-400 text-center py-1">y {notifications.lowStock.length - 5} más</p>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Facturas vencidas */}
                        {notifications.overdue.length > 0 && (
                          <div className="p-3">
                            <button
                              onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }}
                              className="w-full flex items-center justify-between mb-2 group"
                            >
                              <span className="flex items-center gap-2 text-xs font-bold text-red-700 uppercase tracking-wide">
                                <span className="h-6 w-6 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                                  <Clock size={12} className="text-red-600" />
                                </span>
                                Facturas vencidas
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.overdue.length}</span>
                              </span>
                              <span className="text-[11px] text-gray-400 group-hover:text-red-600 flex items-center gap-1">Ver facturas <ChevronRight size={12} /></span>
                            </button>
                            <div className="space-y-1">
                              {notifications.overdue.slice(0, 5).map(inv => (
                                <button
                                  key={inv.id}
                                  onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }}
                                  className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-red-50/70 border border-transparent hover:border-red-100 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.number} · {inv.customerName}</p>
                                    <p className="text-xs text-gray-500 truncate">Venció: {new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-CR')} · Saldo {new Intl.NumberFormat('es-CR', { style: 'currency', currency: inv.currency || 'CRC', maximumFractionDigits: 0 }).format(inv.balance ?? inv.total)}</p>
                                  </div>
                                  <span className="ml-2 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">VENCIDA</span>
                                </button>
                              ))}
                              {notifications.overdue.length > 5 && (
                                <p className="text-xs text-gray-400 text-center py-1">y {notifications.overdue.length - 5} más</p>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Pagos pendientes */}
                        {notifications.pending.length > 0 && (
                          <div className="p-3">
                            <button
                              onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }}
                              className="w-full flex items-center justify-between mb-2 group"
                            >
                              <span className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide">
                                <span className="h-6 w-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                                  <DollarSign size={12} className="text-blue-600" />
                                </span>
                                Pagos pendientes
                                <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.pending.length}</span>
                              </span>
                              <span className="text-[11px] text-gray-400 group-hover:text-blue-600 flex items-center gap-1">Ver facturas <ChevronRight size={12} /></span>
                            </button>
                            <div className="space-y-1">
                              {notifications.pending.slice(0, 5).map(inv => (
                                <button
                                  key={inv.id}
                                  onClick={() => { setNotifOpen(false); navigate('/workspace/invoices'); }}
                                  className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.number} · {inv.customerName}</p>
                                    <p className="text-xs text-gray-500 truncate">Vence: {new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-CR')} · Pendiente {new Intl.NumberFormat('es-CR', { style: 'currency', currency: inv.currency || 'CRC', maximumFractionDigits: 0 }).format(inv.balance ?? inv.total)}</p>
                                  </div>
                                  <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full flex-shrink-0">PENDIENTE</span>
                                </button>
                              ))}
                              {notifications.pending.length > 5 && (
                                <p className="text-xs text-gray-400 text-center py-1">y {notifications.pending.length - 5} más</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {notifications.total > 0 && (
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{notifications.total} notificación{notifications.total !== 1 ? 'es' : ''} pendiente{notifications.total !== 1 ? 's' : ''}</span>
                      <button onClick={() => setNotifOpen(false)} className="text-xs font-semibold text-gray-700 hover:text-black">Cerrar</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-1.5">
              {isOwner && <Crown size={12} className="text-yellow-500" />}
              <div className="h-6 w-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-xs shadow-sm">
                {userInitial}
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth bg-[#f5f5f7] dark:bg-[#0a0a0a]">
          <div className="max-w-[1920px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
