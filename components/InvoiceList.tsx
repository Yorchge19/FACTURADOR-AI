
import React, { useState, useEffect } from 'react';
import { Invoice, AppSettings, Customer, Payment } from '../types';
import { Eye, Printer, FileText, X, CheckCircle, AlertTriangle, Clock, Ban, FileWarning, ChevronRight, Banknote, Calendar, CreditCard, DollarSign, History } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { logger } from '../services/logger';
import InvoicePrint from './InvoicePrint';
import ReceiptPrint from './ReceiptPrint';

interface InvoiceListProps {
  invoices: Invoice[];
  onCancelInvoice: (invoice: Invoice) => void;
  onAddPayment: (invoiceId: string, payment: Payment) => Promise<void>;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onCancelInvoice, onAddPayment }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printSettings, setPrintSettings] = useState<AppSettings | null>(null);
  const [printCustomer, setPrintCustomer] = useState<Customer | undefined>(undefined);
  
  // Settings for Receipts
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState<Partial<Payment>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'Efectivo',
    notes: ''
  });

  // Receipt Success Modal State
  const [receiptData, setReceiptData] = useState<{payment: Payment, invoice: Invoice} | null>(null);

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    StorageService.getSettings().then(setSettings);
  }, []);

  // Helper to safely get balance (Fixes NaN issue)
  const getEffectiveBalance = (inv: Invoice) => {
    // Check if balance exists and is a valid number
    if (inv.balance !== undefined && inv.balance !== null && !isNaN(inv.balance)) {
      return inv.balance;
    }
    // Fallback: Calculate from Total - Sum of Payments
    const totalPaid = (inv.payments || []).reduce((acc, p) => acc + p.amount, 0);
    // Ensure we don't return negative due to tiny floating point diffs
    return Math.max(0, inv.total - totalPaid);
  };

  // Helper to get status styles (Grayscale edition)
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-gray-900 text-white dark:text-black border-gray-900';
      case 'pending': return 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-400 border-2 border-dashed';
      case 'cancelled': return 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 line-through';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
     switch (status) {
      case 'paid': return 'Pagada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'ANULADA';
      default: return status;
    }
  }

  const getHaciendaStatusBadge = (status?: string) => {
    switch (status) {
      case 'aceptado': 
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-black bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 w-fit">
            <CheckCircle size={12} /> ACEPTADA
          </span>
        );
      case 'rechazado': 
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-200 px-2 py-1 rounded-full border border-gray-300 w-fit">
            <X size={12} /> RECHAZADA
          </span>
        );
      case 'procesando': 
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded-full border border-dashed border-gray-400 w-fit">
            <Clock size={12} /> PROCESANDO
          </span>
        );
      case 'anulado': 
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 w-fit">
            <FileWarning size={12} /> ANULADA
          </span>
        );
      default:
         return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 w-fit">
            NO ENVIADA
          </span>
        );
    }
  }

  const getCurrencySymbol = (inv: Invoice) => {
    if (inv.currency === 'CRC') return '₡';
    if (inv.currency === 'USD') return '$';
    return '₡';
  };

  const handlePrint = async (invoice: Invoice) => {
    // Fetch data needed for printing if not already available in context
    const settings = await StorageService.getSettings();
    const customers = await StorageService.getCustomers();
    const customer = customers.find(c => c.id === invoice.customerId);

    setPrintSettings(settings);
    setPrintCustomer(customer);
    setSelectedInvoice(invoice);
    
    // Small timeout to allow render then print
    setTimeout(() => {
        window.print();
    }, 100);
  };

  const openPaymentModal = (invoice: Invoice) => {
      setPayInvoice(invoice);
      const safeBalance = getEffectiveBalance(invoice);
      setPaymentData({
          date: new Date().toISOString().split('T')[0],
          amount: safeBalance, // Use safe balance
          method: 'Efectivo',
          notes: ''
      });
      setIsPayModalOpen(true);
  };

  const openHistoryModal = (invoice: Invoice) => {
      setHistoryInvoice(invoice);
      setIsHistoryModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!payInvoice || !paymentData.amount || paymentData.amount <= 0) return;

      const safeBalance = getEffectiveBalance(payInvoice);

      if (paymentData.amount > safeBalance) {
          alert('El monto no puede ser mayor al saldo pendiente.');
          return;
      }

      const newPayment: Payment = {
          id: crypto.randomUUID(),
          date: paymentData.date!,
          amount: paymentData.amount!,
          method: paymentData.method!,
          notes: paymentData.notes
      };

      try {
        await onAddPayment(payInvoice.id, newPayment);
        
        // Prepare Receipt Data (Calculate new state locally for preview)
        const newBalance = Math.max(0, safeBalance - newPayment.amount);
        const updatedInvoice = { ...payInvoice, balance: newBalance };

        setReceiptData({
            payment: newPayment,
            invoice: updatedInvoice
        });
        
        setIsPayModalOpen(false);
      } catch (error) {
        logger.error('InvoiceList: Failed to add payment', error);
        alert("Hubo un error al guardar el pago. Por favor intente nuevamente.");
      }
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Historial de Facturas</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Registro completo de movimientos electrónicos</p>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {invoices.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <FileText size={48} strokeWidth={1} />
              <p className="mt-2 font-medium">No hay facturas registradas</p>
           </div>
        ) : (
          invoices.map(inv => (
            <div key={inv.id} className={`bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border ${inv.status === 'cancelled' ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'} relative overflow-hidden`}>
              {inv.status === 'cancelled' && <div className="absolute top-0 right-0 bg-gray-200 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-bl-lg text-[10px] font-bold uppercase">Anulada</div>}
              
              <div className="flex justify-between items-start mb-3">
                <div>
                   <p className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{inv.number}</p>
                   <h3 className="font-bold text-gray-900 dark:text-white text-lg">{inv.customerName}</h3>
                   <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(inv.date).toLocaleDateString()} • {new Date(inv.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="text-right">
                   <p className={`text-lg font-bold ${inv.status === 'cancelled' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                     {getCurrencySymbol(inv)} {inv.total.toLocaleString('en-US', {minimumFractionDigits: 2})}
                   </p>
                   {inv.status === 'pending' && (
                       <p className="text-xs font-bold text-red-600 mt-1">Saldo: {getCurrencySymbol(inv)} {getEffectiveBalance(inv).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                   )}
                   <div className="flex justify-end mt-1">
                     {getHaciendaStatusBadge(inv.haciendaStatus)}
                   </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-2">
                 <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusStyles(inv.status)}`}>
                    {getStatusLabel(inv.status)}
                 </span>
                 <div className="flex gap-2">
                    {/* View History Button */}
                    <button onClick={() => openHistoryModal(inv)} className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg active:scale-95 transition-all border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:bg-gray-800" title="Ver Historial Pagos">
                        <History size={18} />
                    </button>
                    {inv.status === 'pending' && (
                        <button onClick={() => openPaymentModal(inv)} className="p-2 bg-green-50 text-green-700 rounded-lg active:scale-95 transition-all border border-green-200 hover:bg-green-100" title="Abonar">
                            <Banknote size={18} />
                        </button>
                    )}
                    {inv.status !== 'cancelled' && (
                      <button onClick={() => onCancelInvoice(inv)} className="p-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-lg active:scale-95 transition-all border border-gray-200 dark:border-gray-700 hover:text-red-600">
                        <Ban size={18} />
                      </button>
                    )}
                    <button onClick={() => handlePrint(inv)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg active:scale-95 transition-all shadow-md flex items-center gap-2 font-medium text-sm border border-black hover:bg-gray-800 dark:hover:bg-gray-200">
                      <Printer size={16} />
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Número / Hacienda</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Fecha Emisión</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Saldo</th>
                <th className="px-6 py-4 text-center">Estado Pago</th>
                <th className="px-6 py-4 text-center rounded-tr-2xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-60">
                        <FileText size={48} strokeWidth={1} />
                        <p className="mt-2 font-medium">No hay facturas registradas</p>
                      </div>
                   </td>
                 </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className={`transition-colors group ${inv.status === 'cancelled' ? 'bg-gray-50 dark:bg-gray-800 opacity-75' : 'hover:bg-gray-50 dark:bg-gray-800'}`}>
                    <td className="px-6 py-4">
                       <div className={`font-mono font-medium ${inv.status === 'cancelled' ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-400' : 'text-black'}`}>{inv.number}</div>
                       <div className="mt-1">
                          {getHaciendaStatusBadge(inv.haciendaStatus)}
                       </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{inv.customerName}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className={`px-6 py-4 text-right font-bold ${inv.status === 'cancelled' ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-400' : 'text-gray-900 dark:text-white'}`}>{getCurrencySymbol(inv)} {inv.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600 dark:text-gray-400">
                        {inv.status === 'pending' 
                            ? <span className="text-red-600">{getCurrencySymbol(inv)} {getEffectiveBalance(inv).toLocaleString('en-US', {minimumFractionDigits: 2})}</span> 
                            : '-'
                        }
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(inv.status)}`}>
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        {/* History Button */}
                        <button 
                            onClick={() => openHistoryModal(inv)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-black hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
                            title="Ver Historial de Pagos"
                        >
                            <History size={18} />
                        </button>
                        
                        {inv.status === 'pending' && (
                            <button 
                                onClick={() => openPaymentModal(inv)}
                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                title="Agregar Recibo / Abonar"
                            >
                                <Banknote size={18} />
                            </button>
                        )}
                        <button 
                          onClick={() => handlePrint(inv)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-black hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors" 
                          title="Imprimir"
                        >
                          <Printer size={18} />
                        </button>
                        
                        {inv.status !== 'cancelled' && (
                          <button 
                            onClick={() => onCancelInvoice(inv)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:border-gray-700" 
                            title="Anular Factura (Devolver Stock)"
                          >
                            <Ban size={18} />
                          </button>
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

      {/* Payment Modal */}
      {isPayModalOpen && payInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Nuevo Recibo</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Abonar a Factura {payInvoice.number}</p>
                      </div>
                      <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-black"><X size={20} /></button>
                  </div>
                  
                  <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-500 dark:text-gray-400">Total Factura:</span>
                              <span className="font-semibold">{getCurrencySymbol(payInvoice)} {payInvoice.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Saldo Pendiente:</span>
                              <span className="font-bold text-red-600">{getCurrencySymbol(payInvoice)} {getEffectiveBalance(payInvoice).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><Calendar size={12}/> Fecha Pago</label>
                          <input required type="date" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" />
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><CreditCard size={12}/> Método</label>
                          <select value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white dark:bg-gray-900">
                              <option value="Efectivo">Efectivo</option>
                              <option value="Tarjeta">Tarjeta</option>
                              <option value="Transferencia">Transferencia</option>
                              <option value="Sinpe Movil">Sinpe Móvil</option>
                          </select>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><DollarSign size={12}/> Monto a Pagar</label>
                          <input 
                              required 
                              type="number" 
                              step="0.01" 
                              max={getEffectiveBalance(payInvoice)} 
                              value={paymentData.amount} 
                              onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})} 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-lg" 
                          />
                      </div>
                      
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Notas</label>
                          <textarea rows={2} value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none resize-none" placeholder="Referencia bancaria, etc..." />
                      </div>

                      <button type="submit" className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg font-bold shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-95 mt-2">
                          Registrar Pago
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Receipt Success / Print Modal */}
      {receiptData && settings && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                  {/* Toolbar */}
                  <div className="bg-gray-900 p-4 flex justify-between items-center shrink-0 text-white dark:text-black border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-full text-white dark:text-black shadow-lg shadow-green-900/50"><CheckCircle size={24} /></div>
                            <div>
                                <h3 className="font-bold text-lg">Pago Registrado Exitosamente</h3>
                                <p className="text-xs text-gray-300">Se ha generado el comprobante de pago.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => window.print()} className="px-6 py-2.5 bg-white dark:bg-gray-900 text-black rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 active:scale-95">
                                <Printer size={18} /> Imprimir Comprobante
                            </button>
                            <button onClick={handleCloseReceipt} className="px-4 py-2.5 bg-gray-800 text-white dark:text-black border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors">
                                <X size={18} /> Cerrar
                            </button>
                        </div>
                  </div>
                  
                  {/* Preview Content */}
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto p-4 md:p-8 flex justify-center">
                      <div className="w-full max-w-[210mm] shadow-2xl bg-white dark:bg-gray-900 origin-top transform transition-transform">
                          <ReceiptPrint payment={receiptData.payment} invoice={receiptData.invoice} settings={settings} />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && historyInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Historial de Pagos</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Factura {historyInvoice.number} - {historyInvoice.customerName}</p>
                      </div>
                      <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-black"><X size={20} /></button>
                  </div>
                  
                  <div className="p-6">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 grid grid-cols-2 gap-4 text-center">
                          <div>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Total Factura</span>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{getCurrencySymbol(historyInvoice)} {historyInvoice.total.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Saldo Pendiente</span>
                            <span className="text-lg font-bold text-red-600">{getCurrencySymbol(historyInvoice)} {getEffectiveBalance(historyInvoice).toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left">Fecha</th>
                                    <th className="px-3 py-2 text-left">Método</th>
                                    <th className="px-3 py-2 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {!historyInvoice.payments || historyInvoice.payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">
                                            No hay pagos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    historyInvoice.payments.map((payment, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-800">
                                            <td className="px-3 py-2.5">
                                                <div className="font-medium text-gray-900 dark:text-white">{new Date(payment.date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="text-gray-700 dark:text-gray-300">{payment.method}</div>
                                                {payment.notes && <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{payment.notes}</div>}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-bold text-gray-900 dark:text-white">
                                                {getCurrencySymbol(historyInvoice)} {payment.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                      </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                      <button onClick={() => setIsHistoryModalOpen(false)} className="px-4 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 font-medium text-sm">
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Hidden Print Modal / Area - Only visible when printing */}
      {selectedInvoice && printSettings && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex justify-center items-start overflow-auto p-0 md:p-10 print:p-0 print:block hidden md:flex">
           {/* Close button for the preview mode (hidden when printing) */}
           <button 
             onClick={() => setSelectedInvoice(null)} 
             className="fixed top-4 right-4 bg-black dark:bg-white text-white dark:text-black p-2 rounded-full shadow-lg no-print z-50 hover:bg-gray-800 dark:hover:bg-gray-200"
           >
             <X size={20} />
           </button>
           
           {/* Container for screen preview, print area overrides this */}
           <div className="bg-white dark:bg-gray-900 shadow-2xl w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:w-full print:h-auto">
             <InvoicePrint invoice={selectedInvoice} settings={printSettings} customer={printCustomer} />
           </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
