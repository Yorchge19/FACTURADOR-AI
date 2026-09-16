import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Save, Building2, Receipt, MapPin, Wallet, MessageSquare, RefreshCw, ShieldCheck, Lock, FileKey, UploadCloud, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);

  // Force staging environment on mount
  useEffect(() => {
    if (formData.hacienda?.environment !== 'staging') {
        setFormData(prev => ({
            ...prev,
            hacienda: {
                ...prev.hacienda!,
                environment: 'staging'
            }
        }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Double check enforcement before saving
    const safeSettings = {
        ...formData,
        hacienda: {
            ...formData.hacienda!,
            environment: 'staging' as const
        }
    };
    onSaveSettings(safeSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simulation of file upload logic
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.p12')) {
        setFormData(prev => ({
          ...prev,
          hacienda: {
            ...prev.hacienda!,
            certificateUploaded: true
          }
        }));
        alert('Certificado de PRUEBAS cargado exitosamente (Simulación)');
      } else {
        alert('Por favor cargue un archivo .p12 válido');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Configuración</h2>
        <p className="text-gray-500 mt-1 text-sm md:text-base">Información del Emisor y Parámetros del Sistema</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Company Section */}
          <div className="p-4 md:p-8 border-b border-gray-100">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 md:mb-6">
              <Building2 className="text-black" size={20} /> Datos del Emisor
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Razón Social (Nombre Legal)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.companyName} 
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    placeholder="Ej. Inversiones del Valle S.A."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Nombre Comercial</label>
                  <input 
                    type="text" 
                    value={formData.commercialName || ''} 
                    onChange={e => setFormData({...formData, commercialName: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    placeholder="Ej. Tienda El Valle"
                  />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Cédula Jurídica / Física</label>
                    <input 
                      type="text" 
                      required
                      value={formData.companyTaxId} 
                      onChange={e => setFormData({...formData, companyTaxId: e.target.value})}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                      placeholder="3-101-123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Teléfono</label>
                    <input 
                       type="text" 
                       value={formData.companyPhone || ''} 
                       onChange={e => setFormData({...formData, companyPhone: e.target.value})}
                       className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                       placeholder="2222-2222"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email Facturación</label>
                    <input 
                       type="email" 
                       value={formData.companyEmail || ''} 
                       onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                       className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                       placeholder="facturacion@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Sitio Web</label>
                    <input 
                       type="text" 
                       value={formData.companyWebsite || ''} 
                       onChange={e => setFormData({...formData, companyWebsite: e.target.value})}
                       className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                       placeholder="www.empresa.com"
                    />
                  </div>
               </div>
              
              <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-black" /> Ubicación Fiscal
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                     <input
                        type="text"
                        value={formData.province || ''} 
                        onChange={e => setFormData({...formData, province: e.target.value})}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                        placeholder="Provincia"
                      />
                      <input
                        type="text"
                        value={formData.canton || ''} 
                        onChange={e => setFormData({...formData, canton: e.target.value})}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                        placeholder="Cantón"
                      />
                      <input
                        type="text"
                        value={formData.district || ''} 
                        onChange={e => setFormData({...formData, district: e.target.value})}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                        placeholder="Distrito"
                      />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    placeholder="Otras señas (Barrio, calles, número de local)"
                  />
              </div>
            </div>
          </div>

          {/* Hacienda API Configuration Section */}
          <div className="p-4 md:p-8 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 md:mb-6">
              <ShieldCheck className="text-gray-600" size={20} /> Facturación Electrónica (Modo Pruebas)
            </h3>
            <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="text-gray-600 min-w-[24px]" size={24} />
                <div>
                    <h4 className="font-bold text-gray-900 text-sm">Sistema en Sandbox (Staging)</h4>
                    <p className="text-xs text-gray-600 mt-1">
                        Esta aplicación está configurada exclusivamente para emitir documentos de prueba. 
                        <strong className="block mt-1">No se enviarán facturas reales a Hacienda Producción.</strong>
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Ambiente</label>
                  <div className="w-full p-3 border border-gray-200 bg-gray-100 rounded-xl text-gray-500 font-medium flex items-center justify-between cursor-not-allowed">
                    <span>Sandbox / Pruebas</span>
                    <Lock size={14} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Usuario API (CPF-...)</label>
                  <input 
                    type="text" 
                    value={formData.hacienda?.username || ''} 
                    onChange={e => setFormData({...formData, hacienda: {...formData.hacienda!, username: e.target.value}})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                    placeholder="cpf-01-1111-2222@staging.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <Lock size={14} /> Contraseña API
                   </label>
                   <input 
                     type="password" 
                     value={formData.hacienda?.password || ''} 
                     onChange={e => setFormData({...formData, hacienda: {...formData.hacienda!, password: e.target.value}})}
                     className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                     placeholder="••••••••"
                   />
                </div>
                <div className="space-y-2">
                   <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <FileKey size={14} /> PIN del Certificado
                   </label>
                   <input 
                     type="password" 
                     maxLength={4}
                     value={formData.hacienda?.pin || ''} 
                     onChange={e => setFormData({...formData, hacienda: {...formData.hacienda!, pin: e.target.value}})}
                     className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                     placeholder="••••"
                   />
                </div>
                <div className="space-y-2">
                   <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <UploadCloud size={14} /> Llave Criptográfica (.p12)
                   </label>
                   <div className={`relative w-full p-2.5 border border-dashed border-gray-300 rounded-xl bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${formData.hacienda?.certificateUploaded ? 'border-black bg-gray-50' : ''}`}>
                      <input type="file" accept=".p12" onChange={handleCertificateUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <span className={`text-sm font-medium ${formData.hacienda?.certificateUploaded ? 'text-black' : 'text-gray-500'}`}>
                        {formData.hacienda?.certificateUploaded ? 'Certificado Cargado' : 'Seleccionar Archivo...'}
                      </span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial & Footer Section */}
          <div className="p-4 md:p-8 bg-gray-50/30">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 md:mb-6">
              <Receipt className="text-black" size={20} /> Configuración de Factura y Moneda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
               <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                   <Wallet size={14} /> Moneda Principal
                </label>
                <select 
                  required
                  value={formData.currency} 
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                >
                  <option value="CRC">Colones (₡)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                   <RefreshCw size={14} /> Tipo de Cambio (₡)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.exchangeRate || 520} 
                  onChange={e => setFormData({...formData, exchangeRate: parseFloat(e.target.value)})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                  placeholder="Ej. 520"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Impuesto IVA (%)</label>
                <input 
                  type="number" 
                  required
                  value={formData.taxRate} 
                  onChange={e => setFormData({...formData, taxRate: parseFloat(e.target.value)})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                   <MessageSquare size={14} /> Mensaje al Pie (Resolución Hacienda / Despedida)
                </label>
                <textarea 
                  rows={3}
                  value={formData.footerMessage || ''} 
                  onChange={e => setFormData({...formData, footerMessage: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white resize-none"
                  placeholder="Ej. Autorizado mediante resolución... Gracias por su compra."
                />
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky bottom-0 z-10">
            <div className="text-xs md:text-sm text-gray-500">
              {saved ? <span className="text-black font-bold animate-pulse flex items-center gap-1">Cambios guardados correctamente</span> : "Recuerda guardar tus cambios."}
            </div>
            <button 
              type="submit" 
              className="w-full sm:w-auto bg-black text-white px-6 md:px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 shadow-lg shadow-gray-200 flex items-center justify-center gap-2 transition-all active:scale-95 border border-black"
            >
              <Save size={20} /> Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;