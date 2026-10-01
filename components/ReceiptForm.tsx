
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, Payment, AppSettings } from '../types';
import { StorageService } from '../services/storageService';
import { logger } from '../services/logger';
import { Search, Calendar, CreditCard, DollarSign, FileText, CheckCircle2, User, Wallet, ArrowRight, Printer, Plus, X } from 'lucide-react';
import ReceiptPrint from './ReceiptPrint';

interface ReceiptFormProps {
  invoices: Invoice[];
  onAddPayment: (invoiceId: string, payment: Payment) => Promise<void>;
}

const ReceiptForm: React.FC<ReceiptFormProps> = ({ invoices, onAddPayment }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // Payment Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('Efectivo');
  const [amount, setAmount] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success / Print State
  const [completedPayment, setCompletedPayment] = useState<{payment: Payment, invoice: Invoice} | null>(null);

  // Load Settings on Mount (Needed for Print Header)
  useEffect(() => {
    const loadSettings = async () => {
        const s = await StorageService.getSettings();
        setSettings(s);
    };
    loadSettings();
  }, []);

  // Filter only pending invoices
  const pendingInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'pending')
      .filter(inv => 
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inv.number.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [invoices, searchTerm]);

  // Helper for Balance
  const getBalance = (inv: Invoice) => {
    const totalPaid = (inv.payments || []).reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, inv.total - totalPaid);
  };

  const getCurrencySymbol = (inv: Invoice) => inv.currency === 'USD' ? '$' : '₡';

  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    // Auto-fill amount with remaining balance
    setAmount(getBalance(inv));
    setNotes('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setCompletedPayment(null);
    setSelectedInvoice(null);
    setAmount('');
    setNotes('');
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const payment: Payment = {
        id: crypto.randomUUID(),
        date,
        amount: Number(amount),
        method,
        notes
      };

      await onAddPayment(selectedInvoice.id, payment);
      
      // Calculate new balance locally for the receipt preview
      const currentBalance = getBalance(selectedInvoice);
      const newBalance = Math.max(0, currentBalance - payment.amount);
      const updatedInvoice = { ...selectedInvoice, balance: newBalance };

      setCompletedPayment({
          payment,
          invoice: updatedInvoice
      });

    } catch (error) {
      logger.error('ReceiptForm: Error saving payment', error);
      alert('Error al guardar el recibo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- VIEW: SUCCESS & PRINT ---
  if (completedPayment && settings) {
      return (
          <div className="animate-fade-in pb-10 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-100px)]">
              {/* Toolbar (Hidden on Print) */}
              <div className="no-print bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-green-700">
                      <div className="p-2 bg-green-50 rounded-full border border-green-200"><CheckCircle2 size={24} /></div>
                      <div>
                          <h2 className="font-bold text-lg text-gray-900 dark:text-white">¡Recibo Generado!</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400">El pago se ha registrado en el sistema.</p>
                      </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={handleReset} className="flex-1 md:flex-none px-4 py-2 text-black hover:bg-gray-50 dark:bg-gray-800 border border-black dark:border-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm">
                          <Plus size={16} /> Nuevo
                      </button>
                      <button onClick={() => navigate('/invoices')} className="flex-1 md:flex-none px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-colors text-sm">
                          Historial
                      </button>
                      <button onClick={handlePrint} className="flex-1 md:flex-none px-6 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95 border border-black dark:border-white">
                          <Printer size={18} /> IMPRIMIR
                      </button>
                  </div>
              </div>

              {/* Preview Area */}
              <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-2 md:p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner flex justify-center">
                   <div className="bg-white dark:bg-gray-900 shadow-2xl scale-[0.6] sm:scale-90 origin-top md:scale-100 transition-transform w-full max-w-[210mm]">
                       <ReceiptPrint 
                           payment={completedPayment.payment} 
                           invoice={completedPayment.invoice} 
                           settings={settings} 
                       />
                   </div>
              </div>
          </div>
      );
  }

  // --- VIEW: FORM ---
  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      <div className="no-print">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Nuevo Recibo de Dinero</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Seleccione una factura pendiente y registre el abono</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        
        {/* LEFT COLUMN: Invoice Selector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-4">
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente o # factura..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black dark:border-white outline-none transition-all"
                />
             </div>

             <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
               {pendingInvoices.length === 0 ? (
                 <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No hay facturas pendientes</p>
                 </div>
               ) : (
                 pendingInvoices.map(inv => {
                   const balance = getBalance(inv);
                   const isSelected = selectedInvoice?.id === inv.id;
                   return (
                     <div 
                        key={inv.id}
                        onClick={() => handleSelectInvoice(inv)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black ring-2 ring-offset-2 ring-black' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                     >
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isSelected ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{inv.number}</span>
                              <h4 className={`font-bold text-sm mt-1 ${isSelected ? 'text-white dark:text-black' : 'text-gray-900 dark:text-white'}`}>{inv.customerName}</h4>
                           </div>
                           <div className="text-right">
                              <span className={`block text-xs ${isSelected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>Saldo</span>
                              <span className={`block font-bold text-lg ${isSelected ? 'text-white dark:text-black' : 'text-red-600'}`}>
                                {getCurrencySymbol(inv)} {balance.toLocaleString()}
                              </span>
                           </div>
                        </div>
                        <div className={`text-xs flex justify-between ${isSelected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                           <span>Fecha: {new Date(inv.date).toLocaleDateString()}</span>
                           <span>Total: {getCurrencySymbol(inv)} {inv.total.toLocaleString()}</span>
                        </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Form */}
        <div className="lg:col-span-7">
           {selectedInvoice ? (
             <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up sticky top-4">
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-black">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Detalles del Pago</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Factura {selectedInvoice.number}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Cliente</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedInvoice.customerName}</p>
                   </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-blue-600 font-bold uppercase mb-0.5">Saldo Pendiente Actual</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {getCurrencySymbol(selectedInvoice)} {getBalance(selectedInvoice).toLocaleString()}
                        </p>
                      </div>
                      <div className="h-10 w-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                         <DollarSign size={20} />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                           <Calendar size={16} className="text-gray-400 dark:text-gray-500" /> Fecha del Pago
                         </label>
                         <input 
                           type="date" 
                           required
                           value={date}
                           onChange={e => setDate(e.target.value)}
                           className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                         />
                      </div>

                      <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                           <CreditCard size={16} className="text-gray-400 dark:text-gray-500" /> Método de Pago
                         </label>
                         <select 
                           value={method}
                           onChange={e => setMethod(e.target.value)}
                           className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white dark:bg-gray-900"
                         >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Sinpe Movil">Sinpe Móvil</option>
                            <option value="Cheque">Cheque</option>
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <DollarSign size={16} className="text-gray-400 dark:text-gray-500" /> Monto a Pagar
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold">
                          {getCurrencySymbol(selectedInvoice)}
                        </span>
                        <input 
                          type="number"
                          step="0.01"
                          required
                          min="0.01"
                          max={getBalance(selectedInvoice)}
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all text-xl font-bold text-gray-900 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                        Máximo permitido: {getBalance(selectedInvoice).toLocaleString()}
                      </p>
                   </div>

                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText size={16} className="text-gray-400 dark:text-gray-500" /> Notas / Referencia
                      </label>
                      <textarea 
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all resize-none dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                        placeholder="Ej. Transferencia #123456 del Banco Nacional..."
                      />
                   </div>

                   <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => setSelectedInvoice(null)}
                        className="flex-1 py-3.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:bg-gray-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-[2] py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                      >
                        {isSubmitting ? 'Procesando...' : (
                          <>Generar Recibo <ArrowRight size={18} /></>
                        )}
                      </button>
                   </div>
                </form>
             </div>
           ) : (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-full shadow-sm mb-4">
                  <ArrowRight size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-1">Seleccione una Factura</h3>
                <p className="text-sm text-center max-w-xs">
                  Haga clic en una factura de la lista izquierda para desplegar el formulario de pago.
                </p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default ReceiptForm;
