import React from 'react';
import { Invoice, Payment, AppSettings } from '../types';

interface ReceiptPrintProps {
  payment: Payment;
  invoice: Invoice;
  settings: AppSettings;
}

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ payment, invoice, settings }) => {
  // Calcular saldo restante después de este pago específico
  // Nota: invoice.balance ya viene actualizado de la base de datos o estado local
  const currencySymbol = invoice.currency === 'USD' ? '$' : '₡';

  return (
    <div id="printable-area" className="bg-white p-4 sm:p-6 md:p-8 w-full max-w-[210mm] mx-auto text-gray-900 font-sans text-sm relative border border-gray-200 print:border-0 overflow-x-hidden">
      
      {/* Encabezado Empresa */}
      <div className="text-center mb-6 border-b-2 border-gray-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide break-words">{settings.companyName}</h2>
        {settings.companyTaxId && <p className="text-xs text-gray-500 break-all">Cédula: {settings.companyTaxId}</p>}
        <p className="text-xs text-gray-500 break-words">
          {settings.province}, {settings.canton} {settings.companyPhone && `• Tel: ${settings.companyPhone}`}
        </p>
      </div>

      {/* Título del Documento */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100 print:border-gray-300">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 uppercase">Recibo de Dinero</h1>
           <p className="text-xs text-gray-500 uppercase tracking-wider">Comprobante de Pago</p>
        </div>
        <div className="text-right">
           <p className="text-sm font-semibold text-gray-500">Recibo #</p>
           <p className="font-mono font-bold text-lg">{payment.id.slice(0, 8).toUpperCase()}</p>
           <p className="text-xs text-gray-400">{new Date(payment.date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Cuerpo del Recibo */}
      <div className="space-y-6 mb-8">
        
        {/* Monto Grande */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
           <span className="font-bold text-gray-500 uppercase text-xs">Monto Recibido</span>
           <span className="text-2xl sm:text-3xl font-bold text-black break-all">
             {currencySymbol} {payment.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}
           </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Recibido de</p>
              <p className="font-semibold text-base border-b border-gray-300 pb-1 break-words">{invoice.customerName}</p>
           </div>
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Método de Pago</p>
              <p className="font-semibold text-base border-b border-gray-300 pb-1 break-words">{payment.method}</p>
           </div>
        </div>

        <div>
           <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Concepto</p>
           <p className="text-sm leading-relaxed">
             Abono a Factura N° <span className="font-bold">{invoice.number}</span>. 
             {payment.notes && ` Notas: ${payment.notes}`}
           </p>
        </div>
      </div>

      {/* Resumen de Saldos */}
      <div className="bg-gray-50 rounded-xl p-4 mb-12 border border-gray-100 print:border-gray-300">
         <h3 className="font-bold text-xs text-gray-500 uppercase mb-3 border-b border-gray-200 pb-1">Estado de Cuenta (Factura {invoice.number})</h3>
         <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Total Factura:</span>
            <span className="font-mono font-semibold">{currencySymbol} {invoice.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
         </div>
         <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
            <span>Nuevo Saldo Pendiente:</span>
            <span>{currencySymbol} {invoice.balance?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}</span>
         </div>
      </div>

      {/* Firmas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 mt-16">
         <div className="text-center">
            <div className="border-t border-gray-400 w-full mb-2"></div>
            <p className="text-xs font-bold uppercase text-gray-500">Recibido Conforme</p>
            <p className="text-[10px] text-gray-400">{settings.companyName}</p>
         </div>
         <div className="text-center">
            <div className="border-t border-gray-400 w-full mb-2"></div>
            <p className="text-xs font-bold uppercase text-gray-500">Entregué Conforme</p>
         </div>
      </div>

      <div className="mt-12 text-center text-[10px] text-gray-400">
        <p>Documento generado por Facturador AI</p>
      </div>

    </div>
  );
};

export default ReceiptPrint;