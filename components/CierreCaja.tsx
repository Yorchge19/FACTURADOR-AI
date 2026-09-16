import React, { useMemo, useRef, useState } from 'react';
import { Invoice } from '../types';
import {
  Calendar, Printer, Download, X, TrendingUp, FileText,
  CheckCircle, Clock, AlertCircle, DollarSign, Hash,
  ShoppingCart, ChevronDown, ChevronUp, Banknote, CreditCard,
  Wallet, Lock
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number, currency = 'CRC') =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const statusMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:      { label: 'Pagada',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  pending:   { label: 'Pendiente',color: 'text-amber-600 bg-amber-50 border-amber-200',     icon: Clock },
  cancelled: { label: 'Anulada', color: 'text-red-500 bg-red-50 border-red-200',            icon: AlertCircle },
};

const paymentIcon: Record<string, React.ElementType> = {
  'Efectivo': Banknote,
  'Tarjeta':  CreditCard,
  'SINPE':    Wallet,
};

/* ── props ───────────────────────────────────────────────────────────── */
interface CierreCajaProps {
  invoices: Invoice[];
}

/* ══════════════════════════════════════════════════════════════════════ */
const CierreCaja: React.FC<CierreCajaProps> = ({ invoices }) => {
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo]     = useState(today());
  const [generated, setGenerated] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  /* ── filtered invoices ── */
  const filtered = useMemo(() => {
    if (!generated) return [];
    return invoices
      .filter(inv => {
        const d = inv.date.slice(0, 10);
        return d >= dateFrom && d <= dateTo && inv.status !== 'cancelled';
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, dateFrom, dateTo, generated]);

  const cancelled = useMemo(() => {
    if (!generated) return [];
    return invoices.filter(inv => {
      const d = inv.date.slice(0, 10);
      return d >= dateFrom && d <= dateTo && inv.status === 'cancelled';
    });
  }, [invoices, dateFrom, dateTo, generated]);

  /* ── totals ── */
  const totalVentas   = useMemo(() => filtered.reduce((s, i) => s + i.total, 0), [filtered]);
  const totalImpuesto = useMemo(() => filtered.reduce((s, i) => s + i.tax, 0), [filtered]);
  const totalSubtotal = useMemo(() => filtered.reduce((s, i) => s + i.subtotal, 0), [filtered]);
  const totalPagadas  = useMemo(() => filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0), [filtered]);
  const totalPendiente= useMemo(() => filtered.filter(i => i.status === 'pending').reduce((s, i) => s + (i.balance ?? i.total), 0), [filtered]);

  /* payment method breakdown */
  const byMethod = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(inv => {
      const method = inv.paymentMethod ?? 'Sin especificar';
      map[method] = (map[method] ?? 0) + inv.total;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  /* ── print / PDF ── */
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html>
      <head>
        <meta charset="utf-8"/>
        <title>Cierre de Caja — ${dateFrom === dateTo ? fmtDate(dateFrom) : `${dateFrom} al ${dateTo}`}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 32px; }
          h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          h2 { font-size: 16px; font-weight: 700; margin: 20px 0 8px; border-bottom: 2px solid #000; padding-bottom: 4px; }
          p  { font-size: 12px; color: #555; margin-bottom: 16px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #000; padding-bottom: 16px; }
          .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; border: 1px solid; }
          .paid { color: #059669; border-color: #a7f3d0; background: #ecfdf5; }
          .pending { color: #d97706; border-color: #fde68a; background: #fffbeb; }
          .cancelled { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          thead tr { background: #111; color: #fff; }
          th { padding: 8px 10px; text-align: left; font-weight: 700; }
          td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
          tr:last-child td { border-bottom: none; }
          .right { text-align: right; }
          .total-row td { font-weight: 700; border-top: 2px solid #111; background: #f9fafb; }
          .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
          .summary-card .label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
          .summary-card .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  /* ── UI ── */
  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-16 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Lock size={26} className="text-black" />
            Cierre de Caja
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Genera un reporte de cierre con todas las transacciones del período seleccionado.
          </p>
        </div>
        {generated && filtered.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
        )}
      </div>

      {/* ── Filter Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        <h3 className="font-bold text-gray-800 text-sm md:text-base mb-4 flex items-center gap-2">
          <Calendar size={18} /> Seleccionar Período
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => { setDateFrom(e.target.value); setGenerated(false); }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => { setDateTo(e.target.value); setGenerated(false); }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setGenerated(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 active:scale-95 transition-all shadow-md whitespace-nowrap"
          >
            <Lock size={16} /> Generar Cierre
          </button>
          {generated && (
            <button
              onClick={() => setGenerated(false)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl font-medium text-sm hover:border-gray-400 hover:text-gray-800 transition-all"
            >
              <X size={16} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Report ── */}
      {generated && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Ventas', value: fmt(totalVentas), icon: TrendingUp, sub: `${filtered.length} transacciones` },
              { label: 'Subtotal Neto', value: fmt(totalSubtotal), icon: DollarSign, sub: 'Sin impuesto' },
              { label: 'IVA Cobrado', value: fmt(totalImpuesto), icon: Hash, sub: 'Impuesto de ventas' },
              { label: 'Por Cobrar', value: fmt(totalPendiente), icon: Clock, sub: 'Saldo pendiente' },
            ].map(({ label, value, icon: Icon, sub }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                  <div className="h-8 w-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Icon size={16} className="text-black" />
                  </div>
                </div>
                <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Payment method breakdown */}
          {byMethod.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <CreditCard size={16} /> Desglose por Método de Pago
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {byMethod.map(([method, amount]) => {
                  const Icon = paymentIcon[method] ?? Wallet;
                  return (
                    <div key={method} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 truncate">{method}</p>
                        <p className="text-sm font-black text-gray-900">{fmt(amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Printable Report ── */}
          <div ref={printRef} id="cierre-print">
            {/* Print header (hidden on screen, shown when printing) */}
            <div className="hidden" id="print-header-only" aria-hidden>
              <div className="header">
                <div>
                  <h1>Cierre de Caja</h1>
                  <p>
                    Período: {dateFrom === dateTo ? fmtDate(dateFrom) : `${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`}
                  </p>
                  <p>Generado: {new Date().toLocaleString('es-CR')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>Facturador AI · v1.0</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>Reporte de Cierre Oficial</p>
                </div>
              </div>
              <h2>Resumen del Período</h2>
              <div className="summary">
                <div className="summary-card">
                  <div className="label">Total Vendido</div>
                  <div className="value">{fmt(totalVentas)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">Transacciones</div>
                  <div className="value">{filtered.length}</div>
                </div>
                <div className="summary-card">
                  <div className="label">IVA Cobrado</div>
                  <div className="value">{fmt(totalImpuesto)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">Saldo Pendiente</div>
                  <div className="value">{fmt(totalPendiente)}</div>
                </div>
              </div>
              {byMethod.length > 0 && (
                <>
                  <h2>Por Método de Pago</h2>
                  <table>
                    <thead><tr><th>Método</th><th className="right">Total</th></tr></thead>
                    <tbody>
                      {byMethod.map(([m, a]) => (
                        <tr key={m}><td>{m}</td><td className="right">{fmt(a)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              <h2>Detalle de Transacciones</h2>
            </div>

            {/* ── Transaction Table (screen + print) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={17} />
                  Detalle de Transacciones
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                    {filtered.length}
                  </span>
                </h3>
                <span className="text-xs text-gray-400">
                  {dateFrom === dateTo ? fmtDate(dateFrom) : `${dateFrom} → ${dateTo}`}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <ShoppingCart size={40} className="opacity-30" />
                  <p className="font-semibold">No hay transacciones para este período.</p>
                  <p className="text-sm">Selecciona otro rango de fechas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* ── TABLE (print) ── */}
                  <table className="hidden w-full">
                    <thead>
                      <tr>
                        <th>N° Factura</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th className="right">Subtotal</th>
                        <th className="right">IVA</th>
                        <th className="right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(inv => (
                        <tr key={inv.id}>
                          <td>#{inv.number}</td>
                          <td>{inv.date}</td>
                          <td>{inv.customerName}</td>
                          <td>{inv.paymentMethod ?? '—'}</td>
                          <td>{statusMeta[inv.status]?.label}</td>
                          <td className="right">{fmt(inv.subtotal, inv.currency)}</td>
                          <td className="right">{fmt(inv.tax, inv.currency)}</td>
                          <td className="right">{fmt(inv.total, inv.currency)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={5}>TOTAL GENERAL</td>
                        <td className="right">{fmt(totalSubtotal)}</td>
                        <td className="right">{fmt(totalImpuesto)}</td>
                        <td className="right">{fmt(totalVentas)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ── SCREEN cards ── */}
                  <div className="divide-y divide-gray-50">
                    {/* header row */}
                    <div className="hidden sm:grid grid-cols-[auto_1fr_1.5fr_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <span>N° Fact.</span>
                      <span>Fecha</span>
                      <span>Cliente</span>
                      <span>Método</span>
                      <span>Estado</span>
                      <span className="text-right">Total</span>
                      <span></span>
                    </div>

                    {filtered.map(inv => {
                      const sm = statusMeta[inv.status] ?? statusMeta.pending;
                      const StatusIcon = sm.icon;
                      const PMIcon = paymentIcon[inv.paymentMethod ?? ''] ?? Wallet;
                      const isExpanded = expandedId === inv.id;

                      return (
                        <div key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                          {/* Main row */}
                          <div
                            className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_1.5fr_1fr_auto_auto_auto] gap-4 px-6 py-4 cursor-pointer items-center"
                            onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                          >
                            {/* Invoice # */}
                            <span className="font-black text-gray-900 text-sm font-mono bg-gray-100 px-2 py-0.5 rounded-lg">
                              #{inv.number}
                            </span>
                            {/* Date */}
                            <span className="text-sm text-gray-600">
                              {inv.date}
                              {inv.time && <span className="text-gray-400 ml-1">· {inv.time}</span>}
                            </span>
                            {/* Customer */}
                            <span className="hidden sm:block text-sm font-semibold text-gray-900 truncate">
                              {inv.customerName}
                            </span>
                            {/* Method */}
                            <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600">
                              <PMIcon size={14} className="text-gray-400" />
                              {inv.paymentMethod ?? '—'}
                            </span>
                            {/* Status */}
                            <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${sm.color}`}>
                              <StatusIcon size={11} />{sm.label}
                            </span>
                            {/* Total */}
                            <span className="text-right font-black text-gray-900 text-sm ml-auto sm:ml-0">
                              {fmt(inv.total, inv.currency)}
                            </span>
                            {/* Expand */}
                            <span className="text-gray-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </div>

                          {/* Expanded items */}
                          {isExpanded && (
                            <div className="mx-6 mb-4 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
                              <div className="px-4 py-2 bg-gray-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Productos / Servicios
                                </span>
                                <span className="text-xs text-gray-400">{inv.items.length} ítem(s)</span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {inv.items.map((item, idx) => (
                                  <div key={idx} className="px-4 py-2.5 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 truncate">{item.productName}</p>
                                      {item.description && (
                                        <p className="text-xs text-gray-400 truncate">{item.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-right flex-shrink-0">
                                      <span className="text-gray-500">
                                        {item.quantity} × {fmt(item.price, inv.currency)}
                                      </span>
                                      {item.discount ? (
                                        <span className="text-red-500 text-xs">-{item.discount}%</span>
                                      ) : null}
                                      <span className="font-bold text-gray-900 w-28">
                                        {fmt(item.total, inv.currency)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Invoice sub-totals */}
                              <div className="px-4 py-2.5 bg-gray-100 grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600">
                                <span>Subtotal: {fmt(inv.subtotal, inv.currency)}</span>
                                <span>IVA: {fmt(inv.tax, inv.currency)}</span>
                                <span className="font-black text-gray-900 text-right">
                                  Total: {fmt(inv.total, inv.currency)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Summary footer row */}
                    <div className="px-6 py-4 bg-gray-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-white font-black text-sm uppercase tracking-widest">
                        Total General · {filtered.length} factura(s)
                      </span>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-400">
                          Subtotal: <span className="text-white font-bold">{fmt(totalSubtotal)}</span>
                        </span>
                        <span className="text-gray-400">
                          IVA: <span className="text-white font-bold">{fmt(totalImpuesto)}</span>
                        </span>
                        <span className="text-white font-black text-base">
                          {fmt(totalVentas)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cancelled invoices */}
            {cancelled.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <h3 className="font-bold text-red-700 text-sm">
                    Facturas Anuladas en el Período ({cancelled.length})
                  </h3>
                </div>
                <div className="divide-y divide-red-100">
                  {cancelled.map(inv => (
                    <div key={inv.id} className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-red-800 text-sm">#{inv.number}</span>
                        <span className="text-sm text-red-600">{inv.customerName}</span>
                        <span className="text-xs text-red-400">{inv.date}</span>
                      </div>
                      <span className="text-sm font-bold text-red-500 line-through">{fmt(inv.total, inv.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print footer */}
            <div className="hidden footer" aria-hidden>
              <p>Este cierre fue generado automáticamente por Facturador AI · {new Date().toLocaleString('es-CR')}</p>
              <p>Documento no tiene validez fiscal oficial.</p>
            </div>
          </div>

          {/* Action bar */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm">
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{filtered.length} transacciones</span> · Total:{' '}
                <span className="font-black text-gray-900">{fmt(totalVentas)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-md"
                >
                  <Printer size={16} /> Imprimir
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-400 hover:text-gray-900 transition-all"
                >
                  <Download size={16} /> Exportar PDF
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CierreCaja;
