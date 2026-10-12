import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, InventoryCountItem, InventoryAudit } from '../types';
import {
  ClipboardList, Search, Plus, Minus, Trash2, X,
  Package, CheckCircle, AlertTriangle, TrendingUp, History, Save, RotateCcw, ClipboardCheck,
  ScanLine, CloudUpload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InventoryCountProps {
  products: Product[];
  audits: InventoryAudit[];
  onSaveAudit: (audit: InventoryAudit) => void;
  /** Clave para aislar el borrador autoguardado por organización */
  draftKey?: string;
}

const InventoryCount: React.FC<InventoryCountProps> = ({ products, audits, onSaveAudit, draftKey }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countedItems, setCountedItems] = useState<InventoryCountItem[]>([]);
  const [draftNotice, setDraftNotice] = useState<{ updatedAt: string; count: number } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  // Escáner de códigos de barras (solo celulares)
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [scanMiss, setScanMiss] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const lastDetectRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [auditPreview, setAuditPreview] = useState<{
    matched: InventoryCountItem[];
    missing: (InventoryCountItem & { diff: number })[];
    extra: (InventoryCountItem & { diff: number })[];
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const draftStorageKey = `fai_count_draft_${draftKey ?? 'local'}`;
  // Botón de escáner exclusivo para celular: se muestra si hay cámara Y
  // (pantalla táctil o pantalla angosta). No se usa ni el userAgent (viene
  // reducido en celulares modernos) ni solo el ancho (la "vista de escritorio"
  // del Chrome móvil reporta ancho de PC y ocultaba el botón).
  const [showScanner, setShowScanner] = useState(false);
  useEffect(() => {
    const compute = () => {
      const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
      if (!hasCamera || typeof window === 'undefined') { setShowScanner(false); return; }
      const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
      const narrow = window.innerWidth < 1024;
      setShowScanner(coarse || narrow);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // ── Borrador autoguardado: restaurar al abrir ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { items: InventoryCountItem[]; updatedAt: string };
      if (parsed?.items && parsed.items.length > 0) {
        setCountedItems(parsed.items);
        setDraftNotice({ updatedAt: parsed.updatedAt, count: parsed.items.length });
      }
    } catch { /* borrador corrupto: se ignora */ }
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStorageKey]);

  // ── Borrador autoguardado: guardar cada cambio (protege ante caída de internet o cierre) ──
  useEffect(() => {
    try {
      if (countedItems.length === 0) {
        localStorage.removeItem(draftStorageKey);
        setLastSavedAt(null);
        return;
      }
      localStorage.setItem(draftStorageKey, JSON.stringify({ items: countedItems, updatedAt: new Date().toISOString() }));
      setLastSavedAt(new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch { /* almacenamiento lleno o bloqueado: se ignora */ }
  }, [countedItems, draftStorageKey]);

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

  // Detener cámara al cerrar el escáner / desmontar
  useEffect(() => {
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const digits = searchTerm.replace(/\D/g, '');
    return products.filter(p =>
      p.sku.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term) ||
      (p.barcode && (p.barcode.toLowerCase().includes(term) || (digits && p.barcode.includes(digits))))
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

  const findProductByCode = (code: string): Product | undefined => {
    const term = code.trim().toLowerCase();
    if (!term) return undefined;
    const digits = code.replace(/\D/g, '');
    return products.find(p =>
      p.sku.toLowerCase() === term ||
      (p.barcode && (p.barcode.toLowerCase() === term || (digits && p.barcode === digits))) ||
      (digits && p.sku.replace(/\D/g, '') === digits)
    );
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const exact = findProductByCode(searchTerm);
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

  // ── Escáner de códigos de barras (cámara del celular) ──
  const stopScanner = () => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const handleScannedCode = (code: string) => {
    const now = Date.now();
    // Anti-rebote: ignorar el mismo código dentro de 1.5s (la cámara lo ve en varios frames)
    if (lastDetectRef.current.code === code && now - lastDetectRef.current.at < 1500) return;
    lastDetectRef.current = { code, at: now };
    const product = findProductByCode(code);
    if (product) {
      handleAddProduct(product);
      setLastCode(`${product.sku} · ${product.name}`);
      setScanMiss(null);
      setScanCount((c) => c + 1);
      try { (navigator as any)?.vibrate?.(80); } catch { /* no soportado */ }
    } else {
      setScanMiss(code);
    }
  };

  const startScanner = async () => {
    setScanError(null);
    setScanMiss(null);
    const Detector = (window as any).BarcodeDetector;
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('Este dispositivo no permite acceder a la cámara. Escriba el código manualmente.');
      return;
    }
    if (!Detector) {
      setScanError('Este celular/navegador no soporta escaneo directo (se requiere Chrome en Android). Escriba el código o SKU manualmente.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
      });
      setScanning(true);
      scanTimerRef.current = window.setInterval(async () => {
        try {
          if (video.readyState < 2) return;
          const results = await detector.detect(video);
          if (results && results.length > 0 && results[0]?.rawValue) {
            handleScannedCode(String(results[0].rawValue));
          }
        } catch { /* frame no legible: se sigue intentando */ }
      }, 350);
    } catch {
      setScanError('No se pudo abrir la cámara. Verifique el permiso de cámara del navegador e intente de nuevo.');
    }
  };

  const handleOpenScanner = () => {
    setScanOpen(true);
    setScanError(null);
    setLastCode(null);
    setScanMiss(null);
    setScanCount(0);
    // La cámara se enciende en el siguiente tick, cuando el <video> ya existe
    setTimeout(() => { startScanner(); }, 50);
  };

  const handleCloseScanner = () => {
    stopScanner();
    setScanOpen(false);
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
    const cleanAudit: InventoryAudit = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...(user && (user as any)?.uid ? { userId: (user as any).uid } : {}),
      ...(((user as any)?.email || (user as any)?.displayName) ? { userName: (user as any)?.email || (user as any)?.displayName } : {}),
      items: [...countedItems],
      matched: auditPreview.matched,
      missing: auditPreview.missing,
      extra: auditPreview.extra,
    };
    onSaveAudit(cleanAudit);
    setAuditPreview(null);
    // Conteo guardado: limpiar borrador autoguardado
    try { localStorage.removeItem(draftStorageKey); } catch { /* ignorar */ }
    setDraftNotice(null);
    // keep countedItems so user can see? spec says poder iniciar nuevo conteo -> we keep until explicit reset
  };

  const handleNewCount = () => {
    setCountedItems([]);
    setAuditPreview(null);
    try { localStorage.removeItem(draftStorageKey); } catch { /* ignorar */ }
    setDraftNotice(null);
  };

  const handleDiscardDraft = () => {
    setCountedItems([]);
    setDraftNotice(null);
    try { localStorage.removeItem(draftStorageKey); } catch { /* ignorar */ }
  };

  const totalCountedUnits = countedItems.reduce((acc, i) => acc + i.countedQty, 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-sm">
              <ClipboardList size={20} className="text-white dark:text-black" />
            </span>
            Tomas de Inventario
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Auditoría física de stock — escanea o busca productos y compara con el sistema</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all ${showHistory ? 'bg-black dark:bg-white text-white dark:text-black border-black' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800'}`}
          >
            <History size={16} /> {showHistory ? 'Ocultar historial' : 'Ver historial'}
            {audits.length > 0 && !showHistory && (
              <span className="ml-1 bg-black dark:bg-white text-white dark:text-black text-[10px] px-1.5 py-0.5 rounded-full">{audits.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Stats summary when counting */}
      {countedItems.length > 0 && !auditPreview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Productos contados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{countedItems.length} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">/ {products.length}</span></p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Unidades contadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCountedUnits}</p>
          </div>
          <div className="hidden md:block bg-black dark:bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-black text-white dark:text-black">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">Modo auditoría</p>
            <p className="text-sm font-medium mt-1 text-gray-200">No modifica el stock automáticamente</p>
          </div>
        </div>
      )}

      {/* History Section */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <History size={18} className="text-gray-700 dark:text-gray-300" />
            <h3 className="font-bold text-gray-900 dark:text-white">Historial de auditorías</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{audits.length} registro(s)</span>
          </div>
          {audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
              <ClipboardCheck size={40} className="opacity-20 mb-2" />
              <p className="text-sm font-medium">No hay auditorías guardadas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {audits.map(audit => {
                const expanded = expandedAuditId === audit.id;
                return (
                  <div key={audit.id} className="px-4 md:px-6 py-4 hover:bg-gray-50 dark:bg-gray-800 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {new Date(audit.date).toLocaleDateString('es-CR')} {new Date(audit.date).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                          {audit.userName && <span className="font-normal text-gray-500 dark:text-gray-400"> · {audit.userName}</span>}
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
                        className="self-start md:self-auto px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:bg-gray-900 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por SKU, código de barras o nombre... (Enter para agregar)"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black dark:border-white outline-none text-sm transition-all"
          />
          {isDropdownOpen && filteredSuggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {filteredSuggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{p.sku}{p.barcode ? ` · ▮ ${p.barcode}` : ''} · Stock: {p.stock}</p>
                  </div>
                  <span className="flex-shrink-0 h-7 w-7 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                    <Plus size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
          </div>
          {showScanner && (
            <button
              onClick={handleOpenScanner}
              className="flex-shrink-0 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 border border-black"
            >
              <ScanLine size={18} /> Escanear
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">Tip: puedes agregar el mismo código varias veces para incrementar la cantidad.</p>
          {lastSavedAt && countedItems.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <CloudUpload size={12} /> Borrador autoguardado {lastSavedAt}
            </span>
          )}
        </div>
      </div>

      {/* Borrador recuperado */}
      {draftNotice && countedItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-2 flex-1">
            <CloudUpload size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-bold">Borrador recuperado:</span> {draftNotice.count} ítem(s) del{' '}
              {new Date(draftNotice.updatedAt).toLocaleDateString('es-CR')} {new Date(draftNotice.updatedAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}.
              Cada ítem que agrega se guarda automáticamente en este dispositivo.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDraftNotice(null)} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700">Continuar</button>
            <button onClick={handleDiscardDraft} className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-100">Descartar</button>
          </div>
        </div>
      )}

      {/* Current Count List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={18} /> Conteo actual
            {countedItems.length > 0 && (
              <span className="ml-1 text-xs font-normal bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">{countedItems.length} ítems</span>
            )}
          </h3>
          {countedItems.length > 0 && (
            <button
              onClick={handleNewCount}
              className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-gray-200 dark:border-gray-700"
            >
              <RotateCcw size={12} /> Limpiar
            </button>
          )}
        </div>

        {countedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Package size={48} className="opacity-20 mb-3" />
            <p className="font-medium text-sm">No hay productos en el conteo</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Busca y agrega productos arriba para comenzar</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {countedItems.map(item => (
                <div key={item.productId} className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.sku}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Stock sistema: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.systemStock}</span></p>
                    </div>
                    <button onClick={() => handleRemove(item.productId)} className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 rounded-lg hover:text-red-600 hover:border-red-200">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => handleIncrement(item.productId, -1)} className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-200">
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={item.countedQty}
                      onChange={e => handleQtyChange(item.productId, parseInt(e.target.value))}
                      className="flex-1 h-9 text-center border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                    />
                    <button onClick={() => handleIncrement(item.productId, 1)} className="h-9 w-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200">
                      <Plus size={16} />
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 whitespace-nowrap">contado</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Producto</th>
                    <th className="px-6 py-3 text-center">Stock sistema</th>
                    <th className="px-6 py-3 text-center">Cantidad contada</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {countedItems.map(item => (
                    <tr key={item.productId} className="hover:bg-gray-50 dark:bg-gray-800 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{item.sku}</td>
                      <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{item.productName}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                          {item.systemStock}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleIncrement(item.productId, -1)} className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-200">
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={item.countedQty}
                            onChange={e => handleQtyChange(item.productId, parseInt(e.target.value))}
                            className="w-16 h-7 text-center border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-sm focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                          />
                          <button onClick={() => handleIncrement(item.productId, 1)} className="h-7 w-7 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200">
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => handleRemove(item.productId)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action bar */}
            <div className="px-4 md:px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-3 justify-end">
              {!auditPreview ? (
                <button
                  onClick={handleAudit}
                  className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2 shadow-lg shadow-gray-200 font-semibold transition-all active:scale-95 border border-black dark:border-white"
                >
                  <ClipboardCheck size={18} /> Realizar Auditoría
                </button>
              ) : (
                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setAuditPreview(null)}
                    className="flex-1 md:flex-none px-5 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:bg-gray-800 font-medium flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Seguir contando
                  </button>
                  <button
                    onClick={handleSaveAudit}
                    className="flex-1 md:flex-none px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold flex items-center justify-center gap-2 shadow-lg border border-black dark:border-white"
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Resultado de auditoría</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full">{new Date().toLocaleDateString('es-CR')} {new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-green-600 text-white dark:text-black flex items-center justify-center">
                  <CheckCircle size={16} />
                </span>
                <p className="text-sm font-bold text-green-900">Coinciden</p>
              </div>
              <p className="text-3xl font-bold text-green-900 mt-3">{auditPreview.matched.length}</p>
              <p className="text-xs text-green-700 mt-1">{auditPreview.matched.reduce((a, c) => a + c.countedQty, 0)} unidades</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-red-600 text-white dark:text-black flex items-center justify-center">
                  <AlertTriangle size={16} />
                </span>
                <p className="text-sm font-bold text-red-900">Faltantes</p>
              </div>
              <p className="text-3xl font-bold text-red-900 mt-3">{auditPreview.missing.length}</p>
              <p className="text-xs text-red-700 mt-1">{auditPreview.missing.reduce((a, c) => a + c.diff, 0)} unidades faltantes</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-blue-600 text-white dark:text-black flex items-center justify-center">
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-green-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-green-50 border-b border-green-200 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-700" />
              <h4 className="font-bold text-green-900 text-sm">Coinciden</h4>
              <span className="ml-auto text-xs font-semibold bg-white dark:bg-gray-900 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{auditPreview.matched.length} ítems</span>
            </div>
            {auditPreview.matched.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Ningún producto coincide exactamente.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                    <tr><th className="px-4 md:px-6 py-2">SKU</th><th className="px-4 md:px-6 py-2">Producto</th><th className="px-4 md:px-6 py-2 text-center">Contado</th><th className="px-4 md:px-6 py-2 text-center">Sistema</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {auditPreview.matched.map(m => (
                      <tr key={m.productId} className="hover:bg-gray-50 dark:bg-gray-800">
                        <td className="px-4 md:px-6 py-2 font-mono text-xs">{m.sku}</td>
                        <td className="px-4 md:px-6 py-2 font-medium text-gray-900 dark:text-white">{m.productName}</td>
                        <td className="px-4 md:px-6 py-2 text-center font-bold text-green-700">{m.countedQty}</td>
                        <td className="px-4 md:px-6 py-2 text-center text-gray-600 dark:text-gray-400">{m.systemStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Faltantes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-700" />
              <h4 className="font-bold text-red-900 text-sm">Faltantes</h4>
              <span className="ml-auto text-xs font-semibold bg-white dark:bg-gray-900 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{auditPreview.missing.length} ítems · {auditPreview.missing.reduce((a, c) => a + c.diff, 0)} unidades</span>
            </div>
            {auditPreview.missing.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No hay faltantes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                    <tr><th className="px-4 md:px-6 py-2">SKU</th><th className="px-4 md:px-6 py-2">Producto</th><th className="px-4 md:px-6 py-2 text-center">Contado</th><th className="px-4 md:px-6 py-2 text-center">Sistema</th><th className="px-4 md:px-6 py-2 text-center">Diferencia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {auditPreview.missing.map(m => (
                      <tr key={m.productId} className="hover:bg-red-50/50">
                        <td className="px-4 md:px-6 py-2 font-mono text-xs">{m.sku}</td>
                        <td className="px-4 md:px-6 py-2 font-medium text-gray-900 dark:text-white">{m.productName}</td>
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-700" />
              <h4 className="font-bold text-blue-900 text-sm">Sobrantes</h4>
              <span className="ml-auto text-xs font-semibold bg-white dark:bg-gray-900 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">{auditPreview.extra.length} ítems · {auditPreview.extra.reduce((a, c) => a + c.diff, 0)} unidades</span>
            </div>
            {auditPreview.extra.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No hay sobrantes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                    <tr><th className="px-4 md:px-6 py-2">SKU</th><th className="px-4 md:px-6 py-2">Producto</th><th className="px-4 md:px-6 py-2 text-center">Contado</th><th className="px-4 md:px-6 py-2 text-center">Sistema</th><th className="px-4 md:px-6 py-2 text-center">Diferencia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {auditPreview.extra.map(m => (
                      <tr key={m.productId} className="hover:bg-blue-50/50">
                        <td className="px-4 md:px-6 py-2 font-mono text-xs">{m.sku}</td>
                        <td className="px-4 md:px-6 py-2 font-medium text-gray-900 dark:text-white">{m.productName}</td>
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
              className="px-5 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:bg-gray-800 font-medium flex items-center justify-center gap-2"
            >
              <X size={16} /> Cerrar resultado
            </button>
            <button
              onClick={handleSaveAudit}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold flex items-center justify-center gap-2 shadow-lg border border-black dark:border-white"
            >
              <Save size={16} /> Guardar Auditoría
            </button>
            <button
              onClick={handleNewCount}
              className="px-5 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-200 font-medium flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <RotateCcw size={16} /> Nuevo conteo
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Esta auditoría no modifica el stock automáticamente. Usa el módulo de Inventario para ajustes manuales si lo requieres.</p>
        </div>
      )}

      {/* New count hint after save */}
      {!auditPreview && countedItems.length > 0 && audits.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Después de guardar, puedes iniciar un nuevo conteo limpiando la lista.</p>
      )}

      {/* Scanner modal — solo celulares */}
      {scanOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ScanLine size={20} /> Escanear código
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Apunte la cámara al código de barras · {scanCount} agregado(s)</p>
              </div>
              <button onClick={handleCloseScanner} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {scanError ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                  {scanError}
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                  <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                  {/* Guía de encuadre */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-1/3 border-2 border-white/80 rounded-lg" />
                  </div>
                  {!scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <p className="text-white text-sm font-medium animate-pulse">Abriendo cámara…</p>
                    </div>
                  )}
                </div>
              )}
              {lastCode && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-900 flex items-center gap-2">
                  <CheckCircle size={16} className="flex-shrink-0" />
                  <span>Agregado: <span className="font-bold">{lastCode}</span></span>
                </div>
              )}
              {scanMiss && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-900 flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>Código <span className="font-mono font-bold">{scanMiss}</span> no está registrado en el inventario.</span>
                </div>
              )}
              <p className="text-xs text-gray-400 text-center">Cada lectura suma 1 unidad (con autoguardado). Puede seguir escaneando sin cerrar.</p>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
              <button onClick={handleCloseScanner} className="w-full px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold">
                Terminar ({countedItems.length} ítems en conteo)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCount;
