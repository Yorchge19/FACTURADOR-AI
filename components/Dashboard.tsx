import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart
} from 'recharts';
import { Invoice, Product } from '../types';
import { GeminiService } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, TrendingUp, DollarSign, Package, FileText,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  AlertTriangle, Plus, ChevronRight, BarChart2, Lock,
  ShoppingCart, Activity
} from 'lucide-react';

/* ── helpers ──────────────────────────────────────────────────────── */
const fmt = (n: number, currency = 'CRC') =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

interface DashboardProps {
  invoices: Invoice[];
  products: Product[];
}

/* ── Stat Card ───────────────────────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  accent?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendLabel, accent = 'bg-gray-100' }) => {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${accent} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon size={20} className="text-black" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{value}</h3>
      {trendLabel && <p className="text-xs text-gray-400 mt-2">{trendLabel}</p>}
    </div>
  );
};

/* ── Quick Action ─────────────────────────────────────────────────── */
interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  sub: string;
  to: string;
  accent: string;
}
const QuickAction: React.FC<QuickActionProps> = ({ icon: Icon, label, sub, to, accent }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm transition-all group text-left w-full"
    >
      <div className={`h-9 w-9 rounded-lg ${accent} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon size={17} className="text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{sub}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
const Dashboard: React.FC<DashboardProps> = ({ invoices, products }) => {
  const navigate = useNavigate();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  /* ── Data ── */
  const activeInvoices  = useMemo(() => invoices.filter(i => i.status !== 'cancelled'), [invoices]);
  const totalRevenue    = useMemo(() => activeInvoices.reduce((s, i) => s + i.total, 0), [activeInvoices]);
  const paidCount       = useMemo(() => activeInvoices.filter(i => i.status === 'paid').length, [activeInvoices]);
  const pendingCount    = useMemo(() => activeInvoices.filter(i => i.status === 'pending').length, [activeInvoices]);
  const lowStockCount   = useMemo(() => products.filter(p => p.stock < 5).length, [products]);
  const pendingBalance  = useMemo(() => activeInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.balance ?? i.total), 0), [activeInvoices]);

  /* ── Today sales ── */
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayInvoices = useMemo(() => activeInvoices.filter(i => i.date.slice(0, 10) === todayStr), [activeInvoices, todayStr]);
  const todayRevenue  = useMemo(() => todayInvoices.reduce((s, i) => s + i.total, 0), [todayInvoices]);

  /* ── Chart data: last 8 active invoices grouped by date ── */
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    [...activeInvoices].reverse().forEach(inv => {
      const d = inv.date.slice(0, 10);
      grouped[d] = (grouped[d] ?? 0) + inv.total;
    });
    return Object.entries(grouped)
      .slice(-8)
      .map(([date, amount]) => ({
        name: new Date(date + 'T00:00').toLocaleDateString('es-CR', { month: 'short', day: 'numeric' }),
        amount,
      }));
  }, [activeInvoices]);

  /* ── Recent invoices ── */
  const recentInvoices = useMemo(() => activeInvoices.slice(0, 5), [activeInvoices]);

  /* ── AI ── */
  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await GeminiService.analyzeBusinessData(activeInvoices, products);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  const statusStyle: Record<string, string> = {
    paid:    'text-emerald-700 bg-emerald-50 border-emerald-200',
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200',
  };
  const statusLabel: Record<string, string> = { paid: 'Pagada', pending: 'Pendiente', cancelled: 'Anulada' };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Panel de Control</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate('/workspace/create-invoice')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-md"
          >
            <Plus size={16} /> Nueva Factura
          </button>
          <button
            onClick={handleAiAnalysis}
            disabled={loadingAi}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-400 hover:text-gray-900 transition-all disabled:opacity-60 active:scale-95"
          >
            <Sparkles size={16} className={loadingAi ? 'animate-spin text-black' : ''} />
            {loadingAi ? 'Analizando...' : 'Analizar con IA'}
          </button>
        </div>
      </div>

      {/* ── AI Result ── */}
      {aiAnalysis && (
        <div className="relative bg-black text-white rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xs">✕</button>
          <h3 className="font-bold flex items-center gap-2 mb-3 text-lg">
            <Sparkles size={18} className="text-gray-300" /> Análisis Inteligente
          </h3>
          <div className="text-sm text-gray-300 leading-relaxed space-y-1">
            {aiAnalysis.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos Totales"
          value={fmt(totalRevenue)}
          icon={DollarSign}
          trend={2.5}
          trendLabel="Facturas activas"
          accent="bg-gray-100"
        />
        <StatCard
          title="Ventas Hoy"
          value={fmt(todayRevenue)}
          icon={Activity}
          trendLabel={`${todayInvoices.length} transacción(es)`}
          accent="bg-gray-100"
        />
        <StatCard
          title="Por Cobrar"
          value={fmt(pendingBalance)}
          icon={Clock}
          trendLabel={`${pendingCount} factura(s) pendiente`}
          accent="bg-amber-50"
        />
        <StatCard
          title="Stock Bajo"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          trendLabel={`${products.length} productos total`}
          accent={lowStockCount > 0 ? 'bg-red-50' : 'bg-gray-100'}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Area chart — wider */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Tendencia de Ventas</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos movimientos</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg font-medium">
              {chartData.length} días
            </span>
          </div>
          <div className="h-52 sm:h-60 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111827" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', color: '#fff', borderRadius: '10px', border: 'none', fontSize: 12 }}
                    itemStyle={{ color: '#d1d5db' }}
                    formatter={(v: number) => [fmt(v), 'Total']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#111827" strokeWidth={2.5}
                    fill="url(#areaGrad)" dot={{ r: 3, fill: '#fff', stroke: '#111827', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#111827' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                <BarChart2 size={36} className="opacity-40" />
                <p className="text-sm">Sin datos suficientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Bar chart — narrow */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Ventas por Fecha</h3>
              <p className="text-xs text-gray-400 mt-0.5">Montos por transacción</p>
            </div>
          </div>
          <div className="h-52 sm:h-60 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ backgroundColor: '#000', color: '#fff', borderRadius: '10px', border: 'none', fontSize: 12 }}
                    itemStyle={{ color: '#d1d5db' }}
                    formatter={(v: number) => [fmt(v), 'Total']}
                  />
                  <Bar dataKey="amount" fill="#111827" radius={[5, 5, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                <BarChart2 size={36} className="opacity-40" />
                <p className="text-sm">Sin datos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText size={16} className="text-gray-400" /> Facturas Recientes
            </h3>
            <button onClick={() => navigate('/workspace/invoices')} className="text-xs text-gray-500 hover:text-black font-semibold flex items-center gap-1 transition-colors">
              Ver todas <ChevronRight size={13} />
            </button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-gray-300 gap-2">
              <ShoppingCart size={34} className="opacity-40" />
              <p className="text-sm">No hay facturas aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{inv.customerName}</p>
                    <p className="text-xs text-gray-400">#{inv.number} · {inv.date}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusStyle[inv.status]}`}>
                    {statusLabel[inv.status]}
                  </span>
                  <span className="font-black text-gray-900 text-sm text-right flex-shrink-0">
                    {fmt(inv.total, inv.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-400" /> Acciones Rápidas
          </h3>
          <div className="space-y-2.5">
            <QuickAction icon={Plus} label="Nueva Factura" sub="Crear factura de venta" to="/workspace/create-invoice" accent="bg-gray-100" />
            <QuickAction icon={ShoppingCart} label="Nuevo Recibo" sub="Registrar un cobro" to="/workspace/create-receipt" accent="bg-gray-100" />
            <QuickAction icon={Package} label="Ver Inventario" sub="Gestionar productos" to="/workspace/inventory" accent="bg-gray-100" />
            <QuickAction icon={BarChart2} label="Reportes" sub="Análisis de ventas" to="/workspace/reports" accent="bg-gray-100" />
            <QuickAction icon={Lock} label="Cierre de Caja" sub="Cerrar período del día" to="/workspace/cierre" accent="bg-gray-900" />
          </div>

          {/* Mini stats */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{paidCount}</p>
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 size={11} className="text-emerald-500" /> Pagadas
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                <Clock size={11} className="text-amber-500" /> Pendientes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Low Stock alert ── */}
      {lowStockCount > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Stock bajo detectado</p>
              <p className="text-xs text-amber-600">{lowStockCount} producto(s) con menos de 5 unidades en inventario.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/workspace/inventory')}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
          >
            Ver inventario <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;