
import { Product, Customer, Invoice, AppSettings, InvoiceItem, Expense, Payment, InventoryAudit } from '../types';
import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  increment,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { logger } from './logger';

// ── Collection helpers ────────────────────────────────────────────────────────
//
// All data now lives under organizations/{orgId}/... to support multi-tenancy.
// When Firebase is not initialized (demo mode) we fall through to localStorage.

const COLLECTIONS = {
  PRODUCTS:         'products',
  CUSTOMERS:        'customers',
  INVOICES:         'invoices',
  EXPENSES:         'expenses',
  SETTINGS:         'settings',
  INVENTORY_AUDITS: 'inventoryAudits',
};

/** Returns a Firestore collection reference scoped to the active organization */
const orgCol = (orgId: string, col: string) =>
  collection(db!, 'organizations', orgId, col);

/** Returns a Firestore document reference scoped to the active organization */
const orgDoc = (orgId: string, col: string, id: string) =>
  doc(db!, 'organizations', orgId, col, id);

// ── Default settings ──────────────────────────────────────────────────────────
const defaultSettings: AppSettings = {
  companyName: 'Mi Empresa S.A.',
  commercialName: 'Tecnología y Más',
  companyTaxId: '3-101-123456',
  companyEmail: 'facturacion@miempresa.com',
  companyPhone: '2222-0000',
  companyWebsite: 'www.miempresa.cr',
  footerMessage: 'Autorizado mediante resolución DGT-R-033-2019. Gracias por su preferencia.',
  currency: 'CRC',
  exchangeRate: 520,
  taxRate: 13,
  address: 'San José, Mata Redonda, Sabana Norte, Edificio Principal',
  province: 'San José',
  canton: 'San José',
  district: 'Mata Redonda',
  hacienda: { environment: 'staging' },
};

// ── LocalStorage helpers (Demo Mode) ─────────────────────────────────────────
const LS_PREFIX = 'fai_db_';
const ls = {
  get: <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(`${LS_PREFIX}${key}`) || '[]'); }
    catch { return []; }
  },
  set:    (key: string, data: any)  => localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(data)),
  add:    (key: string, item: any)  => {
    const items = ls.get<any>(key);
    const idx = items.findIndex((i: any) => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    ls.set(key, items);
  },
  update: (key: string, item: any)  => ls.add(key, item),
  delete: (key: string, id: string) => ls.set(key, ls.get<any>(key).filter((i: any) => i.id !== id)),
  getOne: <T>(key: string, id: string): T | undefined =>
    ls.get<any>(key).find((i: any) => i.id === id),
};

const snapshotToData = <T>(snapshot: any): T[] =>
  snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id })) as T[];

// ── Storage Service ───────────────────────────────────────────────────────────

