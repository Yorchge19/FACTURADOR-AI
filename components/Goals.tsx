import React, { useState, useMemo } from 'react';
import { DailyEntry, AppSettings } from '../types';
import { Plus, Trash2, Target, TrendingUp, TrendingDown, Calendar, DollarSign, Flag, PiggyBank, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GeminiService } from '../services/geminiService';

interface GoalsProps {
  entries: DailyEntry[];
  settings: AppSettings;
  onSaveEntry: (entry: DailyEntry) => void;
  onDeleteEntry: (id: string) => void;
  onSaveSettings: (s: AppSettings) => void;
}

const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const daysInMonthOf = (monthStr: string) => {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const Goals: React.FC<GoalsProps> = ({ entries, settings, onSaveEntry, onDeleteEntry, onSaveSettings }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(currentMonthStr());
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [formData, setFormData] = useState<Partial<DailyEntry>>({
    date: new Date().toISOString().split('T')[0],
    type: 'income',
    amount: 0,
    currency: settings.currency || 'CRC',
    note: '',
  });

  const target = settings.monthlyGoalTarget ?? 0;
  const currencySymbol = (settings.currency || 'CRC') === 'USD' ? '$' : '₡';

  const monthEntries = useMemo(() =>
    entries.filter(e => (e.date || '').slice(0, 7) === viewMonth),
  [entries, viewMonth]);

  const income = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((acc, e) => acc + (e.amount || 0), 0),
  [monthEntries]);

  const monthExpenses = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((acc, e) => acc + (e.amount || 0), 0),
  [monthEntries]);

  const monthRelation = useMemo(() => {
    const cur = currentMonthStr();
    if (viewMonth === cur) return 'current' as const;
    return viewMonth < cur ? 'past' as const : 'future' as const;
  }, [viewMonth]);

  const daysInMonth = daysInMonthOf(viewMonth);
  const todayDay = new Date().getDate();
  const elapsedDays = monthRelation === 'current' ? todayDay : monthRelation === 'past' ? daysInMonth : 0;
  const remainingDays = monthRelation === 'current'
    ? Math.max(daysInMonth - todayDay + 1, 1)
    : monthRelation === 'future' ? daysInMonth : 0;

  const remaining = Math.max(target - income, 0);
  const progress = target > 0 ? Math.min((income / target) * 100, 100) : 0;
  const goalMet = target > 0 && income >= target;
  const neededPerDay = target > 0 && remainingDays > 0 && !goalMet ? remaining / remainingDays : 0;
  const avgPerDay = elapsedDays > 0 ? income / elapsedDays : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.amount || formData.amount <= 0) {
      alert('Ingrese una fecha y un monto mayor a cero.');
      return;
    }
    const newEntry: DailyEntry = {
      id: crypto.randomUUID(),
      date: formData.date,
      type: formData.type === 'expense' ? 'expense' : 'income',
      amount: Number(formData.amount),
      currency: formData.currency || settings.currency || 'CRC',
      note: formData.note?.trim() || undefined,
      createdBy: (user as any)?.uid || (user as any)?.email || undefined,
    };
    onSaveEntry(newEntry);
    setIsModalOpen(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      amount: 0,
      currency: settings.currency || 'CRC',
      note: '',
    });
  };

  const handleSaveGoal = () => {
    const value = Number(goalInput);
    if (isNaN(value) || value < 0) {
      alert('Ingrese una meta válida mayor o igual a cero.');
      return;
    }
    onSaveSettings({ ...settings, monthlyGoalTarget: value });
    setIsEditingGoal(false);
  };

  const openGoalEditor = () => {
    setGoalInput(String(target || ''));
    setIsEditingGoal(true);
  };

  const monthLabel = new Date(viewMonth + '-01T00:00:00').toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await GeminiService.analyzeGoalProgress({
      monthLabel,
      target,
      accumulated: income,
      progress,
      remaining,
      remainingDays,
      neededPerDay,
      avgPerDay,
      monthExpenses,
    });
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-sm">
              <Target size={18} className="text-white dark:text-black" />
            </span>
            Metas de Venta
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Registre los montos diarios y siga el avance de la meta mensual</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleAiAnalysis}
            disabled={loadingAi || target <= 0}
            title={target <= 0 ? 'Establezca primero una meta mensual' : 'Analizar avance con IA'}
            className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-60 active:scale-95"
          >
            <Sparkles size={18} className={loadingAi ? 'animate-spin' : ''} />
            {loadingAi ? 'Analizando...' : 'Analizar con IA'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white"
          >
            <Plus size={20} /> Registrar Monto
          </button>
        </div>
      </div>

      {/* ── AI Result ── */}
      {aiAnalysis && (
        <div className="relative bg-black dark:bg-gray-900 dark:border dark:border-gray-700 text-white dark:text-gray-100 rounded-2xl p-5 md:p-6 overflow-hidden border border-black">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors text-xs">✕</button>
          <h3 className="font-bold flex items-center gap-2 mb-3 text-base md:text-lg">
            <Sparkles size={18} className="text-gray-300" /> Análisis Inteligente de la Meta ({monthLabel})
          </h3>
          <div className="text-sm text-gray-300 dark:text-gray-400 leading-relaxed space-y-1">
            {aiAnalysis.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}

      {/* Month selector */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" /> Mes a consultar
        </label>
        <input
          type="month"
          value={viewMonth}
          onChange={e => setViewMonth(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm"
        />
        {monthRelation !== 'current' && (
          <button onClick={() => setViewMonth(currentMonthStr())} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline">
            Volver al mes actual
          </button>
        )}
      </div>

      {/* Goal + progress */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Flag size={12} /> Meta mensual {monthRelation === 'current' ? '(mes actual)' : `(${viewMonth})`}
            </p>
            {!isEditingGoal ? (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {target > 0 ? `${currencySymbol} ${target.toLocaleString()}` : 'Sin meta definida'}
                </h3>
                <button onClick={openGoalEditor} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {target > 0 ? 'Cambiar meta' : 'Establecer meta'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{currencySymbol}</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    placeholder="Ej. 2000000"
                    autoFocus
                    className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none font-bold"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveGoal} className="flex-1 sm:flex-none px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 text-sm">Guardar</button>
                  <button onClick={() => setIsEditingGoal(false)} className="flex-1 sm:flex-none px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm">Cancelar</button>
                </div>
              </div>
            )}
          </div>
          {target > 0 && (
            <div className={`text-center px-5 py-3 rounded-2xl border ${goalMet ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'}`}>
              <p className="text-3xl font-black leading-none">{progress.toFixed(1)}%</p>
              <p className="text-[11px] font-bold uppercase tracking-wide mt-1 opacity-70">{goalMet ? '¡Meta cumplida!' : 'de la meta'}</p>
            </div>
          )}
        </div>

        {target > 0 ? (
          <div className="p-5 md:p-6 space-y-5">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                <span>Acumulado: {currencySymbol} {income.toLocaleString()}</span>
                <span>Faltante: {currencySymbol} {remaining.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="bg-black dark:bg-white h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1"><DollarSign size={12} /> Se necesita por día</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {monthRelation === 'past' ? '—' : goalMet ? `${currencySymbol} 0` : `${currencySymbol} ${Math.ceil(neededPerDay).toLocaleString()}`}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {monthRelation === 'current'
                    ? goalMet ? 'Meta ya alcanzada este mes' : `entre ${remainingDays} día${remainingDays !== 1 ? 's' : ''} restante${remainingDays !== 1 ? 's' : ''} (incluye hoy)`
                    : monthRelation === 'future' ? `promedio diario para todo el mes (${daysInMonth} días)` : 'mes cerrado'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1"><TrendingUp size={12} /> Promedio diario logrado</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{currencySymbol} {Math.round(avgPerDay).toLocaleString()}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {elapsedDays > 0 ? `en ${elapsedDays} día${elapsedDays !== 1 ? 's' : ''} transcurridos` : 'aún no inicia el mes'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1"><PiggyBank size={12} /> Gastos del mes</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{currencySymbol} {monthExpenses.toLocaleString()}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1"><TrendingDown size={12} /> Neto: {currencySymbol} {(income - monthExpenses).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            Establezca una meta mensual para ver el porcentaje de avance y el monto diario necesario.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {monthEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <DollarSign size={48} strokeWidth={1} className="opacity-40" />
            <p className="mt-2 font-medium">Sin montos registrados este mes</p>
          </div>
        ) : (
          monthEntries.map(e => (
            <div key={e.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide mb-1 ${e.type === 'income' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                  {e.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
                <p className="font-bold text-gray-900 dark:text-white">{e.currency === 'USD' ? '$' : '₡'} {e.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-CR')}{e.note ? ` · ${e.note}` : ''}</p>
              </div>
              <button onClick={() => onDeleteEntry(e.id)} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:text-red-600" title="Eliminar">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Nota</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {monthEntries.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">Sin montos registrados este mes.</td></tr>
              ) : (
                monthEntries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-CR')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${e.type === 'income' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                        {e.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 truncate max-w-[220px]">{e.note || '—'}</td>
                    <td className={`px-6 py-4 text-right font-bold ${e.type === 'income' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {e.type === 'income' ? '+' : '−'}{e.currency === 'USD' ? '$' : '₡'} {e.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => onDeleteEntry(e.id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up md:animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Registrar Monto Diario</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monto hecho en el día (venta u otro ingreso/gasto)</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Calendar size={14} /> Fecha</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white">
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><DollarSign size={14} /> Monto</label>
                <div className="relative">
                  <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="absolute left-0 top-0 bottom-0 w-16 pl-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 rounded-l-xl text-xs font-bold outline-none dark:text-white">
                    <option value="CRC">CRC</option>
                    <option value="USD">USD</option>
                  </select>
                  <input required type="number" min="0.01" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })} placeholder="0.00" className="w-full pl-20 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white font-bold bg-white dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nota (opcional)</label>
                <input type="text" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Ej. Ventas del día, caja 1..." className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl w-full sm:w-auto">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-medium shadow-lg shadow-gray-200 w-full sm:w-auto border border-black dark:border-white">Guardar Monto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
