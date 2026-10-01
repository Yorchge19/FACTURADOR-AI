import React, { useState, useMemo } from 'react';
import { Invoice, Expense, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Activity, FileBarChart, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { exportReportsToPDF, exportReportsToExcel } from '../services/exportService';
import { GeminiService } from '../services/geminiService';

interface ReportsProps {
  invoices: Invoice[];
  expenses: Expense[];
  products: Product[];
}

const Reports: React.FC<ReportsProps> = ({ invoices, expenses, products }) => {
  const [dateRange, setDateRange] = useState('month'); // 'month', 'year', 'all'
  const { organization } = useOrganization();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // --- Helper Functions ---
  const filterByDate = (items: any[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return items.filter(item => {
      if (item.status === 'cancelled') return false; // Ignore cancelled
      const itemDate = new Date(item.date);
      if (dateRange === 'month') return itemDate >= startOfMonth;
      if (dateRange === 'year') return itemDate >= startOfYear;
      return true;
    });
  };

  // --- Data Processing ---
  const filteredInvoices = useMemo(() => filterByDate(invoices) as Invoice[], [invoices, dateRange]);
  const filteredExpenses = useMemo(() => filterByDate(expenses) as Expense[], [expenses, dateRange]);

  const totalSales = filteredInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0); // Assumes simplified single currency for demo
  const netProfit = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Chart Data: Sales vs Expenses
  const comparisonData = [
    { name: 'Ingresos', amount: totalSales, fill: '#000000' },
    { name: 'Gastos', amount: totalExpenses, fill: '#9ca3af' }, // gray-400
  ];

  // Top Products Logic
  const productSales = useMemo(() => {
    const salesMap: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
      });
    });
    
    return Object.entries(salesMap)
      .map(([id, qty]) => {
        const prod = products.find(p => p.id === id);
        return { name: prod?.name || 'Desconocido', qty };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredInvoices, products]);

  // Expenses by Category
  const expenseCategories = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  // Grayscale Palette
  const COLORS = ['#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];

  const handleExportPDF = () => {
    exportReportsToPDF({
      dateRange: dateRange as 'month' | 'year' | 'all',
      filteredInvoices,
      filteredExpenses,
      products,
      productSales,
      expenseCategories,
      comparisonData,
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      companyName: organization?.name,
    });
  };

  const handleExportExcel = () => {
    exportReportsToExcel({
      dateRange: dateRange as 'month' | 'year' | 'all',
      filteredInvoices,
      filteredExpenses,
      products,
      productSales,
      expenseCategories,
      comparisonData,
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      companyName: organization?.name,
    });
  };

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await GeminiService.analyzeFinancialReport({
      dateRangeLabel: dateRange === 'month' ? 'Este Mes' : dateRange === 'year' ? 'Este Año' : 'Todo el Histórico',
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      invoiceCount: filteredInvoices.length,
      expenseCount: filteredExpenses.length,
      topProducts: productSales,
      expenseCategories,
    });
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Reportes Financieros</h2>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 text-sm md:text-base">Análisis detallado del rendimiento del negocio</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex-1 sm:flex-none">
             <button onClick={() => setDateRange('month')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${dateRange === 'month' ? 'bg-gray-100 dark:bg-gray-800 text-black' : 'text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white'}`}>Este Mes</button>
             <button onClick={() => setDateRange('year')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${dateRange === 'year' ? 'bg-gray-100 dark:bg-gray-800 text-black' : 'text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white'}`}>Este Año</button>
             <button onClick={() => setDateRange('all')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${dateRange === 'all' ? 'bg-gray-100 dark:bg-gray-800 text-black' : 'text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white'}`}>Todo</button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button onClick={handleAiAnalysis} disabled={loadingAi} className="flex-1 sm:flex-none bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-4 sm:px-5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-center items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-60 text-xs sm:text-sm font-semibold">
              <Sparkles size={16} className={loadingAi ? 'animate-spin' : ''} /> {loadingAi ? 'Analizando...' : 'Analizar con IA'}
            </button>
            <button onClick={handleExportPDF} className="flex-1 sm:flex-none bg-black dark:bg-white text-white dark:text-black px-4 sm:px-5 py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white text-xs sm:text-sm font-semibold">
              <Download size={16} /> Exportar PDF
            </button>
            <button onClick={handleExportExcel} className="flex-1 sm:flex-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 sm:px-5 py-2.5 rounded-xl hover:bg-gray-50 dark:bg-gray-800 flex justify-center items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-xs sm:text-sm font-semibold">
              <FileSpreadsheet size={16} /> Exportar Excel
            </button>
          </div>
        </div>
       </div>

      {/* ── AI Result ── */}
      {aiAnalysis && (
        <div className="relative bg-black dark:bg-gray-900 dark:border dark:border-gray-700 text-white dark:text-gray-100 rounded-2xl p-5 md:p-6 overflow-hidden border border-black">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors text-xs">✕</button>
          <h3 className="font-bold flex items-center gap-2 mb-3 text-base md:text-lg">
            <Sparkles size={18} className="text-gray-300" /> Análisis Inteligente del Reporte
          </h3>
          <div className="text-sm text-gray-300 dark:text-gray-400 leading-relaxed space-y-1">
            {aiAnalysis.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
         <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={64} className="text-black"/></div>
            <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2 truncate">Ventas Totales</p>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">₡ {totalSales.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-2 flex items-center gap-1"><Calendar size={12}/> {filteredInvoices.length} facturas emitidas</p>
         </div>

         <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingDown size={64} className="text-gray-400 dark:text-gray-400"/></div>
            <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2 truncate">Gastos Totales</p>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">₡ {totalExpenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-2 flex items-center gap-1"><Activity size={12}/> {filteredExpenses.length} movimientos registrados</p>
         </div>

         <div className={`bg-white dark:bg-gray-900 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group sm:col-span-2 md:col-span-1`}>
            <div className={`absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform`}>
                <DollarSign size={64} className="text-gray-900 dark:text-white"/>
            </div>
            <p className={`text-xs md:text-sm font-bold uppercase tracking-wide mb-2 text-gray-500 dark:text-gray-400 dark:text-gray-400`}>
                Utilidad Neta
            </p>
            <h3 className={`text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate`}>
                ₡ {netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </h3>
            <p className={`text-xs font-bold mt-2 px-2 py-0.5 rounded w-fit border ${profitMargin > 0 ? 'bg-black dark:bg-white text-white dark:text-black border-black' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 dark:text-gray-400 border-gray-300'}`}>
               Margen: {profitMargin.toFixed(1)}%
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Chart: Income vs Expenses */}
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 md:mb-6">Flujo de Caja</h3>
            <div className="h-64 md:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} width={80}/>
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: '#000', color: '#fff'}} formatter={(value: number) => `₡ ${value.toLocaleString()}`} />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={40}>
                            {comparisonData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Chart: Expense Distribution */}
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
             <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Distribución de Gastos</h3>
             <div className="flex-1 min-h-[260px] md:min-h-[300px]">
                 {expenseCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={expenseCategories}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {expenseCategories.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `₡ ${value.toLocaleString()}`} contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: 8, color: '#fff'}} itemStyle={{color: '#fff'}} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                        </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl">Sin datos de gastos</div>
                 )}
             </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
             <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">Productos Más Vendidos</h3>
             <FileBarChart size={20} className="text-black flex-shrink-0"/>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[400px]">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase text-xs">
                  <tr>
                      <th className="px-6 py-3 font-semibold">Producto</th>
                      <th className="px-6 py-3 font-semibold text-right">Unidades Vendidas</th>
                      <th className="px-6 py-3 font-semibold text-right">Participación</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {productSales.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-800/50">
                          <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-black flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-700">
                                      {idx + 1}
                                  </span>
                                  {item.name}
                              </div>
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">{item.qty}</td>
                          <td className="px-6 py-3 text-right">
                             <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1 max-w-[100px] ml-auto">
                                <div className="bg-black dark:bg-white h-1.5 rounded-full" style={{width: `${(item.qty / productSales[0].qty) * 100}%`}}></div>
                             </div>
                          </td>
                      </tr>
                  ))}
                  {productSales.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-8 text-gray-400 dark:text-gray-400">No hay datos de ventas</td></tr>
                  )}
              </tbody>
          </table>
          </div>
      </div>
    </div>
  );
};

export default Reports;