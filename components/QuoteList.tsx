import React, { useState } from 'react';
import { Quote, AppSettings, Customer } from '../types';
import { Eye, Printer, FileText, X, FileSpreadsheet, Clock, CheckCircle, AlertTriangle, ArrowRight, Ban, History } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { useNavigate } from 'react-router-dom';
import QuotePrint from './QuotePrint';

interface QuoteListProps {
  quotes: Quote[];
  onUpdateStatus: (quoteId: string, status: Quote['status'], convertedInvoiceId?: string) => void;
  settings?: AppSettings;
}

const QuoteList: React.FC<QuoteListProps> = ({ quotes, onUpdateStatus, settings: propSettings }) => {
  const navigate = useNavigate();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [printSettings, setPrintSettings] = useState<AppSettings | null>(propSettings || null);
  const [printCustomer, setPrintCustomer] = useState<Customer | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'draft':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 w-fit"><FileText size={12} /> BORRADOR</span>;
      case 'sent':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 w-fit"><Clock size={12} /> ENVIADA</span>;
      case 'accepted':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 w-fit"><CheckCircle size={12} /> ACEPTADA</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded-full border border-red-200 w-fit"><X size={12} /> RECHAZADA</span>;
      case 'expired':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 w-fit"><AlertTriangle size={12} /> VENCIDA</span>;
      case 'converted':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded-full border border-violet-200 w-fit"><ArrowRight size={12} /> CONVERTIDA</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-200 w-fit">{(status as string).toUpperCase()}</span>;
    }
  };

  const getCurrencySymbol = (q: Quote) => q.currency === 'USD' ? '$' : '₡';

  const handlePrint = async (quote: Quote) => {
    const s = propSettings || await StorageService.getSettings();
    const customers = await StorageService.getCustomers();
    const customer = customers.find(c => c.id === quote.customerId);
    setPrintSettings(s);
    setPrintCustomer(customer);
    setSelectedQuote(quote);
    setTimeout(() => window.print(), 100);
  };

  const handleConvert = (quote: Quote) => {
    if (quote.status === 'converted') return;
    if (!confirm(`¿Convertir cotización ${quote.number} en factura? Se pre-cargará la pantalla de facturación.`)) return;
    const newInvoiceId = crypto.randomUUID();
    onUpdateStatus(quote.id, 'converted', newInvoiceId);
    navigate('/workspace/create-invoice', {
      state: {
        prefillFromQuote: {
          customerId: quote.customerId,
          customerName: quote.customerName,
          items: quote.items,
          currency: quote.currency,
          notes: quote.notes,
          convertedQuoteId: quote.id,
          convertedInvoiceId: newInvoiceId,
        }
      }
    });
  };

  const filteredQuotes = statusFilter === 'all' ? quotes : quotes.filter(q => q.status === statusFilter);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Cotizaciones</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Presupuestos y cotizaciones a clientes</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none">
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="sent">Enviada</option>
            <option value="accepted">Aceptada</option>
            <option value="rejected">Rechazada</option>
            <option value="expired">Vencida</option>
            <option value="converted">Convertida</option>
          </select>
          <button onClick={() => navigate('/workspace/create-quote')} className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white text-sm font-semibold">
            <FileSpreadsheet size={18} /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <FileSpreadsheet size={48} strokeWidth={1} />
            <p className="mt-2 font-medium">No hay cotizaciones</p>
            <p className="text-xs">Crea tu primera cotización</p>
          </div>
        ) : (
          filteredQuotes.map(q => (
            <div key={q.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{q.number}</p>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{q.customerName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Emisión: {new Date(q.date).toLocaleDateString('es-CR')} · Válido hasta: {new Date(q.validUntil + 'T00:00:00').toLocaleDateString('es-CR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{getCurrencySymbol(q)} {q.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                  <div className="flex justify-end mt-1">{getStatusBadge(q.status)}</div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-gray-800 mt-2 gap-2">
                <select value={q.status} onChange={e => onUpdateStatus(q.id, e.target.value as Quote['status'])} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <option value="draft">Borrador</option>
                  <option value="sent">Enviada</option>
                  <option value="accepted">Aceptada</option>
                  <option value="rejected">Rechazada</option>
                  <option value="expired">Vencida</option>
                  <option value="converted">Convertida</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => handlePrint(q)} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white" title="Ver / Imprimir"><Eye size={16} className="hidden" /><Printer size={16} /></button>
                  {q.status !== 'converted' && (
                    <button onClick={() => handleConvert(q)} className="px-3 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-800 dark:hover:bg-gray-200" title="Convertir en Factura"><ArrowRight size={14} /> Convertir</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Válido hasta</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredQuotes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400 dark:text-gray-500">No hay cotizaciones que coincidan con el filtro.</td></tr>
              ) : (
                filteredQuotes.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-black dark:text-white">{q.number}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{q.customerName}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(q.date).toLocaleDateString('es-CR')}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(q.validUntil + 'T00:00:00').toLocaleDateString('es-CR')}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{getCurrencySymbol(q)} {q.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(q.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2 items-center">
                        <button onClick={() => handlePrint(q)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Ver / Imprimir"><Printer size={16} /></button>
                        <select value={q.status} onChange={e => onUpdateStatus(q.id, e.target.value as Quote['status'])} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800">
                          <option value="draft">Borrador</option>
                          <option value="sent">Enviada</option>
                          <option value="accepted">Aceptada</option>
                          <option value="rejected">Rechazada</option>
                          <option value="expired">Vencida</option>
                          <option value="converted">Convertida</option>
                        </select>
                        {q.status !== 'converted' ? (
                          <button onClick={() => handleConvert(q)} className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-800 dark:hover:bg-gray-200" title="Convertir en Factura"><ArrowRight size={12} /> Convertir</button>
                        ) : (
                          <span className="text-xs text-gray-400">Convertida</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print preview modal */}
      {selectedQuote && printSettings && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex justify-center items-start overflow-auto p-0 md:p-10 print:p-0 print:block hidden md:flex">
          <button onClick={() => setSelectedQuote(null)} className="fixed top-4 right-4 bg-black dark:bg-white text-white dark:text-black p-2 rounded-full shadow-lg z-50 hover:bg-gray-800"><X size={20} /></button>
          <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:w-full">
            <QuotePrint quote={selectedQuote} settings={printSettings} customer={printCustomer} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteList;
