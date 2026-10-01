import React from 'react';
import { LabOrder, AppSettings, Customer } from '../types';

interface LabOrderPrintProps {
  order: LabOrder;
  settings: AppSettings;
  customer?: Customer;
}

const LabOrderPrint: React.FC<LabOrderPrintProps> = ({ order, settings, customer }) => {
  return (
    <div id="printable-area" className="bg-white relative w-full">
      <div className="w-full bg-gray-100 border-b border-gray-300 p-2 text-center">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Documento interno de taller — Sin validez fiscal</p>
      </div>

      <div className="p-4 sm:p-6 md:p-8 w-full max-w-[210mm] mx-auto text-gray-900 text-xs font-sans leading-tight relative overflow-x-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.04]">
          <span className="text-[110px] font-black -rotate-45 transform text-black whitespace-nowrap">LABORATORIO</span>
        </div>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4 relative z-10">
          <div className="flex gap-3 sm:gap-4 items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-2 border-gray-800 rounded-xl flex items-center justify-center text-gray-800 font-black text-xl sm:text-2xl italic tracking-tighter shadow-sm flex-shrink-0">
              {settings.companyName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <h2 className="text-lg sm:text-xl font-bold text-black mb-2">ORDEN DE LABORATORIO</h2>
            <div className="text-[10px] text-gray-800 space-y-1 break-words">
              <p><span className="font-bold">Número:</span> {order.number}</p>
              <p><span className="font-bold">Fecha:</span> {new Date(order.date).toLocaleDateString('es-CR')}</p>
              {order.expectedDate && <p className="font-bold">Entrega esperada: {new Date(order.expectedDate + 'T00:00:00').toLocaleDateString('es-CR')}</p>}
              <p><span className="font-bold">Estado:</span> {order.status.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* EMPRESA + TALLER */}
        <div className="flex flex-col md:flex-row gap-2 mb-2 relative z-10">
          <div className="border-2 border-gray-800 rounded-2xl p-3 w-full md:w-[60%] flex flex-col justify-center">
            <h3 className="font-bold text-sm text-center mb-2 break-words">{settings.companyName}</h3>
            <div className="space-y-1 px-2 break-words">
              <p className="break-words"><span className="font-semibold">Dirección:</span> {settings.province}, {settings.canton}, {settings.district}, {settings.address}</p>
              <p><span className="font-semibold">Tel:</span> {settings.companyPhone}</p>
              <p className="break-all"><span className="font-semibold">Email:</span> {settings.companyEmail}</p>
            </div>
          </div>
          <div className="border-2 border-gray-800 rounded-2xl p-3 w-full md:w-[40%] flex flex-col justify-center space-y-1.5">
            <p><span className="font-semibold">Laboratorio:</span> {order.labProvider}</p>
            {order.lensType && <p className="break-words"><span className="font-semibold">Tipo de lente:</span> {order.lensType}</p>}
            {order.frameDetail && <p className="break-words"><span className="font-semibold">Armazón:</span> {order.frameDetail}</p>}
            {order.measurements && <p className="break-words"><span className="font-semibold">Medidas:</span> {order.measurements}</p>}
          </div>
        </div>

        {/* CLIENTE + ORIGEN */}
        <div className="border-2 border-gray-800 rounded-2xl p-3 mb-4 relative z-10">
          <h3 className="font-bold text-center mb-2 text-sm">Paciente / Cliente</h3>
          <div className="space-y-1 px-2 break-words">
            <p className="break-words"><span className="font-bold">Nombre:</span> {(customer?.name || order.customerName).toUpperCase()}</p>
            {customer && (
              <>
                <p className="break-all"><span className="font-semibold">Identificación:</span> {customer.taxId}</p>
                <p><span className="font-semibold">Tel:</span> {customer.phone}</p>
              </>
            )}
            {(order.quoteNumber || order.invoiceNumber) && (
              <p><span className="font-semibold">Origen:</span> {order.quoteNumber ? `Cotización ${order.quoteNumber}` : ''}{order.quoteNumber && order.invoiceNumber ? ' · ' : ''}{order.invoiceNumber ? `Factura ${order.invoiceNumber}` : ''}</p>
            )}
          </div>
        </div>

        {/* ITEMS */}
        <div className="mb-4 relative z-10 overflow-x-auto">
          <h3 className="font-bold text-lg mb-1 pl-1">Trabajos</h3>
          <table className="w-full border-collapse border-t-2 border-b-2 border-gray-800 min-w-[520px]">
            <thead className="border-b border-gray-400">
              <tr className="text-[11px]">
                <th className="py-1 px-1 text-center w-[10%]">Cant</th>
                <th className="py-1 px-1 text-left w-[65%]">Descripción</th>
                <th className="py-1 px-1 text-right w-[25%]">Ref.</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 px-1 text-center">{item.quantity}</td>
                  <td className="py-1 px-1 text-left">{item.productName} {item.description ? `- ${item.description}` : ''}</td>
                  <td className="py-1 px-1 text-right">{item.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col md:flex-row mt-6 text-[11px] relative z-10 gap-4 md:gap-0">
          <div className="w-full md:w-[60%] md:pr-8 flex flex-col justify-between">
            <div>
              <div className="border border-gray-300 rounded p-2 mb-4 h-24">
                <p className="font-bold mb-1">Notas de taller:</p>
                <p>{order.notes || '—'}</p>
              </div>
              <p className="text-center font-bold text-[9px] text-gray-400 mt-2">Orden interna — No constituye comprobante fiscal</p>
            </div>
          </div>
          <div className="w-full md:w-[40%]">
            <div className="border border-gray-300 rounded p-3">
              <p className="font-bold mb-2 text-center">Control de taller</p>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-dashed border-gray-300 pb-1"><span>Recibido por lab:</span><span>___/___/___</span></div>
                <div className="flex justify-between border-b border-dashed border-gray-300 pb-1"><span>Devuelto por lab:</span><span>___/___/___</span></div>
                <div className="flex justify-between border-b border-dashed border-gray-300 pb-1"><span>Entregado a cliente:</span><span>___/___/___</span></div>
                <div className="pt-2 text-center text-[10px] text-gray-500">Firma recibido conforme: ___________________</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabOrderPrint;
