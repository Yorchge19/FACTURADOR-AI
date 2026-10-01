
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  cost?: number;
  currency: string;
  stock: number;
  category: string;
  type?: 'producto' | 'servicio';
  taxRate?: number;
}

export interface Customer {
  id: string;
  name: string;
  commercialName?: string;
  email: string;
  identificationType: string;
  taxId: string;
  taxRegime?: string;
  economicActivity?: string;
  country: string;
  province: string;
  canton: string;
  district: string;
  zipCode?: string;
  address: string;
  phone: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cost?: number;
  discount?: number;
  description?: string;
  total: number;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  number: string;
  consecutive?: string;
  electronicKey?: string;
  haciendaStatus?: 'aceptado' | 'rechazado' | 'procesando' | 'error' | 'no_enviado' | 'anulado';
  customerId: string;
  customerName: string;
  date: string;
  time?: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'cancelled';
  paymentMethod?: string;
  saleCondition?: string;
  balance?: number;
  payments?: Payment[];
  notes?: string;
  reference?: string;
  currency: string;
  exchangeRate?: number;
}

export interface Expense {
  id: string;
  date: string;
  provider: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  reference?: string;
}

export interface HaciendaConfig {
  username?: string;
  password?: string;
  pin?: string;
  certificateUploaded?: boolean;
  environment: 'staging' | 'production';
}

export interface LensGama {
  id: string;
  label: string;
  order: number;
  description: string;
  benefits: string[];
  adaptationTime?: string;
  linkedProductId?: string;
}

export interface AppSettings {
  companyName: string;
  commercialName?: string;
  companyTaxId: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  footerMessage?: string;
  currency: string;
  exchangeRate: number;
  taxRate: number;
  address: string;
  province?: string;
  canton?: string;
  district?: string;
  hacienda?: HaciendaConfig;
  lensGamas?: LensGama[];
  monthlyGoalTarget?: number; // meta mensual de ventas (ingresos) en moneda principal
}

// ── Multi-org & Permissions ────────────────────────────────────────────────

export type Permission =
  | 'view_dashboard'
  | 'manage_inventory'
  | 'manage_customers'
  | 'create_invoices'
  | 'view_invoices'
  | 'manage_expenses'
  | 'view_reports'
  | 'view_cierre'
  | 'manage_settings'
  | 'manage_users'
  | 'manage_quotes'
  | 'use_lens_simulation'
  | 'manage_lab_orders'
  | 'manage_goals';

export const ALL_PERMISSIONS: Permission[] = [
  'view_dashboard',
  'manage_inventory',
  'manage_customers',
  'create_invoices',
  'view_invoices',
  'manage_expenses',
  'view_reports',
  'view_cierre',
  'manage_settings',
  'manage_users',
  'manage_quotes',
  'use_lens_simulation',
  'manage_lab_orders',
  'manage_goals',
];

export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
  view_dashboard:    { label: 'Ver Panel Principal',     description: 'Acceso al resumen de ventas y estadísticas.' },
  manage_inventory:  { label: 'Gestionar Inventario',    description: 'Ver, agregar, editar y eliminar productos.' },
  manage_customers:  { label: 'Gestionar Clientes',      description: 'Ver, agregar y editar clientes.' },
  create_invoices:   { label: 'Crear Facturas',          description: 'Emitir nuevas facturas y recibos.' },
  view_invoices:     { label: 'Ver Facturas',            description: 'Consultar el historial de facturas.' },
  manage_expenses:   { label: 'Gestionar Gastos',        description: 'Ver, registrar y eliminar gastos.' },
  view_reports:      { label: 'Ver Reportes',            description: 'Acceso a los reportes financieros.' },
  view_cierre:       { label: 'Cierre de Caja',          description: 'Generar y ver cierres de caja.' },
  manage_settings:   { label: 'Configuración',           description: 'Modificar la configuración de la empresa.' },
  manage_users:      { label: 'Gestionar Usuarios',      description: 'Agregar usuarios y administrar permisos.' },
  manage_quotes:     { label: 'Gestionar Cotizaciones',  description: 'Crear, ver y convertir cotizaciones en facturas.' },
  use_lens_simulation: { label: 'Simulación de Lentes',  description: 'Acceder a la simulación visual de gamas de lentes progresivos.' },
  manage_lab_orders:   { label: 'Gestionar Laboratorio', description: 'Crear órdenes de laboratorio/taller y darles seguimiento.' },
  manage_goals:        { label: 'Gestionar Metas',       description: 'Registrar montos diarios y dar seguimiento a la meta mensual de ventas.' },
};

export type MemberRole = 'owner' | 'user';

export interface OrgMember {
  uid: string;
  email: string;
  displayName: string;
  role: MemberRole;
  permissions: Permission[];
  addedAt: string; // ISO string
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string | null;
  createdAt: string;
}

export interface InviteCode {
  code: string;
  orgId: string;
  orgName: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

// ── Cotizaciones ───────────────────────────────────────────────────────────

export type QuoteItem = InvoiceItem;

export interface Quote {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  globalDiscount?: number;
  globalDiscountAmount?: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  notes?: string;
  currency: string;
  exchangeRate?: number;
  createdBy?: string;
  convertedInvoiceId?: string;
}

// ── Metas de venta y registro diario ─────────────────────────────────────────

export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  note?: string;
  createdBy?: string;
}

// ── Órdenes de laboratorio / taller ──────────────────────────────────────────

export type LabOrderItem = InvoiceItem;

export interface LabOrder {
  id: string;
  number: string; // consecutivo propio, ej. LAB-0001
  date: string;
  expectedDate?: string; // fecha prometida de entrega
  customerId: string;
  customerName: string;
  quoteId?: string; // origen opcional: cotización
  quoteNumber?: string;
  invoiceId?: string; // origen opcional: factura
  invoiceNumber?: string;
  items: LabOrderItem[];
  labProvider: string; // laboratorio externo o "Taller propio"
  lensType?: string; // ej. Progresivo Premium, Bifocal, Monofocal
  frameDetail?: string; // armazón: marca/modelo/color
  measurements?: string; // DIP, altura, etc. (texto libre)
  status: 'pending' | 'sent' | 'received' | 'delivered' | 'cancelled';
  notes?: string;
  currency: string;
  createdBy?: string;
}

// ── Tomas de Inventario (auditoría física) ───────────────────────────────────

export interface InventoryCountItem {
  productId: string;
  sku: string;
  productName: string;
  countedQty: number;
  systemStock: number;
}

export interface InventoryAudit {
  id: string;
  date: string; // ISO string
  userId?: string;
  userName?: string;
  items: InventoryCountItem[];
  matched: InventoryCountItem[];
  missing: (InventoryCountItem & { diff: number })[];
  extra: (InventoryCountItem & { diff: number })[];
}
