import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Edit2, Trash2, Search, Sparkles, X, Package, AlertTriangle, TrendingUp, MoreVertical, BarChart3 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <button 
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU..."
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
                        <div className="flex justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
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
    </div>
  );
};

export default Inventory;