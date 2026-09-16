
import React from 'react';
import { Invoice, AppSettings, Customer } from '../types';

interface InvoicePrintProps {
  invoice: Invoice;
  settings: AppSettings;
  customer?: Customer;
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({ invoice, settings, customer }) => {
  // Logic to determine symbol based on Invoice currency
  const currencyCode = invoice.currency || settings.currency || 'CRC';
  const symbol = currencyCode === 'CRC' ? '₡' : '$';

  return (
    <div id="printable-area" className="bg-white relative w-full">
        {/* WATERMARK BANNER - SAFETY FOR TEST MODE */}
        <div className="w-full bg-gray-200 border-b border-gray-300 p-2 text-center">
            <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] px-2">
                *** Documento de Prueba - Sin Validez Fiscal (Sandbox) ***
            </p>
        </div>

        <div className="p-4 sm:p-6 md:p-8 w-full max-w-[210mm] mx-auto text-gray-900 text-xs font-sans leading-tight relative overflow-x-hidden">
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03]">
                <span className="text-[150px] font-black -rotate-45 transform text-black whitespace-nowrap">
                    SIN VALIDEZ
                </span>
            </div>

            {/* HEADER: Logo & Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4 relative z-10">
                <div className="flex gap-3 sm:gap-4 items-center">
                    {/* Logo Placeholder */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-2 border-yellow-400 rounded-xl flex items-center justify-center text-blue-800 font-black text-xl sm:text-2xl italic tracking-tighter shadow-sm flex-shrink-0">
                        {settings.companyName.substring(0, 2).toUpperCase()}
                    </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                    <h2 className="text-lg sm:text-xl font-bold text-black mb-2">Factura Electrónica</h2>
                    <div className="text-[10px] text-gray-800 space-y-1 break-words">
                        <p className="break-all"><span className="font-bold">Número Consecutivo:</span> {invoice.consecutive || '00100001010000000001'}</p>
                        <p className="break-all"><span className="font-bold">Clave:</span> {invoice.electronicKey || '50629112400310112345600100001010000000001199999999'}</p>
                        <p className="text-red-600 font-bold uppercase mt-1">Versión de Pruebas (4.3)</p>
                    </div>
                </div>
            </div>

            {/* SECTION: EMISOR & META DATA - Rounded Boxes */}
            <div className="flex flex-col md:flex-row gap-2 mb-2 md:h-40 relative z-10">
                {/* Emisor Box */}
                <div className="border-2 border-gray-800 rounded-2xl p-3 w-full md:w-[60%] flex flex-col justify-center">
                    <h3 className="font-bold text-sm text-center mb-2 break-words">{settings.companyName}</h3>
                    <div className="space-y-1 px-2 break-words">
                        <p className="break-words"><span className="font-semibold">Dirección:</span> {settings.province}, {settings.canton}, {settings.district}, {settings.address}</p>
                        <p className="break-all"><span className="font-semibold">Cédula Jurídica/Física:</span> {settings.companyTaxId}</p>
                        <p><span className="font-semibold">Teléfono:</span> {settings.companyPhone}</p>
                        <p className="break-all"><span className="font-semibold">Email:</span> {settings.companyEmail}</p>
                        <p><span className="font-semibold"># Factura Interno:</span> {invoice.number}</p>
                    </div>
                </div>

                {/* Meta Data Box */}
                <div className="border-2 border-gray-800 rounded-2xl p-3 w-full md:w-[40%] flex flex-col justify-center space-y-1.5">
                    <p><span className="font-semibold">Tipo Documento:</span> FACTURA</p>
                    <p className="break-words"><span className="font-semibold">Fecha y Hora:</span> {new Date(invoice.date).toLocaleDateString()} {invoice.time || new Date().toLocaleTimeString()}</p>
                    <p><span className="font-semibold">Condición de Venta:</span> {(invoice.saleCondition || 'Contado').toUpperCase()}</p>
                    <p><span className="font-semibold">Método de Pago:</span> {(invoice.paymentMethod || 'Efectivo').toUpperCase()}</p>
                    <p><span className="font-semibold">Moneda:</span> {currencyCode}</p>
                </div>
            </div>

            {/* SECTION: RECEPTOR - Rounded Box */}
            <div className="border-2 border-gray-800 rounded-2xl p-3 mb-4 relative z-10">
                <h3 className="font-bold text-center mb-2 text-sm">Receptor del Comprobante</h3>
                <div className="space-y-1 px-2 break-words">
                    <p className="break-words"><span className="font-bold">Nombre:</span> {(customer?.name || invoice.customerName).toUpperCase()}</p>
                    {customer && (
                        <>
                        <p className="break-words"><span className="font-semibold">Dirección:</span> {customer.province}, {customer.canton}, {customer.district}, {customer.address.toUpperCase()}</p>
                        <p className="break-all"><span className="font-semibold">Identificación:</span> {customer.taxId}</p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-8">
                            <p><span className="font-semibold">Teléfono:</span> {customer.phone}</p>
                            <p className="break-all"><span className="font-semibold">Email:</span> {customer.email}</p>
                        </div>
                        </>
                    )}
                </div>
            </div>

            {/* SECTION: ITEMS TABLE */}
            <div className="mb-4 relative z-10 overflow-x-auto">
                <h3 className="font-bold text-lg mb-1 pl-1">Facturación</h3>
                <table className="w-full border-collapse border-t-2 border-b-2 border-gray-800 min-w-[520px]">
                    <thead className="border-b border-gray-400">
                        <tr className="text-[11px]">
                            <th className="py-1 px-1 text-center w-[8%]">Cantidad</th>
                            <th className="py-1 px-1 text-left w-[40%]">Descripción</th>
                            <th className="py-1 px-1 text-right w-[12%]">Precio</th>
                            <th className="py-1 px-1 text-right w-[10%]">Descuento</th>
                            <th className="py-1 px-1 text-right w-[10%]">Exonerado</th>
                            <th className="py-1 px-1 text-right w-[10%]">I.V.A</th>
                            <th className="py-1 px-1 text-right w-[10%]">Sub Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px]">
                        {invoice.items.map((item, idx) => {
                            // Basic Line Calculation for display (assuming flat tax for now)
                            const lineTotal = item.total; // Price * Qty - Discount
                            const lineTax = (lineTotal * settings.taxRate) / 100;
                            const lineSubTotal = lineTotal + lineTax;

                            return (
                                <tr key={idx}>
                                    <td className="py-1 px-1 text-center">{item.quantity}</td>
                                    <td className="py-1 px-1 text-left">{item.productName} {item.description ? `- ${item.description}` : ''}</td>
                                    <td className="py-1 px-1 text-right">{item.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td className="py-1 px-1 text-right">{(item.price * item.quantity * (item.discount || 0) / 100).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="py-1 px-1 text-right">0.00</td>
                                    <td className="py-1 px-1 text-right">{lineTax.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="py-1 px-1 text-right font-medium">{lineSubTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* SECTION: FOOTER SUMMARY GRID */}
            <div className="flex flex-col md:flex-row mt-6 text-[11px] relative z-10 gap-4 md:gap-0">
                <div className="w-full md:w-[60%] md:pr-8 flex flex-col justify-between">
                    <div>
                        <div className="border border-gray-300 rounded p-2 mb-4 h-24">
                            <p className="font-bold mb-1">Observaciones:</p>
                            <p>{invoice.notes}</p>
                        </div>
                        {settings.footerMessage && (
                            <p className="text-center italic text-[10px]">{settings.footerMessage}</p>
                        )}
                        <p className="text-center font-bold text-[9px] text-gray-400 mt-2">
                            Emitido desde Facturador AI - Entorno de Pruebas
                        </p>
                    </div>
                </div>

                <div className="w-full md:w-[40%]">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>Total de Servicios Exentos:</span>
                            <span>0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total de Servicios Gravados:</span>
                            <span>0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total de Mercancías Exentas:</span>
                            <span>0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total de Mercancías Gravadas:</span>
                            <span>{invoice.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-300 pt-1">
                            <span>Total Exento:</span>
                            <span>0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Gravado:</span>
                            <span>{invoice.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                            <div className="flex justify-between">
                            <span>Total Exonerado:</span>
                            <span>0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Venta:</span>
                            <span>{invoice.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Descuento:</span>
                            <span>{invoice.items.reduce((acc, i) => acc + (i.price * i.quantity * (i.discount || 0)/100), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Venta Neta:</span>
                            <span>{invoice.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Impuesto IVA ({settings.taxRate}%):</span>
                            <span>{invoice.tax.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-gray-800 pt-1 font-bold text-sm mt-2">
                            <span>Total Comprobante ({symbol}):</span>
                            <span>{invoice.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InvoicePrint;
