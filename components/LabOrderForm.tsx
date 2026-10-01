import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Customer, Quote, Invoice, LabOrder, LabOrderItem, AppSettings } from '../types';
import { Plus, Trash2, Search, CheckCircle2, X, Printer, FileCheck, Calendar, Wrench, Building2, Ruler } from 'lucide-react';
import LabOrderPrint from './LabOrderPrint';
import { useAuth } from '../contexts/AuthContext';

interface LabOrderFormProps {
  products: Product[];
  customers: Customer[];
  quotes: Quote[];
  invoices: Invoice[];
  settings: AppSettings;
  onSaveLabOrder: (order: LabOrder) => void;
}

const LabOrderForm: React.FC<LabOrderFormProps> = ({ products, customers, quotes, invoices, settings, onSaveLabOrder }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [createdOrder, setCreatedOrder] = useState<LabOrder | null>(null);

  // Header State
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState(settings.currency || 'CRC');

  // Origin (quote or invoice to pull items from)
  const [originQuoteId, setOriginQuoteId] = useState('');
  const [originInvoiceId, setOriginInvoiceId] = useState('');

  // Workshop fields
  const [labProvider, setLabProvider] = useState('Taller propio');
  const [lensType, setLensType] = useState('');
  const [frameDetail, setFrameDetail] = useState('');
  const [measurements, setMeasurements] = useState('');
  const [notes, setNotes] = useState('');

  // Item Entry State (same shape as QuoteItem/InvoiceItem, no discounts here)
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [itemDescription, setItemDescription] = useState('');
  const [items, setItems] = useState<LabOrderItem[]>([]);

  const getCurrencySymbol = (c: string = currency) => c === 'CRC' ? '₡' : '$';

  const pullFromQuote = (quoteId: string) => {
    setOriginQuoteId(quoteId);
    setOriginInvoiceId('');
    if (!quoteId) return;
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    setCustomerId(quote.customerId);
    setCurrency(quote.currency);
    setItems(quote.items.map(it => ({ ...it })));
    if (quote.notes) setNotes(prev => (prev ? prev + ' | ' : '') + `Ref. cotización ${quote.number}`);
  };

  const pullFromInvoice = (invoiceId: string) => {
    setOriginInvoiceId(invoiceId);
    setOriginQuoteId('');
    if (!invoiceId) return;
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    setCustomerId(inv.customerId);
    setCurrency(inv.currency);
    setItems(inv.items.map(it => ({ ...it })));
    if (inv.notes) setNotes(prev => (prev ? prev + ' | ' : '') + `Ref. factura ${inv.number}`);
  };

  const handleAddItem = () => {
    if (!selectedProductId || qty < 1) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem: LabOrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      price: product.price,
      cost: product.cost || 0,
      discount: 0,
      description: itemDescription || product.description || product.name,
      total: product.price * qty,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setQty(1);
    setItemDescription('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!customerId || items.length === 0) {
      alert("Seleccione un cliente y agregue al menos un trabajo/lente.");
      return;
    }
    if (!labProvider.trim()) {
      alert("Indique el laboratorio o taller responsable.");
      return;
    }
    const customer = customers.find(c => c.id === customerId);
    const originQuote = quotes.find(q => q.id === originQuoteId);
    const originInvoice = invoices.find(i => i.id === originInvoiceId);

    const newOrder: LabOrder = {
      id: crypto.randomUUID(),
      number: `LAB-${Date.now().toString().slice(-6)}`,
      date,
      expectedDate,
      customerId,
      customerName: customer?.name || 'Desconocido',
      quoteId: originQuote?.id,
      quoteNumber: originQuote?.number,
      invoiceId: originInvoice?.id,
      invoiceNumber: originInvoice?.number,
      items,
      labProvider: labProvider.trim(),
      lensType: lensType.trim() || undefined,
      frameDetail: frameDetail.trim() || undefined,
      measurements: measurements.trim() || undefined,
      status: 'pending',
      notes,
      currency,
      createdBy: (user as any)?.uid || (user as any)?.email || undefined,
    };
    onSaveLabOrder(newOrder);
    setCreatedOrder(newOrder);
  };

  const handlePrint = () => window.print();

  const handleNewOrder = () => {
    setCreatedOrder(null);
    setItems([]);
    setCustomerId('');
    setOriginQuoteId('');
    setOriginInvoiceId('');
    setLabProvider('Taller propio');
    setLensType('');
    setFrameDetail('');
    setMeasurements('');
    setNotes('');
    setCurrency(settings.currency || 'CRC');
  };

  if (createdOrder) {
    const currentCustomer = customers.find(c => c.id === createdOrder.customerId);
    return (
      <div className="animate-fade-in flex flex-col h-[calc(100vh-100px)]">
        <div className="no-print bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-black">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700"><FileCheck size={24} /></div>
            <div>
              <h2 className="font-bold text-lg">¡Orden Guardada!</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Orden {createdOrder.number} registrada como pendiente.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => navigate('/workspace/lab-orders')} className="flex-1 md:flex-none px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-colors text-sm">Ver Órdenes</button>
            <button onClick={handleNewOrder} className="flex-1 md:flex-none px-4 py-2 text-black hover:bg-gray-50 dark:hover:bg-gray-800 border border-black dark:border-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"><Plus size={16} /> Nueva</button>
            <button onClick={handlePrint} className="flex-1 md:flex-none px-6 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95 border border-black dark:border-white"><Printer size={18} /> IMPRIMIR</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-2 md:p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner flex justify-center">
          <div className="bg-white shadow-2xl scale-[0.6] sm:scale-90 origin-top md:scale-100 transition-transform w-full max-w-[210mm]">
            <LabOrderPrint order={createdOrder} settings={settings} customer={currentCustomer} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nueva Orden de Laboratorio</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registre el trabajo a fabricar o montar en taller</p>
        </div>
        <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{new Date().toLocaleDateString('es-CR')}</div>
      </div>

      {/* HEADER: customer + origin */}
      <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <select className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm appearance-none" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">-- Buscar Cliente --</option>
                {customers.map(c => (<option key={c.id} value={c.id}>{c.name} - {c.taxId}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Desde Cotización (opcional)</label>
            <select className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" value={originQuoteId} onChange={(e) => pullFromQuote(e.target.value)}>
              <option value="">-- Sin origen --</option>
              {quotes.filter(q => q.status !== 'converted').map(q => (<option key={q.id} value={q.id}>{q.number} - {q.customerName}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Desde Factura (opcional)</label>
            <select className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" value={originInvoiceId} onChange={(e) => pullFromInvoice(e.target.value)}>
              <option value="">-- Sin origen --</option>
              {invoices.filter(i => i.status !== 'cancelled').map(i => (<option key={i.id} value={i.id}>{i.number} - {i.customerName}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Entrega Esperada</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 md:hidden" size={14} />
              <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full pl-9 md:pl-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Moneda Ref.</label>
            <select className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="CRC">Colones (₡)</option>
              <option value="USD">Dólares ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* WORKSHOP DATA */}
      <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase flex items-center gap-2 border-b pb-2 border-gray-100 dark:border-gray-800 mb-4">
          <Wrench size={16} /> Datos del Trabajo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Building2 size={12} /> Laboratorio / Taller</label>
            <input type="text" value={labProvider} onChange={e => setLabProvider(e.target.value)} placeholder="Ej. Taller propio, Lab Óptico Central" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Tipo de Lente</label>
            <input type="text" value={lensType} onChange={e => setLensType(e.target.value)} placeholder="Ej. Progresivo Premium, Bifocal FT-28" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Armazón</label>
            <input type="text" value={frameDetail} onChange={e => setFrameDetail(e.target.value)} placeholder="Ej. Marca, modelo, color, medida" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Ruler size={12} /> Medidas</label>
            <input type="text" value={measurements} onChange={e => setMeasurements(e.target.value)} placeholder="Ej. DIP 62/60, Altura 22, Puente 18" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" />
          </div>
        </div>
      </div>

      {/* ITEM ENTRY */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-end">
          <div className="w-full xl:flex-grow xl:min-w-[280px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Trabajo / Producto</label>
            <select className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" value={selectedProductId} onChange={(e) => {
              setSelectedProductId(e.target.value);
              const prod = products.find(p => p.id === e.target.value);
              setItemDescription(prod ? (prod.description || prod.name) : '');
            }}>
              <option value="">Seleccione...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.sku} - {p.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 xl:flex gap-3 w-full xl:w-auto">
            <div className="xl:w-20">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cant.</label>
              <input type="number" min="1" className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm text-center" value={qty} onChange={e => setQty(Number(e.target.value))} />
            </div>
            <div className="xl:flex-grow xl:min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Detalle</label>
              <input type="text" className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-sm" value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="OD/OI, tratamiento, etc..." />
            </div>
          </div>
          <div className="w-full xl:w-auto mt-2 xl:mt-0">
            <button onClick={handleAddItem} className="w-full xl:w-auto bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 shadow-md transition-all flex items-center justify-center gap-2 text-sm font-bold active:scale-95 h-[42px] border border-black dark:border-white">
              <Plus size={16} /> Agregar
            </button>
          </div>
        </div>
      </div>

      {/* ITEM LIST */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[160px] flex flex-col overflow-hidden">
        <div className="hidden md:grid grid-cols-12 bg-gray-50 dark:bg-gray-800 p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-6">Trabajo / Producto</div>
          <div className="col-span-2 text-center">Cant</div>
          <div className="col-span-3 text-right">Ref. Precio</div>
          <div className="col-span-1 text-center"></div>
        </div>
        <div className="flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/30">
              <span className="text-sm">Agregue trabajos o cargue desde cotización/factura.</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, idx) => (
                <div key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="hidden md:grid grid-cols-12 p-3 text-sm items-center">
                    <div className="col-span-6">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{item.productName}</div>
                      {item.description && item.description !== item.productName && (<div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</div>)}
                    </div>
                    <div className="col-span-2 text-center text-gray-700 dark:text-gray-300">{item.quantity}</div>
                    <div className="col-span-3 text-right text-gray-700 dark:text-gray-300">{getCurrencySymbol()} {item.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    <div className="col-span-1 text-center">
                      <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 transition-colors p-1"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="md:hidden p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{item.productName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Cant: {item.quantity} · {getCurrencySymbol()}{item.total.toLocaleString('en-US')}</div>
                    </div>
                    <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Notas de taller</label>
          <textarea rows={2} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none resize-none bg-white dark:bg-gray-900" placeholder="Indicaciones especiales para el laboratorio..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button onClick={() => navigate('/workspace/lab-orders')} className="flex-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition-all flex justify-center items-center gap-2 active:scale-95 text-sm">
          <X size={18} /> Cancelar
        </button>
        <button onClick={handleSubmit} className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold shadow-lg shadow-gray-300 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex justify-center items-center gap-2 active:scale-95 text-sm border border-black dark:border-white">
          <CheckCircle2 size={18} /> Guardar Orden
        </button>
      </div>
    </div>
  );
};

export default LabOrderForm;