export const StorageService = {

  // Products
  getProducts: async (orgId?: string): Promise<Product[]> => {
    if (!db || !orgId) return ls.get<Product>(COLLECTIONS.PRODUCTS);
    const snap = await getDocs(orgCol(orgId, COLLECTIONS.PRODUCTS));
    return snapshotToData<Product>(snap);
  },

  addProduct: async (product: Product, orgId?: string) => {
    if (!db || !orgId) return ls.add(COLLECTIONS.PRODUCTS, product);
    await setDoc(orgDoc(orgId, COLLECTIONS.PRODUCTS, product.id), product);
  },

  updateProduct: async (product: Product, orgId?: string) => {
    if (!db || !orgId) return ls.update(COLLECTIONS.PRODUCTS, product);
    await setDoc(orgDoc(orgId, COLLECTIONS.PRODUCTS, product.id), product, { merge: true });
  },

  deleteProduct: async (id: string, orgId?: string) => {
    if (!db || !orgId) return ls.delete(COLLECTIONS.PRODUCTS, id);
    await deleteDoc(orgDoc(orgId, COLLECTIONS.PRODUCTS, id));
  },

  // Customers
  getCustomers: async (orgId?: string): Promise<Customer[]> => {
    if (!db || !orgId) return ls.get<Customer>(COLLECTIONS.CUSTOMERS);
    const snap = await getDocs(orgCol(orgId, COLLECTIONS.CUSTOMERS));
    return snapshotToData<Customer>(snap);
  },

  addCustomer: async (customer: Customer, orgId?: string) => {
    if (!db || !orgId) return ls.add(COLLECTIONS.CUSTOMERS, customer);
    await setDoc(orgDoc(orgId, COLLECTIONS.CUSTOMERS, customer.id), customer);
  },

  updateCustomer: async (customer: Customer, orgId?: string) => {
    if (!db || !orgId) return ls.update(COLLECTIONS.CUSTOMERS, customer);
    await setDoc(orgDoc(orgId, COLLECTIONS.CUSTOMERS, customer.id), customer, { merge: true });
  },

  // Invoices
  getInvoices: async (orgId?: string): Promise<Invoice[]> => {
    if (!db || !orgId) {
      return ls.get<Invoice>(COLLECTIONS.INVOICES)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const snap = await getDocs(orgCol(orgId, COLLECTIONS.INVOICES));
    return snapshotToData<Invoice>(snap)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  createInvoice: async (
    invoice: Invoice,
    productsToUpdate: { id: string; newStock: number }[],
    automaticExpense?: Expense,
    orgId?: string,
  ) => {
    if (!db || !orgId) {
      ls.add(COLLECTIONS.INVOICES, invoice);
      const products = ls.get<Product>(COLLECTIONS.PRODUCTS);
      productsToUpdate.forEach(u => {
        const idx = products.findIndex(p => p.id === u.id);
        if (idx >= 0) products[idx].stock = u.newStock;
      });
      ls.set(COLLECTIONS.PRODUCTS, products);
      if (automaticExpense) ls.add(COLLECTIONS.EXPENSES, automaticExpense);
      return;
    }

    const firestore = db!;
    const batch = writeBatch(firestore);

    batch.set(doc(firestore, 'organizations', orgId, COLLECTIONS.INVOICES, invoice.id), invoice);
    productsToUpdate.forEach(p => {
      const ref = doc(firestore, 'organizations', orgId, COLLECTIONS.PRODUCTS, p.id);
      batch.update(ref, { stock: p.newStock });
    });
    if (automaticExpense) {
      batch.set(
        doc(firestore, 'organizations', orgId, COLLECTIONS.EXPENSES, automaticExpense.id),
        automaticExpense,
      );
    }
    await batch.commit();
  },

  addPayment: async (invoiceId: string, payment: Payment, orgId?: string) => {
    if (!db || !orgId) {
      const invoices = ls.get<Invoice>(COLLECTIONS.INVOICES);
      const idx = invoices.findIndex(i => i.id === invoiceId);
      if (idx >= 0) {
        const inv = invoices[idx];
        const newPayments = [...(inv.payments || []), payment];
        const currentBalance = inv.balance !== undefined && !isNaN(inv.balance) ? inv.balance : inv.total;
        const newBalance = Math.max(0, currentBalance - payment.amount);
        inv.payments = newPayments;
        inv.balance = newBalance;
        inv.status = newBalance <= 0.01 ? 'paid' : 'pending';
        if (inv.status === 'paid') inv.balance = 0;
        ls.set(COLLECTIONS.INVOICES, invoices);
      }
      return;
    }

    const invoiceRef = doc(db!, 'organizations', orgId, COLLECTIONS.INVOICES, invoiceId);
    try {
      await updateDoc(invoiceRef, {
        payments: arrayUnion(payment),
        balance: increment(-payment.amount),
      });
      const snap = await getDoc(invoiceRef);
      if (snap.exists()) {
        const data = snap.data() as Invoice;
        if ((data.balance || 0) <= 0.01) {
          await updateDoc(invoiceRef, { status: 'paid', balance: 0 });
        }
      }
    } catch (error) {
      logger.error('StorageService.addPayment', error);
      throw error;
    }
  },

  cancelInvoice: async (invoiceId: string, items: InvoiceItem[], orgId?: string) => {
    if (!db || !orgId) {
      const invoices = ls.get<Invoice>(COLLECTIONS.INVOICES);
      const idx = invoices.findIndex(i => i.id === invoiceId);
      if (idx >= 0) {
        invoices[idx].status = 'cancelled';
        invoices[idx].haciendaStatus = 'anulado';
        invoices[idx].balance = 0;
        ls.set(COLLECTIONS.INVOICES, invoices);
        const products = ls.get<Product>(COLLECTIONS.PRODUCTS);
        (items || []).forEach(item => {
          const pIdx = products.findIndex(p => p.id === item.productId);
          if (pIdx >= 0) products[pIdx].stock += item.quantity;
        });
        ls.set(COLLECTIONS.PRODUCTS, products);
      }
      return;
    }

    const firestore = db!;
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'organizations', orgId, COLLECTIONS.INVOICES, invoiceId), {
      status: 'cancelled',
      haciendaStatus: 'anulado',
      balance: 0,
    });
    (items || []).forEach(item => {
      if (item.productId) {
        const ref = doc(firestore, 'organizations', orgId, COLLECTIONS.PRODUCTS, item.productId);
        batch.set(ref, { stock: increment(item.quantity) }, { merge: true });
      }
    });
    await batch.commit();
  },

  // Expenses
  getExpenses: async (orgId?: string): Promise<Expense[]> => {
    if (!db || !orgId) {
      return ls.get<Expense>(COLLECTIONS.EXPENSES)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const snap = await getDocs(orgCol(orgId, COLLECTIONS.EXPENSES));
    return snapshotToData<Expense>(snap)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addExpense: async (expense: Expense, orgId?: string) => {
    if (!db || !orgId) return ls.add(COLLECTIONS.EXPENSES, expense);
    await setDoc(orgDoc(orgId, COLLECTIONS.EXPENSES, expense.id), expense);
  },

  deleteExpense: async (id: string, orgId?: string) => {
    if (!db || !orgId) return ls.delete(COLLECTIONS.EXPENSES, id);
    await deleteDoc(orgDoc(orgId, COLLECTIONS.EXPENSES, id));
  },

  // Settings
  getSettings: async (orgId?: string): Promise<AppSettings> => {
    if (!db || !orgId) {
      const saved = localStorage.getItem(`${LS_PREFIX}${COLLECTIONS.SETTINGS}`);
      if (saved) return JSON.parse(saved);
      return defaultSettings;
    }
    const ref = doc(db!, 'organizations', orgId, COLLECTIONS.SETTINGS, 'general');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as AppSettings;
      if (!data.hacienda) data.hacienda = defaultSettings.hacienda;
      return data;
    }
    return defaultSettings;
  },

  saveSettings: async (settings: AppSettings, orgId?: string) => {
    if (!db || !orgId) {
      localStorage.setItem(`${LS_PREFIX}${COLLECTIONS.SETTINGS}`, JSON.stringify(settings));
      return;
    }
    await setDoc(doc(db!, 'organizations', orgId, COLLECTIONS.SETTINGS, 'general'), settings);
  },

  // Inventory Audits
  getInventoryAudits: async (orgId?: string): Promise<InventoryAudit[]> => {
    if (!db || !orgId) {
      return ls.get<InventoryAudit>(COLLECTIONS.INVENTORY_AUDITS)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const snap = await getDocs(orgCol(orgId, COLLECTIONS.INVENTORY_AUDITS));
    return snapshotToData<InventoryAudit>(snap)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveInventoryAudit: async (audit: InventoryAudit, orgId?: string): Promise<void> => {
    if (!db || !orgId) return ls.add(COLLECTIONS.INVENTORY_AUDITS, audit);
    await setDoc(orgDoc(orgId, COLLECTIONS.INVENTORY_AUDITS, audit.id), audit);
  },

  // Seed demo data
  seedData: async (orgId?: string) => {
    const products = await StorageService.getProducts(orgId);
    if (products.length === 0) {
      const demoProducts: Product[] = [
        { id: '1', name: 'Laptop Pro X', description: 'Laptop de alto rendimiento', sku: 'LPX-001', price: 650000, cost: 450000, currency: 'CRC', stock: 10, category: 'Electrónica' },
        { id: '2', name: 'Monitor 27"', description: 'Monitor 4K UHD', sku: 'MON-002', price: 185000, cost: 120000, currency: 'CRC', stock: 25, category: 'Electrónica' },
        { id: '3', name: 'Silla Ergonómica', description: 'Silla de oficina premium', sku: 'CHR-003', price: 150, cost: 90, currency: 'USD', stock: 5, category: 'Muebles' },
      ];
      for (const p of demoProducts) await StorageService.addProduct(p, orgId);
    }

    const customers = await StorageService.getCustomers(orgId);
    if (customers.length === 0) {
      const demoCustomers: Customer[] = [
        {
          id: '1', name: 'Juan Pérez', commercialName: 'Juan Pérez',
          email: 'juan@example.com', taxId: '1-1111-1111', identificationType: '01 Cédula Física',
          taxRegime: 'Simplificado', country: 'Costa Rica', province: 'San José', canton: 'San José',
          district: 'Pavas', zipCode: '10109', address: 'De la Embajada Americana 200m Oeste', phone: '8888-8888',
        },
        {
          id: '2', name: 'Corporación ABC S.A.', commercialName: 'ABC Corp',
          email: 'facturacion@abccorp.com', taxId: '3-101-654321', identificationType: '02 Cédula Jurídica',
          taxRegime: 'Tradicional', country: 'Costa Rica', province: 'Heredia', canton: 'Belén',
          district: 'La Asunción', zipCode: '40701', address: 'Centro Corporativo El Cafetal, Edificio A', phone: '2299-9999',
        },
      ];
      for (const c of demoCustomers) await StorageService.addCustomer(c, orgId);
    }
  },
};
