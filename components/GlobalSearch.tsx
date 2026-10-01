import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, Package, X, CornerDownLeft, Hash } from 'lucide-react';
import { Product, Customer, Invoice } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
}

type SearchResult = {
  id: string;
  type: 'invoice' | 'customer' | 'product';
  label: string;
  sublabel: string;
  href: string;
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, products, customers, invoices }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape global (also handled via input, but ensure when open)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const normalized = query.trim().toLowerCase();

  const filteredInvoices = useMemo(() => {
    if (!normalized) return [];
    return invoices
      .filter(inv =>
        inv.number.toLowerCase().includes(normalized) ||
        inv.customerName.toLowerCase().includes(normalized)
      )
      .slice(0, 5);
  }, [invoices, normalized]);

  const filteredCustomers = useMemo(() => {
    if (!normalized) return [];
    return customers
      .filter(c =>
        (c.name || '').toLowerCase().includes(normalized) ||
        (c.taxId || '').toLowerCase().includes(normalized)
      )
      .slice(0, 5);
  }, [customers, normalized]);

  const filteredProducts = useMemo(() => {
    if (!normalized) return [];
    return products
      .filter(p =>
        p.name.toLowerCase().includes(normalized) ||
        p.sku.toLowerCase().includes(normalized)
      )
      .slice(0, 5);
  }, [products, normalized]);

  const flatResults: SearchResult[] = useMemo(() => {
    const out: SearchResult[] = [];
    filteredInvoices.forEach(inv => out.push({
      id: inv.id,
      type: 'invoice',
      label: `${inv.number} · ${inv.customerName}`,
      sublabel: `${inv.status === 'paid' ? 'Pagada' : inv.status === 'cancelled' ? 'Anulada' : 'Pendiente'} · ${new Date(inv.date).toLocaleDateString('es-CR')}`,
      href: '/workspace/invoices',
    }));
    filteredCustomers.forEach(c => out.push({
      id: c.id,
      type: 'customer',
      label: c.name,
      sublabel: c.taxId ? `Cédula: ${c.taxId}` : c.email || '',
      href: '/workspace/customers',
    }));
    filteredProducts.forEach(p => out.push({
      id: p.id,
      type: 'product',
      label: `${p.name} (${p.sku})`,
      sublabel: `Stock: ${p.stock} · ${p.category} · ${p.currency} ${p.price.toLocaleString()}`,
      href: '/workspace/inventory',
    }));
    return out;
  }, [filteredInvoices, filteredCustomers, filteredProducts]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults.length]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(flatResults.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatResults[selectedIndex];
      if (target) handleSelect(target);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasResults = flatResults.length > 0;
  const showEmpty = normalized.length > 0 && !hasResults;

  const getIcon = (type: SearchResult['type']) => {
    if (type === 'invoice') return <FileText size={16} className="text-gray-700 dark:text-gray-300" />;
    if (type === 'customer') return <Users size={16} className="text-gray-700 dark:text-gray-300" />;
    return <Package size={16} className="text-gray-700 dark:text-gray-300" />;
  };

  const getGroupLabel = (type: SearchResult['type']) => {
    if (type === 'invoice') return 'Facturas';
    if (type === 'customer') return 'Clientes';
    return 'Productos';
  };

  // Helper to render grouped section with keyboard highlight
  const renderGroup = (title: string, items: SearchResult[], startIndex: number, icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {icon}
          {title}
          <span className="ml-auto bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[10px]">{items.length}</span>
        </div>
        <div className="space-y-1 mt-1">
          {items.map((r, idx) => {
            const flatIdx = startIndex + idx;
            const active = flatIdx === selectedIndex;
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setSelectedIndex(flatIdx)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  active ? 'bg-black dark:bg-white text-white dark:text-black border-black shadow-md' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-800 hover:border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${active ? 'bg-white/15 border-white/20 text-white dark:text-black' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  {getIcon(r.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate leading-none ${active ? 'text-white dark:text-black' : 'text-gray-900 dark:text-white'}`}>{r.label}</p>
                  <p className={`text-xs truncate mt-0.5 ${active ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{r.sublabel}</p>
                </div>
                {active && <CornerDownLeft size={14} className="text-gray-300 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const invStart = 0;
  const custStart = filteredInvoices.length;
  const prodStart = filteredInvoices.length + filteredCustomers.length;

  // Build flat lists for rendering groups
  const invoiceResults: SearchResult[] = filteredInvoices.map(inv => ({
    id: inv.id,
    type: 'invoice' as const,
    label: `${inv.number} · ${inv.customerName}`,
    sublabel: `${inv.status === 'paid' ? 'Pagada' : inv.status === 'cancelled' ? 'Anulada' : 'Pendiente'} · ${new Date(inv.date).toLocaleDateString('es-CR')}`,
    href: '/workspace/invoices',
  }));
  const customerResults: SearchResult[] = filteredCustomers.map(c => ({
    id: c.id,
    type: 'customer' as const,
    label: c.name,
    sublabel: c.taxId ? `Cédula: ${c.taxId}` : c.email || '',
    href: '/workspace/customers',
  }));
  const productResults: SearchResult[] = filteredProducts.map(p => ({
    id: p.id,
    type: 'product' as const,
    label: `${p.name} (${p.sku})`,
    sublabel: `Stock: ${p.stock} · ${p.category}`,
    href: '/workspace/inventory',
  }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[70] p-4 pt-[8vh] md:pt-[12vh]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-scale-in flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar facturas, clientes, productos… (⌘K)"
            className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
            autoFocus
          />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
            <X size={16} />
          </button>
        </div>

        {/* Hint bar */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Hash size={12} /> {hasResults ? `${flatResults.length} resultado${flatResults.length !== 1 ? 's' : ''}` : normalized ? 'Sin resultados' : 'Escribe para buscar'}
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono">↑↓</span> navegar
            <span className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono ml-1">↵</span> seleccionar
            <span className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono ml-1">ESC</span> cerrar
          </span>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 bg-[#fcfcfc]">
          {!normalized && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-gray-400 dark:text-gray-500">
              <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-3">
                <Search size={20} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Busca en tu negocio</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[280px]">Facturas por número o cliente, clientes por nombre o cédula, productos por nombre o SKU.</p>
              <div className="flex items-center gap-2 mt-4 text-xs">
                <span className="px-2 py-1 bg-gray-900 text-white dark:text-black rounded-lg font-mono text-[11px]">⌘ K</span>
                <span className="text-gray-400 dark:text-gray-500">para abrir rápido</span>
              </div>
            </div>
          )}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-3">
                <Search size={20} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Sin resultados para “{query}”</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Intenta con otro término</p>
            </div>
          )}
          {hasResults && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {renderGroup('Facturas', invoiceResults, invStart, <FileText size={12} />)}
              {renderGroup('Clientes', customerResults, custStart, <Users size={12} />)}
              {renderGroup('Productos', productResults, prodStart, <Package size={12} />)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="hidden sm:inline">Máx. 5 por grupo · Coincidencia parcial</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-black dark:bg-white animate-pulse" /> Facturador AI
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
