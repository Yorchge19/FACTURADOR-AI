import React, { useState } from 'react';
import { Customer } from '../types';
import { Plus, Mail, Phone, MapPin, X, User, Building2, Globe, FileText, Search, Loader2, Wand2 } from 'lucide-react';
import { HaciendaService } from '../services/haciendaService';

interface CustomersProps {
  customers: Customer[];
  onAddCustomer: (c: Customer) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingId, setIsSearchingId] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', 
    commercialName: '',
    email: '', 
    identificationType: '01 Cédula Física',
    taxId: '', 
    taxRegime: 'Tradicional',
    economicActivity: '',
    country: 'Costa Rica',
    province: '',
    canton: '',
    district: '',
    zipCode: '',
    address: '', 
    phone: ''
  });

  const handleSearchTaxpayer = async () => {
    if (!formData.taxId) return;
    
    setIsSearchingId(true);
    try {
      const info = await HaciendaService.getTaxpayerInfo(formData.taxId);
      setFormData(prev => ({
        ...prev,
        name: info.nombre,
        identificationType: info.tipoIdentificacion,
        economicActivity: info.actividadEconomica,
        taxRegime: info.regimen
      }));
    } catch (error) {
      alert("No se pudo obtener la información. Verifique la cédula o intente manualmente.");
    } finally {
      setIsSearchingId(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer = { id: crypto.randomUUID(), ...formData } as Customer;
    onAddCustomer(newCustomer);
    setIsModalOpen(false);
    // Reset form
    setFormData({ 
      name: '', commercialName: '', email: '', identificationType: '01 Cédula Física', 
      taxId: '', taxRegime: 'Tradicional', economicActivity: '', country: 'Costa Rica', province: '', 
      canton: '', district: '', zipCode: '', address: '', phone: '' 
    });
  };

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.taxId || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Directorio para Facturación Electrónica</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto bg-black text-white px-5 py-3 md:py-2.5 rounded-xl hover:bg-gray-800 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="relative w-full md:max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
             type="text" 
             placeholder="Buscar por nombre o cédula..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none bg-gray-50"
          />
        </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredCustomers.map(c => (
          <div key={c.id} className="group bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden relative">
            <div className="h-2 bg-black w-full"></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-black font-bold text-xl shadow-inner">
                  {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="text-right">
                  <div className="bg-white px-2 py-1 rounded-lg border border-gray-200 inline-block mb-1">
                    <span className="text-[10px] font-bold uppercase text-gray-800 tracking-wide">
                       {(c.identificationType || '01').split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-500 flex items-center justify-end gap-1">
                     <Building2 size={10} />
                     {c.taxId}
                  </div>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-0 group-hover:text-black transition-colors line-clamp-1">{c.name}</h3>
              {c.commercialName && <p className="text-sm text-gray-500 mb-1 line-clamp-1">{c.commercialName}</p>}
              
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-50 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-gray-50 rounded-full text-gray-400"><Mail size={14} /></div> 
                  <span className="truncate">{c.email}</span>
                </div>
                {c.economicActivity && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-full text-gray-400"><FileText size={14} /></div> 
                    <span className="text-xs line-clamp-1" title={c.economicActivity}>{c.economicActivity}</span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-gray-50 rounded-full text-gray-400 mt-0.5"><MapPin size={14} /></div> 
                  <span className="text-xs leading-relaxed line-clamp-2">
                    {c.province || ''} {c.canton ? `, ${c.canton}` : ''} {c.address ? ` - ${c.address}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Completo para Factura Electrónica */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4 transition-all">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-up md:animate-scale-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">Datos del Cliente</h3>
                <p className="text-xs md:text-sm text-gray-500">Información requerida para Factura Electrónica</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-colors flex-shrink-0"><X size={20} /></button>
            </div>
            
            <div className="overflow-y-auto p-4 md:p-8 flex-1">
            <form id="customerForm" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Identificación */}
              <div>
                <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16} /> Identificación Fiscal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Número de Identificación (Cédula)</label>
                    <div className="relative flex gap-2">
                      <input 
                        required 
                        value={formData.taxId} 
                        onChange={e => setFormData({...formData, taxId: e.target.value})} 
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" 
                        placeholder="Ej. 101110222 (Sin guiones)" 
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchTaxpayer())}
                      />
                      <button 
                        type="button"
                        onClick={handleSearchTaxpayer}
                        disabled={isSearchingId || !formData.taxId}
                        className="px-4 bg-gray-50 text-black rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                        title="Buscar en Hacienda"
                      >
                        {isSearchingId ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 pl-1">Presione la lupa para autocompletar nombre y actividad.</p>
                  </div>
                  
                   <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Tipo</label>
                    <select 
                      required 
                      value={formData.identificationType} 
                      onChange={e => setFormData({...formData, identificationType: e.target.value})} 
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none bg-white"
                    >
                      <option value="01 Cédula Física">01 Cédula Física</option>
                      <option value="02 Cédula Jurídica">02 Cédula Jurídica</option>
                      <option value="03 DIMEX">03 DIMEX</option>
                      <option value="04 NITE">04 NITE</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Razón Social (Nombre Legal)</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="Nombre completo registrado en Hacienda" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Nombre Comercial</label>
                    <input value={formData.commercialName} onChange={e => setFormData({...formData, commercialName: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="Opcional" />
                  </div>
                   <div className="space-y-1.5 md:col-span-3">
                    <label className="text-sm font-semibold text-gray-700">Actividad Económica</label>
                    <input 
                      value={formData.economicActivity} 
                      onChange={e => setFormData({...formData, economicActivity: e.target.value})} 
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-gray-50" 
                      placeholder="Código y Descripción (Se llena automático)" 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Ubicación */}
              <div>
                 <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Dirección Fiscal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                   <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">País</label>
                      <input required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Provincia</label>
                      <input required value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="Ej. San José" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Cantón</label>
                      <input required value={formData.canton} onChange={e => setFormData({...formData, canton: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="Ej. Central" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Distrito</label>
                      <input required value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="Ej. Pavas" />
                   </div>
                   <div className="md:col-span-2 space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Otras Señas / Dirección Exacta</label>
                      <input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="Barrio, Calle, Número..." />
                   </div>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Contacto */}
              <div>
                 <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Mail size={16} /> Datos de Contacto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Email para Factura</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="facturacion@cliente.com" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Teléfono</label>
                      <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="+506 ..." />
                   </div>
                </div>
              </div>
              </form>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-4 md:p-6 border-t border-gray-100 bg-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 md:py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="submit" form="customerForm" className="w-full sm:w-auto px-6 py-3 md:py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 font-medium shadow-lg shadow-gray-200 transition-all border border-black">Guardar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;