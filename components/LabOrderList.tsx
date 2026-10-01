import React, { useState } from 'react';
import { LabOrder, AppSettings, Customer } from '../types';
import { Printer, X, FileText, Clock, CheckCircle, AlertTriangle, ArrowRight, Wrench, Truck, PackageCheck, UserCheck } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { useNavigate } from 'react-router-dom';
import LabOrderPrint from './LabOrderPrint';

interface LabOrderListProps {
  labOrders: LabOrder[];
  onUpdateStatus: (orderId: string, status: LabOrder['status']) => void;
  settings?: AppSettings;
}

const LabOrderList: React.FC<LabOrderListProps> = ({ labOrders, onUpdateStatus, settings: propSettings }) => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [printSettings, setPrintSettings] = useState<AppSettings | null>(propSettings || null);
  const [printCustomer, setPrintCustomer] = useState<Customer | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusBadge = (status: LabOrder['status']) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 w-fit"><FileText size={12} /> PENDIENTE</span>;
      case 'sent':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 w-fit"><Truck size={12} /> ENVIADA</span>;
      case 'received':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 w-fit"><PackageCheck size={12} /> RECIBIDA</span>;
      case 'delivered':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 w-fit"><UserCheck size={12} /> ENTREGADA</span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded-full border border-red-200 w-fit"><X size={12} /> ANULADA</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-200 w-fit">{(status as string).toUpperCase()}</span>;
    }
  };

  const isOverdue = (o: LabOrder) => {
    if (!o.expectedDate || o.status === 'delivered' || o.status === 'cancelled') return false;
    return new Date(o.expectedDate + 'T00:00:00') < new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
  };

  const handlePrint = async (order: LabOrder) => {
    const s = propSettings || await StorageService.getSettings();
    const customers = await StorageService.getCustomers();
    const customer = customers.find(c => c.id === order.customerId);
    setPrintSettings(s);
    setPrintCustomer(customer);
    setSelectedOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const filteredOrders = statusFilter === 'all' ? labOrders : labOrders.filter(o => o.status === statusFilter);

  const statusOptions: LabOrder['status'][] = ['pending', 'sent', 'received', 'delivered', 'cancelled'];
  const statusLabels: Record<LabOrder['status'], string> = {
    pending: 'Pendiente',
    sent: 'Enviada al lab',
    received: 'Recibida del lab',
    delivered: 'Entregada al cliente',
    cancelled: 'Anulada',
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Laboratorio / Taller</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Seguimiento de trabajos enviados a fabricar o montar</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none">
            <option value="all">Todos los estados</option>
            {statusOptions.map(s => (<option key={s} value={s}>{statusLabels[s]}</option>))}
          </select>
          <button onClick={() => navigate('/workspace/create-lab-order')} className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white text-sm font-semibold">
            <Wrench size={18} /> Nueva Orden
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Wrench size={48} strokeWidth={1} />
            <p className="mt-2 font-medium">No hay órdenes de laboratorio</p>
            <p className="text-xs">Crea la primera orden de trabajo</p>
          </div>
        ) : (
          filteredOrders.map(o => (
            <div key={o.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{o.number}</p>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{o.customerName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{o.labProvider} · {new Date(o.date).toLocaleDateString('es-CR')}</p>
                  {o.expectedDate && (
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue(o) ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Clock size={12} /> Entrega: {new Date(o.expectedDate + 'T00:00:00').toLocaleDateString('es-CR')}
                      {isOverdue(o) && ' · ATRASADA'}
                    </p>
                  )}
                </div>
                <div className="flex justify-end mt-1">{getStatusBadge(o.status)}</div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-gray-800 mt-2 gap-2">
                <select value={o.status} onChange={e => onUpdateStatus(o.id, e.target.value as LabOrder['status'])} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {statusOptions.map(s => (<option key={s} value={s}>{statusLabels[s]}</option>))}
                </select>
                <button onClick={() => handlePrint(o)} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white" title="Ver / Imprimir">
                  <Printer size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Laboratorio</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Entrega Esp.</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400 dark:text-gray-500">No hay órdenes que coincidan con el filtro.</td></tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-black dark:text-white">{o.number}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{o.customerName}</td>
                    <td className="px-6 py-4 truncate max-w-[160px]">{o.labProvider}</td>
                    <td className="px-6 py-4">{new Date(o.date).toLocaleDateString('es-CR')}</td>
                    <td className="px-6 py-4">
                      {o.expectedDate ? (
                        <span className={isOverdue(o) ? 'text-red-600 font-bold flex items-center gap-1' : ''}>
                          {isOverdue(o) && <AlertTriangle size={14} />}
                          {new Date(o.expectedDate + 'T00:00:00').toLocaleDateString('es-CR')}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(o.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2 items-center">
                        <button onClick={() => handlePrint(o)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Ver / Imprimir"><Printer size={16} /></button>
                        <select value={o.status} onChange={e => onUpdateStatus(o.id, e.target.value as LabOrder['status'])} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800">
                          {statusOptions.map(s => (<option key={s} value={s}>{statusLabels[s]}</option>))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print preview modal */}
      {selectedOrder && printSettings && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex justify-center items-start overflow-auto p-0 md:p-10 print:p-0 print:block hidden md:flex">
          <button onClick={() => setSelectedOrder(null)} className="fixed top-4 right-4 bg-black dark:bg-white text-white dark:text-black p-2 rounded-full shadow-lg z-50 hover:bg-gray-800"><X size={20} /></button>
          <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:w-full">
            <LabOrderPrint order={selectedOrder} settings={printSettings} customer={printCustomer} />
          </div>
        </div>
      )}

      {/* Pending summary */}
      {labOrders.some(o => o.status === 'sent' || o.status === 'pending') && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4">
          <CheckCircle size={18} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold">{labOrders.filter(o => o.status === 'sent' || o.status === 'pending').length}</span> orden(es) en proceso (pendientes o enviadas al laboratorio).
          </p>
        </div>
      )}
    </div>
  );
};

export default LabOrderList;
