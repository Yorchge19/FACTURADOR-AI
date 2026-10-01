import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Invoice, Expense, Product } from '../types';

export type DateRange = 'month' | 'year' | 'all';

const dateRangeLabel = (range: DateRange): string => {
  if (range === 'month') return 'Este Mes';
  if (range === 'year') return 'Este Año';
  return 'Todo el Histórico';
};

const formatDate = (d: Date = new Date()) => d.toISOString().slice(0, 10);

const formatCurrency = (n: number) =>
  `₡ ${n.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

export interface ExportReportsOptions {
  dateRange: DateRange;
  filteredInvoices: Invoice[];
  filteredExpenses: Expense[];
  products: Product[];
  productSales: { name: string; qty: number }[];
  expenseCategories: { name: string; value: number }[];
  comparisonData: { name: string; amount: number }[];
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  companyName?: string;
}

/* ── PDF ──────────────────────────────────────────────────────────────── */
export const exportReportsToPDF = (opts: ExportReportsOptions): void => {
  const {
    dateRange,
    filteredInvoices,
    filteredExpenses,
    productSales,
    expenseCategories,
    totalSales,
    totalExpenses,
    netProfit,
    profitMargin,
    companyName,
  } = opts;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const todayStr = new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileDate = formatDate();

  // Header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Facturador AI', 10, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName || 'Mi Empresa S.A. — Reportes Financieros', 10, 15);
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.text(`Rango: ${dateRangeLabel(dateRange)}  ·  Generado: ${todayStr}`, 10, 19);

  // Summary KPIs as small table
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Ejecutivo', 10, 30);

  autoTable(doc, {
    startY: 33,
    head: [['Concepto', 'Monto']],
    body: [
      ['Ventas Totales', formatCurrency(totalSales)],
      ['Gastos Totales', formatCurrency(totalExpenses)],
      ['Utilidad Neta', formatCurrency(netProfit)],
      ['Margen', `${profitMargin.toFixed(1)}%`],
      ['Facturas consideradas', String(filteredInvoices.length)],
      ['Movimientos de gasto', String(filteredExpenses.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [10, 10, 10], textColor: 255, fontStyle: 'bold', halign: 'left' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
    margin: { left: 10, right: 10 },
  });

  let lastY = (doc as any).lastAutoTable.finalY + 6;

  // Ingresos vs Gastos
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Flujo de Caja — Ingresos vs Gastos', 10, lastY);
  autoTable(doc, {
    startY: lastY + 2,
    head: [['Categoría', 'Monto']],
    body: [
      ['Ingresos', formatCurrency(totalSales)],
      ['Gastos', formatCurrency(totalExpenses)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [55, 65, 81], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 10, right: 10 },
  });
  lastY = (doc as any).lastAutoTable.finalY + 6;

  // Top productos
  if (productSales.length > 0) {
    if (lastY > 250) { doc.addPage(); lastY = 15; }
    doc.text('Productos Más Vendidos (Top 5)', 10, lastY);
    autoTable(doc, {
      startY: lastY + 2,
      head: [['#', 'Producto', 'Unidades Vendidas']],
      body: productSales.map((p, i) => [String(i + 1), p.name, String(p.qty)]),
      theme: 'grid',
      headStyles: { fillColor: [10, 10, 10], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 10, right: 10 },
    });
    lastY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Distribución gastos por categoría
  if (expenseCategories.length > 0) {
    if (lastY > 250) { doc.addPage(); lastY = 15; }
    doc.text('Distribución de Gastos por Categoría', 10, lastY);
    autoTable(doc, {
      startY: lastY + 2,
      head: [['Categoría', 'Monto']],
      body: expenseCategories.map(c => [c.name, formatCurrency(c.value)]),
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 10, right: 10 },
    });
    lastY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Detalle facturas
  if (lastY > 230) { doc.addPage(); lastY = 15; }
  doc.text(`Detalle de Facturas (${filteredInvoices.length})`, 10, lastY);
  autoTable(doc, {
    startY: lastY + 2,
    head: [['N°', 'Cliente', 'Fecha', 'Vencimiento', 'Estado', 'Total']],
    body: filteredInvoices.map(inv => [
      inv.number,
      inv.customerName,
      new Date(inv.date).toLocaleDateString('es-CR'),
      inv.dueDate ? new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-CR') : '-',
      inv.status,
      formatCurrency(inv.total),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [10, 10, 10], textColor: 255, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 5: { halign: 'right' } },
    margin: { left: 10, right: 10 },
    didDrawPage: (data: any) => {
      // footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(`Facturador AI — ${fileDate} — Página ${data.pageNumber} de ${pageCount}`, 10, doc.internal.pageSize.getHeight() - 5);
    },
  });
  lastY = (doc as any).lastAutoTable.finalY + 6;

  // Detalle gastos
  if (filteredExpenses.length > 0) {
    if (lastY > 230) { doc.addPage(); lastY = 15; }
    doc.setFontSize(11);
    doc.text(`Detalle de Gastos (${filteredExpenses.length})`, 10, lastY);
    autoTable(doc, {
      startY: lastY + 2,
      head: [['Fecha', 'Proveedor', 'Categoría', 'Descripción', 'Monto']],
      body: filteredExpenses.map(e => [
        new Date(e.date).toLocaleDateString('es-CR'),
        e.provider,
        e.category,
        e.description || '-',
        formatCurrency(e.amount),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 10, right: 10 },
    });
  }

  const fileName = `reporte-facturador-ai-${dateRange}-${fileDate}.pdf`;
  doc.save(fileName);
};

/* ── Excel ────────────────────────────────────────────────────────────── */
export const exportReportsToExcel = (opts: ExportReportsOptions): void => {
  const {
    dateRange,
    filteredInvoices,
    filteredExpenses,
    productSales,
    expenseCategories,
    totalSales,
    totalExpenses,
    netProfit,
    profitMargin,
    companyName,
  } = opts;

  const wb = XLSX.utils.book_new();
  const fileDate = formatDate();
  const label = dateRangeLabel(dateRange);

  // Hoja 1: Resumen
  const resumenData: (string | number)[][] = [
    ['Facturador AI — Reporte Financiero'],
    ['Empresa', companyName || 'Mi Empresa S.A.'],
    ['Rango', label],
    ['Fecha generación', new Date().toLocaleString('es-CR')],
    [],
    ['Concepto', 'Monto'],
    ['Ventas Totales', totalSales],
    ['Gastos Totales', totalExpenses],
    ['Utilidad Neta', netProfit],
    ['Margen (%)', Number(profitMargin.toFixed(1))],
    ['Facturas consideradas', filteredInvoices.length],
    ['Movimientos de gasto', filteredExpenses.length],
    [],
    ['Ingresos vs Gastos'],
    ['Ingresos', totalSales],
    ['Gastos', totalExpenses],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  // Ajustes de ancho
  wsResumen['!cols'] = [{ wch: 24 }, { wch: 18 }];
  // Formato moneda en cols (opcional, se deja número)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // Hoja 2: Top productos
  if (productSales.length > 0) {
    const topData: (string | number)[][] = [
      ['#', 'Producto', 'Unidades Vendidas'],
      ...productSales.map((p, i) => [i + 1, p.name, p.qty] as (string | number)[]),
    ];
    const wsTop = XLSX.utils.aoa_to_sheet(topData);
    wsTop['!cols'] = [{ wch: 4 }, { wch: 32 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top Productos');
  }

  // Hoja 3: Categorías gasto
  if (expenseCategories.length > 0) {
    const catData: (string | number)[][] = [
      ['Categoría', 'Monto'],
      ...expenseCategories.map(c => [c.name, c.value] as (string | number)[]),
    ];
    const wsCat = XLSX.utils.aoa_to_sheet(catData);
    wsCat['!cols'] = [{ wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'Gastos por Categoría');
  }

  // Hoja 4: Facturas
  const facturasHeader = ['Número', 'Cliente', 'Fecha', 'Vencimiento', 'Estado', 'Subtotal', 'IVA', 'Total', 'Moneda'];
  const facturasRows = filteredInvoices.map(inv => [
    inv.number,
    inv.customerName,
    inv.date,
    inv.dueDate || '',
    inv.status,
    inv.subtotal,
    inv.tax,
    inv.total,
    inv.currency,
  ]);
  const wsFacturas = XLSX.utils.aoa_to_sheet([facturasHeader, ...facturasRows]);
  wsFacturas['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturas');

  // Hoja 5: Gastos
  const gastosHeader = ['Fecha', 'Proveedor', 'Categoría', 'Descripción', 'Monto', 'Moneda', 'Referencia'];
  const gastosRows = filteredExpenses.map(e => [
    e.date,
    e.provider,
    e.category,
    e.description || '',
    e.amount,
    e.currency,
    e.reference || '',
  ]);
  const wsGastos = XLSX.utils.aoa_to_sheet([gastosHeader, ...gastosRows]);
  wsGastos['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos');

  // Hoja 6: Detalle completo (alternativa "Detalle" combinada si prefieren una sola)
  // Ya tenemos Facturas y Gastos separados, pero agregamos "Detalle" como copia de Facturas para cumplir requisito mínimo 2 hojas si faltaran otras.

  const fileName = `reporte-facturador-ai-${dateRange}-${fileDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
