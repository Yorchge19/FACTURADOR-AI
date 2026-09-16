import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, InventoryCountItem, InventoryAudit } from '../types';
import {
  ClipboardList, Search, Plus, Minus, Trash2, X,
  Package, CheckCircle, AlertTriangle, TrendingUp, History, Save, RotateCcw, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InventoryCountProps {
  products: Product[];
  audits: InventoryAudit[];
  onSaveAudit: (audit: InventoryAudit) => void;
}

const InventoryCount: React.FC<InventoryCountProps> = ({ products, audits, onSaveAudit }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countedItems, setCountedItems] = useState<InventoryCountItem[]>([]);
  const [auditPreview, setAuditPreview] = useState<{
    matched: InventoryCountItem[];
    missing: (InventoryCountItem & { diff: number })[];
    extra: (InventoryCountItem & { diff: number })[];
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.sku.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [searchTerm, products]);

  const handleAddProduct = (product: Product) => {
    setCountedItems(prev => {
      const idx = prev.findIndex(i => i.productId === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], countedQty: copy[idx].countedQty + 1 };
        return copy;
      }
      return [...prev, {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        countedQty: 1,
        systemStock: product.stock,
      }];
    });
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const exact = products.find(p => p.sku.toLowerCase() === searchTerm.trim().toLowerCase());
      if (exact) {
        e.preventDefault();
        handleAddProduct(exact);
        return;
      }
      if (filteredSuggestions.length === 1) {
        e.preventDefault();
        handleAddProduct(filteredSuggestions[0]);
      }
    }
  };

  const handleQtyChange = (productId: string, newQty: number) => {
    const qty = Math.max(0, Math.floor(newQty) || 0);
    setCountedItems(prev => prev.map(i => i.productId === productId ? { ...i, countedQty: qty } : i));
  };

  const handleIncrement = (productId: string, delta: number) => {
    setCountedItems(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      return { ...i, countedQty: Math.max(0, i.countedQty + delta) };
    }));
  };

  const handleRemove = (productId: string) => {
    setCountedItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleAudit = () => {
    const countedMap = new Map<string, InventoryCountItem>();
    countedItems.forEach(i => countedMap.set(i.productId, i));

    const matched: InventoryCountItem[] = [];
    const missing: (InventoryCountItem & { diff: number })[] = [];
    const extra: (InventoryCountItem & { diff: number })[] = [];

    // Process counted items
    countedItems.forEach(item => {
      if (item.countedQty === item.systemStock) {
        matched.push(item);
      } else if (item.countedQty < item.systemStock) {
        missing.push({ ...item, diff: item.systemStock - item.countedQty });
      } else {
        extra.push({ ...item, diff: item.countedQty - item.systemStock });
      }
    });

    // Process not-counted products (countedQty = 0)
    products.forEach(p => {
      if (!countedMap.has(p.id)) {
        const item: InventoryCountItem = {
          productId: p.id,
          sku: p.sku,
          productName: p.name,
          countedQty: 0,
          systemStock: p.stock,
        };
        if (p.stock === 0) {
          matched.push(item);
        } else {
          missing.push({ ...item, diff: p.stock });
        }
      }
    });

    setAuditPreview({ matched, missing, extra });
  };

  const handleSaveAudit = () => {
    if (!auditPreview) return;
    const audit: InventoryAudit = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      userId: (user as any)?.uid,
      userName: (user as any)?.email || (user as any)?.displayName || undefined,
      items: [...countedItems],
      matched: auditPreview.matched,
      missing: auditPreview.missing,
      extra: auditPreview.extra,
    };
    onSaveAudit(audit);
    setAuditPreview(null);
    // keep countedItems so user can see? spec says poder iniciar nuevo conteo -> we keep until explicit reset
  };

  const handleNewCount = () => {
    setCountedItems([]);
    setAuditPreview(null);
  };

  const totalCountedUnits = countedItems.reduce((acc, i) => acc + i.countedQty, 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-black flex items-center justify-center shadow-sm">
              <ClipboardList size={20} className="text-white" />
            </span>
            Tomas de Inventario
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Auditoría física de stock — escanea o busca productos y compara con el sistema</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all ${showHistory ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            <History size={16} /> {showHistory ? 'Ocultar historial' : 'Ver historial'}
            {audits.length > 0 && !showHistory && (
              <span className="ml-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full">{audits.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Stats summary when counting */}
      {countedItems.length > 0 && !auditPreview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Productos contados</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{countedItems.length} <span className="text-sm font-normal text-gray-400">/ {products.length}</span></p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Unidades contadas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCountedUnits}</p>
          </div>
          <div className="hidden md:block bg-black p-4 md:p-5 rounded-2xl shadow-sm border border-black text-white">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Modo auditoría</p>
            <p className="text-sm font-medium mt-1 text-gray-200">No modifica el stock automáticamente</p>
          </div>
        </div>
      )}

      {/* History Section */}
      {showHistory && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <History size={18} className="text-gray-700" />
            <h3 className="font-bold text-gray-900">Historial de auditorías</h3>
            <span className="ml-auto text-xs text-gray-500">{audits.length} registro(s)</span>
          </div>
          {audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <ClipboardCheck size={40} className="opacity-20 mb-2" />
              <p className="text-sm font-medium">No hay auditorías guardadas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {audits.map(audit => {
                const expanded = expandedAuditId === audit.id;
                return (
                  <div key={audit.id} className="px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(audit.date).toLocaleDateString('es-CR')} {new Date(audit.date).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                          {audit.userName && <span className="font-normal text-gray-500"> · {audit.userName}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
                            <CheckCircle size={12} /> Coinciden: {audit.matched.length}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
                            <AlertTriangle size={12} /> Faltantes: {audit.missing.length}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            <TrendingUp size={12} /> Sobrantes: {audit.extra.length}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedAuditId(expanded ? null : audit.id)}
                        className="self-start md:self-auto px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-white bg-gray-50 text-gray-700"
                      >
                        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Matched */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-green-800 uppercase tracking-wide flex items-center gap-1"><CheckCircle size={12} /> Coinciden ({audit.matched.length})</p>
                          <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                            {audit.matched.length === 0 ? <p className="text-xs text-green-600">—</p> :
                              audit.matched.map(m => (
                                <div key={m.productId} className="text-xs text-green-900 flex justify-between gap-2">
                                  <span className="truncate">{m.sku} · {m.productName}</span>
                                  <span className="font-mono font-bold">{m.countedQty}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={12} /> Faltantes ({audit.missing.length})</p>
                          <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                            {audit.missing.length === 0 ? <p className="text-xs text-red-600">—</p> :
                              audit.missing.map(m => (
                                <div key={m.productId} className="text-xs text-red-900 flex justify-between gap-2">
                                  <span className="truncate">{m.sku} · {m.productName}</span>
                                  <span className="font-mono whitespace-nowrap">Faltan {m.diff} <span className="text-red-500">({m.countedQty}/{m.systemStock})</span></span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1"><TrendingUp size={12} /> Sobrantes ({audit.extra.length})</p>
                          <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                            {audit.extra.length === 0 ? <p className="text-xs text-blue-600">—</p> :
                              audit.extra.map(m => (
                                <div key={m.productId} className="text-xs text-blue-900 flex justify-between gap-2">
                                  <span className="truncate">{m.sku} · {m.productName}</span>
                                  <span className="font-mono whitespace-nowrap">Sobran {m.diff} <span className="text-blue-500">({m.countedQty}/{m.systemStock})</span></span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por SKU o nombre del producto... (Enter para agregar si hay coincidencia exacta)"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none text-sm transition-all"
          />
          {isDropdownOpen && filteredSuggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {filteredSuggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.sku} · Stock sistema: {p.stock}</p>
                  </div>
                  <span className="flex-shrink-0 h-7 w-7 rounded-lg bg-black text-white flex items-center justify-center">
                    <Plus size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">Tip: puedes escanear el mismo código varias veces para incrementar la cantidad.</p>
      </div>

      {/* Current Count List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Package size={18} /> Conteo actual
            {countedItems.length > 0 && (
              <span className="ml-1 text-xs font-normal bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">{countedItems.length} ítems</span>
            )}
          </h3>
          {countedItems.length > 0 && (
            <button
              onClick={handleNewCount}
              className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
            >
              <RotateCcw size={12} /> Limpiar
            </button>
          )}
        </div>

        {countedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Package size={48} className="opacity-20 mb-3" />
            <p className="font-medium text-sm">No hay productos en el conteo</p>
            <p className="text-xs text-gray-400 mt-1">Busca y agrega productos arriba para comenzar</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {countedItems.map(item => (
                <div key={item.productId} className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-gray-500">{item.sku}</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Stock sistema: <span className="font-semibold text-gray-700">{item.systemStock}</span></p>
                    </div>
                    <button onClick={() => handleRemove(item.productId)} className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-red-600 hover:border-red-200">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => handleIncrement(item.productId, -1)} className="h-9 w-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200">
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={item.countedQty}
                      onChange={e => handleQtyChange(item.productId, parseInt(e.target.value))}
                      className="flex-1 h-9 text-center border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-black focus:border-black outline-none"
                    />
                    <button onClick={() => handleIncrement(item.productId, 1)} className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800">
                      <Plus size={16} />
                    </button>
                    <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">contado</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Producto</th>
                    <th className="px-6 py-3 text-center">Stock sistema</th>
                    <th className="px-6 py-3 text-center">Cantidad contada</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {countedItems.map(item => (
                    <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-gray-700">{item.sku}</td>
                      <td className="px-6 py-3 font-semibold text-gray-900">{item.productName}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700">
                          {item.systemStock}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleIncrement(item.productId, -1)} className="h-7 w-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200">
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={item.countedQty}
                            onChange={e => handleQtyChange(item.productId, parseInt(e.target.value))}
                            className="w-16 h-7 text-center border border-gray-200 rounded-lg font-bold text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                          />
                          <button onClick={() => handleIncrement(item.productId, 1)} className="h-7 w-7 rounded-lg bg-black text-white flex items-center justify-center hover:bg-gray-800">
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => handleRemove(item.productId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action bar */}
            <div className="px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row gap-3 justify-end">
              {!auditPreview ? (
                <button
                  onClick={handleAudit}
                  className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2 shadow-lg shadow-gray-200 font-semibold transition-all active:scale-95 border border-black"
                >
                  <ClipboardCheck size={18} /> Realizar Auditoría
                </button>
              ) : (
                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setAuditPreview(null)}
                    className="flex-1 md:flex-none px-5 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Seguir contando
                  </button>
                  <button
                    onClick={handleSaveAudit}
                    className="flex-1 md:flex-none px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold flex items-center justify-center gap-2 shadow-lg border border-black"
                  >
                    <Save size={16} /> Guardar Auditoría
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Audit Result */}
      {auditPreview && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Resultado de auditoría</h3>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-full">{new Date().toLocaleDateString('es-CR')} {new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-green-600 text-white flex items-center justify-center">
                  <CheckCircle size={16} />
                </span>
                <p className="text-sm font-bold text-green-900">Coinciden</p>
              </div>
              <p className="text-3xl font-bold text-green-900 mt-3">{auditPreview.matched.length}</p>
              <p className="text-xs text-green-700 mt-1">{auditPreview.matched.reduce((a, c) => a + c.countedQty, 0)} unidades</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle size={16} />
                </span>
                <p className="text-sm font-bold text-red-900">Faltantes</p>
              </div>
              <p className="text-3xl font-bold text-red-900 mt-3">{auditPreview.missing.length}</p>
              <p className="text-xs text-red-700 mt-1">{auditPreview.missing.reduce((a, c) => a + c.diff, 0)} unidades faltantes</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <TrendingUp size={16} />
                </span>
                <p className="text-sm font-bold text-blue-900">Sobrantes</p>
              </div>
              <p className="text-3xl font-bold text-blue-900 mt-3">{auditPreview.extra.length}</p>
              <p className="text-xs text-blue-700 mt-1">{auditPreview.extra.reduce((a, c) => a + c.diff, 0)} unidades sobrantes</p>
            </div>
          </div>

          {/* Detail tables */}
          {/* Coinciden */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-green-50 border-b border-green-200 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-700" />
              <h4 className="font-bold text-green-900 text-sm">Coinciden</h4>
              <span className="ml-auto text-xs font-semibold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{auditPreview.matched.length} ítems</span>
            </div>
            {auditPreview.matched.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Ningún producto coincide exactamente.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr><th className="px-4 md:px-6 py-2">SKU</th><th className="px-4 md:px-6 py-2">Producto</th><th className="px-4 md:px-6 py-2 text-center">Contado</th><th className="px-4 md:px-6 py-2 text-center">Sistema</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditPreview.matched.map(m => (
                      <tr key={m.productId} className="hover:bg-gray-50">
                        <td className="px-4 md:px-6 py-2 font-mono text-xs">{m.sku}</td>
                        <td className="px-4 md:px-6 py-2 font-medium text-gray-900">{m.productName}</td>
                        <td className="px-4 md:px-6 py-2 text-center font-bold text-green-700">{m.countedQty}</td>
                        <td className="px-4 md:px-6 py-2 text-center text-gray-600">{m.systemStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Faltantes */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-700" />
              <h4 className="font-bold text-red-900 text-sm">Faltantes</h4>
              <span className="ml-auto text-xs font-semibold bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{auditPreview.missing.length} ítems · {auditPreview.missing.reduce((a, c) => a + c.diff, 0)} unidades</span>
            </div>
            {auditPreview.missing.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No hay faltantes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr><th className="px-4 md:px-6 py-2">SKU</th><th className="px-4 md:px-6 py-2">Producto</th><th className="px-4 md:px-6 py-2 text-center">Contado</th><th className="px-4 md:px-6 py-2 text-center">Sistema</th><th className="px-4 md:px-6 py-2 text-center">Diferencia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditPreview.missing.map(m => (
                      <tr key={m.productId} className="hover:bg-red-50/50">
                        <td className="px-4 md:px-6 py-2 font-mono text-xs">{m.sku}</td>
                        <td className="px-4 md:px-6 py-2 font-medium text-gray-900">{m.productName}</td>
                        <td className="px-4 md:px-6 py-2 text-center">{m.countedQty}</td>
                        <td className="px-4 md:px-6 py-2 text-center">{m.systemStock}</td>
                        <td className="px-4 md:px-6 py-2 text-center"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Faltan {m.diff}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sobrantes */}
          <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-700" />
              <h4 className="font-bold text-blue-900 text-sm">Sobrantes</h4>
              <span className="ml-auto text-xs font-semibold bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">{auditPreview.extra.length} ítems · {auditPreview.extra.reduce((a, c) => a + c.diff, 0)} unidades</span>
            </div>
            {auditPreview.extra.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No hay sobrantes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr><th className="px-4 md:px-6 py-2">SKU</th><th className="px-4 md:px-6 py-2">Producto</th><th className="px-4 md:px-6 py-2 text-center">Contado</th><th className="px-4 md:px-6 py-2 text-center">Sistema</th><th className="px-4 md:px-6 py-2 text-center">Diferencia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditPreview.extra.map(m => (
                      <tr key={m.productId} className="hover:bg-blue-50/50">
                        <td className="px-4 md:px-6 py-2 font-mono text-xs">{m.sku}</td>
                        <td className="px-4 md:px-6 py-2 font-medium text-gray-900">{m.productName}</td>
                        <td className="px-4 md:px-6 py-2 text-center">{m.countedQty}</td>
                        <td className="px-4 md:px-6 py-2 text-center">{m.systemStock}</td>
                        <td className="px-4 md:px-6 py-2 text-center"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Sobran {m.diff}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 justify-end">
            <button
              onClick={() => setAuditPreview(null)}
              className="px-5 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
            >
              <X size={16} /> Cerrar resultado
            </button>
            <button
              onClick={handleSaveAudit}
              className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold flex items-center justify-center gap-2 shadow-lg border border-black"
            >
              <Save size={16} /> Guardar Auditoría
            </button>
            <button
              onClick={handleNewCount}
              className="px-5 py-3 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 font-medium flex items-center justify-center gap-2 text-gray-700"
            >
              <RotateCcw size={16} /> Nuevo conteo
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">Esta auditoría no modifica el stock automáticamente. Usa el módulo de Inventario para ajustes manuales si lo requieres.</p>
        </div>
      )}

      {/* New count hint after save */}
      {!auditPreview && countedItems.length > 0 && audits.length > 0 && (
        <p className="text-xs text-gray-400 text-center">Después de guardar, puedes iniciar un nuevo conteo limpiando la lista.</p>
      )}
    </div>
  );
};

export default InventoryCount;
