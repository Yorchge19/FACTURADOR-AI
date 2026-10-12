import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { Plus, Edit2, Trash2, Search, Sparkles, X, Package, AlertTriangle, TrendingUp, Upload, Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import * as XLSX from 'xlsx';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onBulkImport?: (list: Product[]) => void | Promise<void>;
}

// ── Helpers de importación Excel ──────────────────────────────────────────
// Columnas esperadas (insensible a mayúsculas/acentos): Código | Descripción |
// Existencia | Precio Venta IVI | NUMERO DE CODIGO DE BARRAS | CODIGO DE BARRAS
const normHeader = (v: unknown) =>
  String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const parseNum = (v: unknown): number => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v ?? '').replace(/[^0-9,.\-]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

function parseInventorySheet(rows: unknown[][]): { items: Product[]; errors: string[] } {
  const items: Product[] = [];
  const errors: string[] = [];
  if (!rows || rows.length === 0) return { items, errors: ['El archivo no contiene filas.'] };
  // Localizar fila de encabezados (la primera que mencione codigo o descripcion)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = (rows[i] as unknown[]).map(normHeader);
    if (cells.some((c) => c.includes('codigo') || c.includes('descripcion') || c.includes('existencia'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return { items, errors: ['No se encontró la fila de encabezados (Código, Descripción, Existencia, Precio Venta IVI, ...).'] };
  const headers = (rows[headerIdx] as unknown[]).map(normHeader);
  const col = { code: -1, desc: -1, stock: -1, price: -1, barcodeNum: -1, barcode: -1 };
  headers.forEach((h, i) => {
    if (h.includes('numero') && h.includes('barra')) col.barcodeNum = i;
    else if (h.includes('barra')) col.barcode = i;
    else if (h === 'codigo' || (h.includes('codigo') && !h.includes('barra'))) col.code = i;
    else if (h.includes('descripcion')) col.desc = i;
    else if (h.includes('existencia') || h === 'stock' || h.includes('cantidad')) col.stock = i;
    else if (h.includes('precio')) col.price = i;
  });
  if (col.desc < 0 && col.code < 0) return { items, errors: ['Faltan las columnas Código y/o Descripción.'] };
  const cell = (r: unknown[], i: number) => (i >= 0 ? r[i] : undefined);
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
    const code = String(cell(row, col.code) ?? '').trim();
    const desc = String(cell(row, col.desc) ?? '').trim();
    const barcodeNum = onlyDigits(cell(row, col.barcodeNum));
    const barcodeAlt = onlyDigits(cell(row, col.barcode));
    const barcode = barcodeNum || barcodeAlt || undefined;
    const sku = code || barcode || '';
    const name = desc || code || barcode || '';
    if (!sku && !name) { errors.push(`Fila ${r + 1}: sin Código ni Descripción, se omitió.`); continue; }
    const stock = Math.max(0, Math.floor(parseNum(cell(row, col.stock))));
    const gross = parseNum(cell(row, col.price));
    // El Excel trae Precio Venta IVI (con IVA 13%): se guarda neto para no duplicar el impuesto en factura
    const net = gross > 0 ? Math.round((gross / 1.13) * 100) / 100 : 0;
    items.push({
      id: crypto.randomUUID(),
      name,
      description: desc || name,
      sku: sku || `IMP-${r}`,
      ...(barcode ? { barcode } : {}),
      price: net,
      cost: 0,
      currency: 'CRC',
      stock,
      category: 'General',
      type: 'producto',
      taxRate: 13,
    });
  }
  if (items.length === 0 && errors.length === 0) errors.push('No se encontraron filas con datos.');
  return { items, errors };
}

function downloadInventoryTemplate() {
  const data = [
    ['Código', 'Descripción', 'Existencia', 'Precio Venta IVI', 'NUMERO DE CODIGO DE BARRAS', 'CODIGO DE BARRAS'],
    ['BIFLEX 110554', 'BIFLEX 110554', 1, 70000, '', ''],
    ['DAKAR DA 11036 633', 'DAKAR DA 11036 633', 1, 50000, '7441103606331', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
}

const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct, onBulkImport }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importPreview, setImportPreview] = useState<Product[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', price: 0, cost: 0, currency: 'CRC', stock: 0, category: '', description: '', type: 'producto', taxRate: 13
  });
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [stockAnalysis, setStockAnalysis] = useState<string | null>(null);
  const [loadingStockAi, setLoadingStockAi] = useState(false);

  const handleStockAnalysis = async () => {
    setLoadingStockAi(true);
    const result = await GeminiService.analyzeInventory(products);
    setStockAnalysis(result);
    setLoadingStockAi(false);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', price: 0, cost: 0, currency: 'CRC', stock: 0, category: 'General', description: '', type: 'producto', taxRate: 13 });
    }
    setIsModalOpen(true);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name || !formData.category) return;
    setGeneratingDesc(true);
    const desc = await GeminiService.generateProductDescription(formData.name, formData.category);
    setFormData(prev => ({ ...prev, description: desc }));
    setGeneratingDesc(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      id: editingProduct ? editingProduct.id : crypto.randomUUID(),
      ...formData
    } as Product;

    if (editingProduct) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode || '').toLowerCase().includes(term);
  });

  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];
      const { items, errors } = parseInventorySheet(rows);
      setImportErrors(errors);
      if (items.length === 0) {
        alert(errors[0] || 'No se encontraron productos en el archivo.');
        return;
      }
      setImportPreview(items);
    } catch (err) {
      console.error('Error al leer el Excel', err);
      alert('No se pudo leer el archivo. Use .xlsx, .xls o .csv con las columnas: Código, Descripción, Existencia, Precio Venta IVI, NUMERO DE CODIGO DE BARRAS.');
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.length === 0) return;
    setImporting(true);
    try {
      await onBulkImport?.(importPreview);
      alert(`Se importaron ${importPreview.length} productos al inventario.`);
      setImportPreview(null);
      setImportErrors([]);
    } catch (err) {
      console.error('Error al importar inventario', err);
      alert('No se pudo guardar la importación. Intente de nuevo.');
    } finally {
      setImporting(false);
    }
  };

  const calculateMargin = (price: number, cost: number = 0) => {
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Inventario</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Gestiona tus productos, costos y existencias</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={downloadInventoryTemplate}
            title="Descargar plantilla Excel con las columnas: Código, Descripción, Existencia, Precio Venta IVI, NUMERO DE CODIGO DE BARRAS"
            className="w-full md:w-auto bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 dark:bg-gray-800 flex justify-center items-center gap-2 border border-gray-200 dark:border-gray-700 font-semibold text-sm transition-all active:scale-95"
          >
            <Download size={18} /> Plantilla Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Subir un Excel con todo el inventario para registrarlo de una vez"
            className="w-full md:w-auto bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 dark:bg-gray-800 flex justify-center items-center gap-2 border border-gray-200 dark:border-gray-700 font-semibold text-sm transition-all active:scale-95"
          >
            <Upload size={18} /> Importar Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white"
          >
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleExcelFile}
      />

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black dark:border-white outline-none text-sm transition-all"
          />
        </div>
        <button
          onClick={handleStockAnalysis}
          disabled={loadingStockAi || products.length === 0}
          className="w-full sm:w-auto flex-shrink-0 flex justify-center items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-60 active:scale-95"
        >
          <BarChart3 size={16} className={loadingStockAi ? 'animate-pulse' : ''} />
          {loadingStockAi ? 'Analizando...' : 'Analizar stock con IA'}
        </button>
      </div>

      {/* ── AI Stock Analysis ── */}
      {stockAnalysis && (
        <div className="relative bg-black dark:bg-gray-900 dark:border dark:border-gray-700 text-white dark:text-gray-100 rounded-2xl p-5 md:p-6 overflow-hidden border border-black">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
          <button onClick={() => setStockAnalysis(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors text-xs">✕</button>
          <h3 className="font-bold flex items-center gap-2 mb-3 text-base md:text-lg">
            <Sparkles size={18} className="text-gray-300" /> Análisis Inteligente del Inventario
          </h3>
          <div className="text-sm text-gray-300 dark:text-gray-400 leading-relaxed space-y-1">
            {stockAnalysis.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredProducts.length === 0 ? (
           <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
             <Package size={48} className="mb-3 opacity-20" />
             <p className="font-medium">No se encontraron productos</p>
           </div>
        ) : (
          filteredProducts.map(product => {
            const margin = calculateMargin(product.price, product.cost);
            return (
              <div key={product.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-black border border-gray-200 dark:border-gray-700 rounded text-[10px] font-bold uppercase tracking-wide mb-1">
                           {product.sku}
                        </span>
                        {product.barcode && (
                          <span className="block font-mono text-[11px] text-gray-500 dark:text-gray-400 mb-1">▮ {product.barcode}</span>
                        )}
                       <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{product.name}</h3>
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[200px]">{product.category}</p>
                    </div>
                    <div className={`flex flex-col items-end px-2.5 py-1 rounded-lg border ${product.stock < 5 ? 'bg-black dark:bg-white text-white dark:text-black border-black' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}>
                      <span className="text-[10px] uppercase font-bold">Stock</span>
                      <span className="font-bold text-lg leading-none">{product.stock}</span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mt-4 py-3 border-t border-gray-50">
                    <div>
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Costo</p>
                       <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                         {product.currency === 'USD' ? '$' : '₡'} {(product.cost || 0).toLocaleString('en-US')}
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Precio Venta</p>
                       <p className="text-lg text-black font-bold">
                         {product.currency === 'USD' ? '$' : '₡'} {product.price.toLocaleString('en-US')}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center justify-between mt-2 pt-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                       Margen: {margin.toFixed(0)}%
                    </span>
                    <div className="flex gap-2">
                       <button onClick={() => handleOpenModal(product)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg active:scale-95 transition-transform hover:bg-gray-200">
                          <Edit2 size={18} />
                       </button>
                       <button onClick={() => onDeleteProduct(product.id)} className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg active:scale-95 transition-transform hover:bg-gray-50 dark:bg-gray-800 hover:text-black">
                          <Trash2 size={18} />
                       </button>
                    </div>
                 </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">SKU / Categoría</th>
                <th className="px-6 py-4 text-right">Costo</th>
                <th className="px-6 py-4 text-right">Precio Venta</th>
                <th className="px-6 py-4 text-right">Margen</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <Package size={48} className="mb-3 opacity-20" />
                      <p className="font-medium">No se encontraron productos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const margin = calculateMargin(product.price, product.cost);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:bg-gray-800 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{product.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-xs">{product.description || 'Sin descripción'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700 dark:text-gray-300 font-mono text-xs">{product.sku}</div>
                        {product.barcode && (
                          <div className="text-gray-400 dark:text-gray-500 font-mono text-[11px] mt-0.5">▮ {product.barcode}</div>
                        )}
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px] font-medium uppercase tracking-wide border border-gray-200 dark:border-gray-700">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                         <span className="text-xs mr-1">{product.currency === 'USD' ? '$' : '₡'}</span>
                         {(product.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{product.currency === 'USD' ? '$' : '₡'}</span>
                        {product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                           {margin.toFixed(0)}%
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${product.stock < 5 ? 'bg-black dark:bg-white text-white dark:text-black border-black' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                          {product.stock < 5 && <AlertTriangle size={10} />}
                          {product.stock}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenModal(product)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-800 dark:text-gray-200 transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => onDeleteProduct(product.id)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay (Mobile Optimized) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up md:animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Complete la información del inventario</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre del Producto</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" placeholder="Ej. Laptop Pro" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">SKU (Código)</label>
                  <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" placeholder="Ej. LP-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nº Código de Barras</label>
                  <input type="text" inputMode="numeric" value={formData.barcode || ''} onChange={e => setFormData({...formData, barcode: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 font-mono" placeholder="Ej. 7441103606331" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categoría</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" placeholder="Ej. Electrónica" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</label>
                    <select 
                      value={formData.type || 'producto'} 
                      onChange={e => setFormData({...formData, type: e.target.value as 'producto' | 'servicio'})} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white dark:bg-gray-900"
                    >
                      <option value="producto">Producto</option>
                      <option value="servicio">Servicio</option>
                    </select>
                   </div>
                   <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">IVA (%)</label>
                    <select 
                      value={formData.taxRate !== undefined ? formData.taxRate : 13} 
                      onChange={e => setFormData({...formData, taxRate: parseInt(e.target.value)})} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white dark:bg-gray-900"
                    >
                      <option value="0">0% - Exento</option>
                      <option value="1">1%</option>
                      <option value="2">2%</option>
                      <option value="4">4%</option>
                      <option value="8">8%</option>
                      <option value="13">13%</option>
                    </select>
                   </div>
                   <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Moneda</label>
                    <select 
                      value={formData.currency || 'CRC'} 
                      onChange={e => setFormData({...formData, currency: e.target.value})} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white dark:bg-gray-900"
                    >
                      <option value="CRC">Colones (₡)</option>
                      <option value="USD">Dólares ($)</option>
                    </select>
                   </div>
                   <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stock</label>
                    <input required disabled={formData.type === 'servicio'} type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all disabled:bg-gray-100 dark:bg-gray-800 disabled:text-gray-400 dark:text-gray-500" />
                   </div>
                </div>
                
                {/* Price and Cost Section */}
                <div className="md:col-span-2 grid grid-cols-2 gap-5 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                     <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                           Costo
                        </label>
                        <div className="relative">
                           <input required type="number" step="0.01" value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} className="w-full pl-3 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none transition-all text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-black flex items-center gap-1">
                           <TrendingUp size={14} /> Precio Venta
                        </label>
                        <div className="relative">
                           <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full pl-3 px-4 py-2.5 border border-gray-300 bg-white dark:bg-gray-900 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all font-bold text-gray-900 dark:text-white" placeholder="0.00" />
                        </div>
                    </div>
                </div>
              </div>
              
              <div className="space-y-1.5 pb-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Descripción</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateDescription}
                    disabled={generatingDesc || !formData.name}
                    className="text-xs flex items-center gap-1 text-black border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 font-medium disabled:opacity-50 px-2 py-1 rounded transition-colors"
                  >
                    <Sparkles size={12} /> {generatingDesc ? 'Generando...' : 'Mejorar con IA'}
                  </button>
                </div>
                <textarea 
                  rows={3} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white outline-none transition-all resize-none dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                  placeholder="Breve descripción del producto..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 pb- safe-bottom">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-xl font-medium transition-colors w-full md:w-auto">Cancelar</button>
                <button type="submit" className="px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-medium shadow-lg shadow-gray-300 transition-all w-full md:w-auto">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import preview modal */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet size={20} /> Vista previa de importación
                </h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {importPreview.length} producto(s) listos para registrar · El Precio Venta IVI se convierte a neto (÷1.13) · Si el SKU ya existe, se actualiza en lugar de duplicarse
                </p>
              </div>
              <button onClick={() => { setImportPreview(null); setImportErrors([]); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
            </div>
            {importErrors.length > 0 && (
              <div className="mx-4 md:mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 max-h-24 overflow-auto">
                {importErrors.slice(0, 10).map((e, i) => <p key={i}>• {e}</p>)}
                {importErrors.length > 10 && <p>• …y {importErrors.length - 10} aviso(s) más</p>}
              </div>
            )}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2">Descripción</th>
                      <th className="px-3 py-2 text-center">Exist.</th>
                      <th className="px-3 py-2 text-right">Precio neto</th>
                      <th className="px-3 py-2">Cód. barras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {importPreview.slice(0, 200).map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-mono">{p.sku}</td>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-center">{p.stock}</td>
                        <td className="px-3 py-2 text-right font-semibold">₡ {p.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 font-mono">{p.barcode || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.length > 200 && (
                  <p className="text-xs text-gray-400 p-3 text-center">Mostrando 200 de {importPreview.length} filas…</p>
                )}
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
              <button onClick={() => { setImportPreview(null); setImportErrors([]); }} className="px-5 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium w-full sm:w-auto">Cancelar</button>
              <button onClick={handleConfirmImport} disabled={importing} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 font-semibold disabled:opacity-60 w-full sm:w-auto border border-black">
                {importing ? 'Registrando…' : `Confirmar y registrar ${importPreview.length} productos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;