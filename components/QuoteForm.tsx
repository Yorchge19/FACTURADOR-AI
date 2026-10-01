import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Customer, Quote, QuoteItem, AppSettings } from '../types';
import { Plus, Trash2, Search, CheckCircle2, X, Printer, ArrowRight, FileCheck, Wallet, RefreshCw, Calendar, Percent } from 'lucide-react';
import QuotePrint from './QuotePrint';
import { useAuth } from '../contexts/AuthContext';

interface QuoteFormProps {
  products: Product[];
  customers: Customer[];
  settings: AppSettings;
  onSaveQuote: (quote: Quote) => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ products, customers, settings, onSaveQuote }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [createdQuote, setCreatedQuote] = useState<Quote | null>(null);

  // Header State
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState(settings.currency || 'CRC');
  const [globalDiscount, setGlobalDiscount] = useState(0);

  useEffect(() => {
    if (settings.currency) setCurrency(settings.currency);
  }, [settings]);

  // Item Entry State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [itemDescription, setItemDescription] = useState('');
  const [isService, setIsService] = useState(false);
  const [conversionInfo, setConversionInfo] = useState<string>('');

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState('');

  const getCurrencySymbol = (c: string = currency) => c === 'CRC' ? '₡' : '$';

  const getExchangeRate = () => {
    const rate = Number(settings.exchangeRate);
    return rate > 0 ? rate : 520;
  };

  const calculateConvertedPrice = (price: number, prodCurrency: string, invoiceCurrency: string) => {
    const from = (prodCurrency || 'CRC').toUpperCase().trim();
    const to = (invoiceCurrency || 'CRC').toUpperCase().trim();
    const rate = getExchangeRate();
    if (from === to) { setConversionInfo(''); return price; }
    if (from === 'USD' && to === 'CRC') { setConversionInfo(`Conversión: $${price} x ${rate}`); return price * rate; }
    if (from === 'CRC' && to === 'USD') { setConversionInfo(`Conversión: ₡${price} / ${rate}`); return price / rate; }
    setConversionInfo('');
    return price;
  };

  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        const newPrice = calculateConvertedPrice(prod.price, prod.currency, currency);
        setUnitPrice(Number(newPrice.toFixed(2)));
      }
    }
  }, [currency, settings.exchangeRate]);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setItemDescription(prod.description || prod.name);
      const convertedPrice = calculateConvertedPrice(prod.price, prod.currency, currency);
      setUnitPrice(Number(convertedPrice.toFixed(2)));
    } else {
      setUnitPrice(0);
      setItemDescription('');
      setConversionInfo('');
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || qty < 1) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const finalPrice = unitPrice;
    const baseTotal = finalPrice * qty;
    const discountAmount = (baseTotal * itemDiscount) / 100;
    const total = baseTotal - discountAmount;

    const newItem: QuoteItem = {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      price: finalPrice,
      cost: product.cost || 0,
      discount: itemDiscount,
      description: itemDescription,
      total: total
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setUnitPrice(0);
    setQty(1);
    setItemDiscount(0);
    setItemDescription('');
    setConversionInfo('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const gd = Math.min(100, Math.max(0, Number(globalDiscount) || 0));
    const globalDiscountAmount = subtotal * (gd / 100);
    const baseImponible = subtotal - globalDiscountAmount;
    const tax = (baseImponible * settings.taxRate) / 100;
    const total = baseImponible + tax;
    return { subtotal, globalDiscountAmount, baseImponible, tax, total };
  };

  const { subtotal, globalDiscountAmount, baseImponible, tax, total } = calculateTotals();

  const handleSubmit = () => {
    if (!customerId || items.length === 0) {
      alert("Seleccione un cliente y agregue al menos un producto.");
      return;
    }
    const customer = customers.find(c => c.id === customerId);
    const newQuote: Quote = {
      id: crypto.randomUUID(),
      number: `COT-${Date.now().toString().slice(-6)}`,
      customerId,
      customerName: customer?.name || 'Desconocido',
      date,
      validUntil,
      items,
      subtotal,
      globalDiscount: Number(globalDiscount) || 0,
      globalDiscountAmount,
      tax,
      total,
      status: 'draft',
      notes,
      currency,
      exchangeRate: settings.exchangeRate,
      createdBy: (user as any)?.uid || (user as any)?.email || undefined,
    };
    onSaveQuote(newQuote);
    setCreatedQuote(newQuote);
  };

  const handlePrint = () => window.print();

  const handleNewQuote = () => {
    setCreatedQuote(null);
    setItems([]);
    setCustomerId('');
    setNotes('');
    setGlobalDiscount(0);
    setCurrency(settings.currency || 'CRC');
  };

  if (createdQuote) {
    const currentCustomer = customers.find(c => c.id === createdQuote.customerId);
    return (
      <div className="animate-fade-in flex flex-col h-[calc(100vh-100px)]">
        <div className="no-print bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-black">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700"><FileCheck size={24} /></div>
            <div>
              <h2 className="font-bold text-lg">¡Cotización Guardada!</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Presupuesto {createdQuote.number} en estado borrador.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => navigate('/workspace/quotes')} className="flex-1 md:flex-none px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-colors text-sm">Ver Cotizaciones</button>
            <button onClick={handleNewQuote} className="flex-1 md:flex-none px-4 py-2 text-black hover:bg-gray-50 dark:hover:bg-gray-800 border border-black dark:border-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"><Plus size={16} /> Nueva</button>
            <button onClick={handlePrint} className="flex-1 md:flex-none px-6 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95 border border-black dark:border-white"><Printer size={18} /> IMPRIMIR</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-2 md:p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner flex justify-center">
          <div className="bg-white shadow-2xl scale-[0.6] sm:scale-90 origin-top md:scale-100 transition-transform w-full max-w-[210mm]">
            <QuotePrint quote={createdQuote} settings={settings} customer={currentCustomer} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nueva Cotización</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Arme el presupuesto para el cliente</p>
        </div>
        <div className="flex justify-between sm:flex-col items-center sm:items-end gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg sm:bg-transparent sm:p-0 text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase hidden md:block">Fecha Actual</div>
            <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="text-xs text-black font-medium flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700"><RefreshCw size={10} /> T.C. ₡{settings.exchangeRate || 520}</div>
        </div>
      </div>

      {/* HEADER */}
      <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <select className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white dark:focus:border-white outline-none transition-all text-sm appearance-none" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">-- Buscar Cliente --</option>
                {customers.map(c => (<option key={c.id} value={c.id}>{c.name} - {c.taxId}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Moneda</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
              <select className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-black font-semibold rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm" value={currency} onChange={e => {
                if (items.length > 0) { if (confirm('Cambiar la moneda recalculará los montos. ¿Desea continuar?')) { setItems([]); setCurrency(e.target.value); } } else setCurrency(e.target.value);
              }}>
                <option value="CRC">Colones (₡)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Válido hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 md:hidden" size={14} />
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full pl-9 md:pl-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Fecha Emisión</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Notas</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condiciones, validez..." className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm" />
          </div>
        </div>
      </div>

      {/* ITEM ENTRY */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-end">
          <div className="flex items-center gap-4 pb-0 xl:pb-2 w-full xl:w-auto justify-start xl:h-[66px] xl:items-end border-b xl:border-0 border-gray-200 dark:border-gray-700 mb-2 xl:mb-0">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type-quote" className="accent-black" checked={!isService} onChange={() => setIsService(false)} /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type-quote" className="accent-black" checked={isService} onChange={() => setIsService(true)} /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Servicio</span></label>
          </div>
          <div className="w-full xl:flex-grow xl:min-w-[280px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Producto / Servicio</label>
            <select className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm" value={selectedProductId} onChange={(e) => handleProductSelect(e.target.value)}>
              <option value="">Seleccione...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock: {p.stock})</option>))}
            </select>
          </div>
          <div className="grid grid-cols-3 xl:flex gap-3 w-full xl:w-auto">
            <div className="col-span-3 sm:col-span-1 xl:w-28">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-semibold text-xs">{getCurrencySymbol()}</span>
                <input type="number" min="0" step="0.01" className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 cursor-not-allowed" value={unitPrice} readOnly placeholder="0.00" />
              </div>
            </div>
            <div className="col-span-1 xl:w-20">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cant.</label>
              <input type="number" min="1" className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm text-center" value={qty} onChange={e => setQty(Number(e.target.value))} />
            </div>
            <div className="col-span-2 sm:col-span-1 xl:w-24">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">% Desc.</label>
              <div className="relative">
                <input type="number" min="0" max="100" className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm pr-6" value={itemDiscount} onChange={e => setItemDiscount(Number(e.target.value))} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">%</span>
              </div>
            </div>
          </div>
          <div className="w-full xl:flex-grow xl:min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Detalle (Opcional)</label>
            <input type="text" className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none text-sm" value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Descripción adicional..." />
          </div>
          <div className="w-full xl:w-auto mt-2 xl:mt-0">
            <button onClick={handleAddItem} className="w-full xl:w-auto bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 shadow-md transition-all flex items-center justify-center gap-2 text-sm font-bold active:scale-95 h-[42px] border border-black dark:border-white"><Plus size={16} /> <span className="xl:hidden">Agregar Ítem</span><span className="hidden xl:inline">Agregar</span></button>
          </div>
        </div>
        {conversionInfo && (<div className="mt-3 text-xs text-black font-semibold bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 flex items-center gap-2"><RefreshCw size={12} /> {conversionInfo}</div>)}
      </div>

      {/* ITEM LIST */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[200px] flex flex-col overflow-hidden">
        <div className="hidden md:grid grid-cols-12 bg-gray-50 dark:bg-gray-800 p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-5">Descripción / Producto</div>
          <div className="col-span-1 text-center">Cant</div>
          <div className="col-span-2 text-right">Precio Unit.</div>
          <div className="col-span-1 text-center">% Desc</div>
          <div className="col-span-2 text-right">Total Línea</div>
          <div className="col-span-1 text-center"></div>
        </div>
        <div className="flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/30"><span className="text-sm">Agregue productos para comenzar.</span></div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, idx) => (
                <div key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="hidden md:grid grid-cols-12 p-3 text-sm items-center">
                    <div className="col-span-5"><div className="font-semibold text-gray-800 dark:text-gray-200">{item.productName}</div>{item.description && item.description !== item.productName && (<div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</div>)}</div>
                    <div className="col-span-1 text-center text-gray-700 dark:text-gray-300">{item.quantity}</div>
                    <div className="col-span-2 text-right text-gray-700 dark:text-gray-300">{getCurrencySymbol()} {item.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    <div className="col-span-1 text-center text-gray-500 dark:text-gray-400">{(item.discount || 0) > 0 ? `${item.discount}%` : '-'}</div>
                    <div className="col-span-2 text-right font-bold text-gray-900 dark:text-white">{getCurrencySymbol()} {item.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    <div className="col-span-1 text-center"><button onClick={() => handleRemoveItem(idx)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 transition-colors p-1"><Trash2 size={16} /></button></div>
                  </div>
                  <div className="md:hidden p-4 flex justify-between items-start">
                    <div className="flex-1"><div className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{item.productName}</div><div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.quantity} x {getCurrencySymbol()}{item.price.toLocaleString('en-US')} {(item.discount || 0) > 0 && <span className="text-gray-900 dark:text-white ml-1">(-{item.discount}%)</span>}</div></div>
                    <div className="text-right flex flex-col items-end gap-2"><div className="font-bold text-gray-900 dark:text-white text-sm">{getCurrencySymbol()} {item.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</div><button onClick={() => handleRemoveItem(idx)} className="text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><Trash2 size={16} /></button></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Notas / Condiciones</label>
          <textarea rows={2} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black dark:focus:ring-white outline-none resize-none bg-white dark:bg-gray-900" placeholder="Validez, forma de pago..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* FOOTER / TOTALS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
        <div className="bg-gray-50 dark:bg-gray-800 p-5 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner h-fit order-1 xl:order-2">
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal</span><span className="font-mono text-gray-700 dark:text-gray-300 text-sm font-semibold">{getCurrencySymbol()} {subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Percent size={12} /> Descuento global %</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" value={globalDiscount} onChange={e => setGlobalDiscount(Number(e.target.value))} className="w-20 px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-black outline-none" />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            {Number(globalDiscount) > 0 && (<div className="flex justify-between items-center text-sm"><span className="text-gray-500 dark:text-gray-400">Monto descuento global</span><span className="font-mono text-red-600 font-semibold">- {getCurrencySymbol()} {globalDiscountAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>)}
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Base imponible</span><span className="font-mono text-gray-700 dark:text-gray-300 text-sm">{getCurrencySymbol()} {baseImponible.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">IVA ({settings.taxRate}%)</span><span className="font-mono text-gray-700 dark:text-gray-300 text-sm font-semibold">{getCurrencySymbol()} {tax.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
            <div className="h-px bg-gray-300 my-2"></div>
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700"><span className="text-lg font-bold text-gray-900 dark:text-white">TOTAL</span><div className="font-mono font-bold text-xl text-black dark:text-white">{getCurrencySymbol()} {total.toLocaleString('en-US', {minimumFractionDigits: 2})}</div></div>
          </div>
        </div>
        <div className="space-y-6 order-2 xl:order-1">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase flex items-center gap-2 border-b pb-2 border-gray-100 dark:border-gray-800">Resumen</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Subtotal ya incluye descuentos por línea. El descuento global se aplica sobre el subtotal antes de impuestos.</p>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>Válido hasta: <span className="font-bold text-gray-900 dark:text-white">{validUntil}</span></p>
              <p>Moneda: <span className="font-bold">{currency}</span></p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button onClick={() => navigate('/workspace/quotes')} className="flex-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition-all flex justify-center items-center gap-2 active:scale-95 text-sm"><X size={18} /> Cancelar</button>
            <button onClick={handleSubmit} className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold shadow-lg shadow-gray-300 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex justify-center items-center gap-2 active:scale-95 text-sm border border-black dark:border-white"><CheckCircle2 size={18} /> Guardar Cotización</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteForm;
