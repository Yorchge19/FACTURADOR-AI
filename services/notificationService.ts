import { Product, Invoice } from '../types';

export const LOW_STOCK_THRESHOLD = 5;

export interface NotificationSummary {
  lowStock: Product[];
  overdue: Invoice[];
  pending: Invoice[];
  /** pending excluyendo las ya contadas como vencidas, para evitar doble conteo en badge */
  pendingNonOverdue: Invoice[];
  total: number;
}

const stripTime = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

export const getLowStockProducts = (products: Product[]): Product[] =>
  products.filter(p => typeof p.stock === 'number' && p.stock < LOW_STOCK_THRESHOLD);

export const getOverdueInvoices = (invoices: Invoice[]): Invoice[] => {
  const today = stripTime(new Date());
  return invoices.filter(inv => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return false;
    // Si no hay dueDate, intentar fallback a date + 30 días? Por ahora solo dueDate válido.
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate + 'T00:00:00');
    if (isNaN(due.getTime())) return false;
    return stripTime(due) < today;
  });
};

export const getPendingInvoices = (invoices: Invoice[]): Invoice[] =>
  invoices.filter(inv => {
    if (inv.status === 'cancelled') return false;
    if (inv.status === 'pending') return true;
    // fallback por saldo, por si status desincronizado
    if (inv.balance !== undefined && inv.balance > 0.01) return true;
    return false;
  });

export const getNotificationSummary = (products: Product[] = [], invoices: Invoice[] = []): NotificationSummary => {
  const lowStock = getLowStockProducts(products);
  const overdue = getOverdueInvoices(invoices);
  const pendingAll = getPendingInvoices(invoices);
  // Evitar doble conteo: pendientes que ya están en vencidas no suman de nuevo al total
  const overdueIds = new Set(overdue.map(i => i.id));
  const pendingNonOverdue = pendingAll.filter(i => !overdueIds.has(i.id));
  const total = lowStock.length + overdue.length + pendingNonOverdue.length;
  // Para UI, `pending` que mostramos es el total de pendientes (incluye vencidas) o solo no vencidas?
  // Devolvemos pendingAll como `pending` para que la sección "Pagos pendientes" muestre todo,
  // y `pendingNonOverdue` para cálculo de badge. Mantenemos `pending` = pendingNonOverdue para badge claro,
  // pero exponemos ambos si hace falta.
  return {
    lowStock,
    overdue,
    pending: pendingNonOverdue,
    pendingNonOverdue,
    total,
  };
};
