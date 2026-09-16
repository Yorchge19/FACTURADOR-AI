
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Inventory from './Inventory';
import Customers from './Customers';
import InvoiceList from './InvoiceList';
import InvoiceForm from './InvoiceForm';
import ReceiptForm from './ReceiptForm';
import Settings from './Settings';
import Expenses from './Expenses';
import Reports from './Reports';
import CierreCaja from './CierreCaja';
import UserManagement from './UserManagement';
import InventoryCount from './InventoryCount';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { StorageService } from '../services/storageService';
import { Product, Customer, Invoice, AppSettings, Expense, Payment, Permission, InventoryAudit } from '../types';
import { Sparkles, Lock } from 'lucide-react';

/* ── Premium loading screen ──────────────────────────────────────────── */
const steps = [
  'Conectando con Firebase…',
  'Cargando productos…',
  'Obteniendo clientes…',
  'Sincronizando facturas…',
  'Preparando historial…',
];
const WorkspaceLoader: React.FC = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)' }}>
      <div className="relative mb-10">
        <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-white/20">
          <Sparkles size={36} className="text-black" />
        </div>
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white border-4 border-black animate-pulse" />
      </div>
      <h1 className="text-white font-bold text-2xl tracking-tight mb-1">Facturador AI</h1>
      <p className="text-gray-500 text-sm mb-10">Iniciando tu espacio de trabajo</p>
      <div className="flex items-end gap-1.5 mb-10 h-12">
        {[0.6, 1, 0.75, 1.1, 0.85, 0.5, 0.9].map((h, i) => (
          <div key={i} className="w-1.5 rounded-full bg-white opacity-80"
            style={{ height: `${h * 100}%`, animation: `barBounce 1.1s ${i * 0.1}s ease-in-out infinite alternate` }} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 text-sm transition-all duration-500 ${i <= step ? 'text-gray-300 opacity-100' : 'text-gray-700 opacity-40'}`}>
            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i < step ? 'bg-white' : i === step ? 'bg-white animate-pulse' : 'bg-gray-700'}`} />
            {s}
          </div>
        ))}
      </div>
      <style>{`@keyframes barBounce { from { transform: scaleY(0.4); opacity: 0.3; } to { transform: scaleY(1); opacity: 1; } }`}</style>
    </div>
  );
};

/* ── Permission guard ─────────────────────────────────────────────────── */
const PermGuard: React.FC<{ perm: Permission; children: React.ReactNode }> = ({ perm, children }) => {
  const { hasPermission } = useOrganization();
  if (!hasPermission(perm)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock size={28} className="text-gray-400" />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-700 text-lg">Acceso restringido</p>
          <p className="text-sm text-gray-400 mt-1">No tienes permiso para acceder a esta sección.<br />Contacta al administrador de tu organización.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

/* ── Workspace ────────────────────────────────────────────────────────── */
const Workspace: React.FC = () => {
  const { user } = useAuth();
  const { orgId, isOwner, loading: orgLoading } = useOrganization();
  const [loadingData, setLoadingData] = useState(true);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>([]);
  const [settings,  setSettings]  = useState<AppSettings>({
    companyName: '', companyTaxId: '', currency: '', taxRate: 0, address: '', exchangeRate: 520,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      // En modo demo sin orgId aún, permitimos carga desde localStorage (orgId undefined)
      // OrgRoute ya garantiza orgId en modo Firebase, pero no bloqueamos demo
      if (!orgId) {
        // Si no hay orgId y estamos cargando organización, esperar
        if (orgLoading) return;
        // En demo sin org, igual intentar cargar datos locales para no dejar pantalla vacía
      }
      try {
        setLoadingData(true);
        const effectiveOrgId = orgId ?? undefined;
        const [prodData, custData, invData, expData, settData, auditsData] = await Promise.all([
          StorageService.getProducts(effectiveOrgId).catch(() => [] as Product[]),
          StorageService.getCustomers(effectiveOrgId).catch(() => [] as Customer[]),
          StorageService.getInvoices(effectiveOrgId).catch(() => [] as Invoice[]),
          StorageService.getExpenses(effectiveOrgId).catch(() => [] as Expense[]),
          StorageService.getSettings(effectiveOrgId).catch(() => ({ companyName: '', companyTaxId: '', currency: 'CRC', taxRate: 13, address: '', exchangeRate: 520 } as AppSettings)),
          StorageService.getInventoryAudits(effectiveOrgId).catch(() => [] as InventoryAudit[]),
        ]);
        setProducts(prodData);
        setCustomers(custData);
        setInvoices(invData);
        setExpenses(expData);
        setSettings(settData);
        setInventoryAudits(auditsData);
        // Si no hay productos y estamos en modo demo/localStorage, sembrar datos de ejemplo
        if (prodData.length === 0) {
          try {
            await StorageService.seedData(effectiveOrgId);
            const seeded = await StorageService.getProducts(effectiveOrgId).catch(() => [] as Product[]);
            if (seeded.length > 0) setProducts(seeded);
          } catch {}
        }
      } catch (error) {
        console.error('Error loading workspace data', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [user, orgId, orgLoading]);

  if (orgLoading || loadingData) return <WorkspaceLoader />;

  // ── Handlers (pass orgId to every StorageService call) ────────────────────
  const handleAddProduct = async (p: Product) => {
    setProducts(prev => [...prev, p]);
    await StorageService.addProduct(p, orgId ?? undefined);
  };
  const handleUpdateProduct = async (p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    await StorageService.updateProduct(p, orgId ?? undefined);
  };
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    await StorageService.deleteProduct(id, orgId ?? undefined);
  };
  const handleAddCustomer = async (c: Customer) => {
    setCustomers(prev => [...prev, c]);
    await StorageService.addCustomer(c, orgId ?? undefined);
  };

  const handleCreateInvoice = async (invoice: Invoice) => {
    const stockUpdates: { id: string; newStock: number }[] = [];
    const updatedProducts = products.map(p => {
      const item = invoice.items.find(i => i.productId === p.id);
      if (item) { const ns = p.stock - item.quantity; stockUpdates.push({ id: p.id, newStock: ns }); return { ...p, stock: ns }; }
      return p;
    });

    let totalCostAmount = 0;
    invoice.items.forEach(item => {
      const unitCost = item.cost ?? products.find(p => p.id === item.productId)?.cost ?? 0;
      totalCostAmount += unitCost * item.quantity;
    });

    let automaticExpense: Expense | undefined;
    if (totalCostAmount > 0) {
      automaticExpense = {
        id: crypto.randomUUID(), date: invoice.date,
        provider: 'Inventario Interno', category: 'Costo de Ventas',
        description: `Costo de mercadería vendida - Fac #${invoice.number}`,
        amount: totalCostAmount, currency: invoice.currency, reference: invoice.number,
      };
    }

    setInvoices(prev => [invoice, ...prev]);
    setProducts(updatedProducts);
    if (automaticExpense) setExpenses(prev => [automaticExpense!, ...prev]);

    await StorageService.createInvoice(invoice, stockUpdates, automaticExpense, orgId ?? undefined);
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`ADVERTENCIA: Va a anular la factura #${invoice.number}.\n\n¿Está seguro?`)) return;
    try {
      await StorageService.cancelInvoice(invoice.id, invoice.items, orgId ?? undefined);
      setInvoices(prev => prev.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'cancelled', haciendaStatus: 'anulado' } : inv,
      ));
      const stockMap = new Map<string, number>();
      invoice.items.forEach(item => stockMap.set(item.productId, (stockMap.get(item.productId) ?? 0) + item.quantity));
      setProducts(prev => prev.map(p => stockMap.has(p.id) ? { ...p, stock: p.stock + (stockMap.get(p.id) ?? 0) } : p));
      alert('Factura anulada correctamente.');
    } catch (error) { alert('Error al anular la factura.'); }
  };

  const handleAddPayment = async (invoiceId: string, payment: Payment) => {
    await StorageService.addPayment(invoiceId, payment, orgId ?? undefined);
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;
      const newPayments = [...(inv.payments ?? []), payment];
      const currentBalance = inv.balance !== undefined && !isNaN(inv.balance) ? inv.balance : inv.total;
      const newBalance = Math.max(0, currentBalance - payment.amount);
      return { ...inv, payments: newPayments, balance: newBalance, status: newBalance <= 0.01 ? 'paid' : 'pending' };
    }));
  };

  const handleAddExpense = async (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    await StorageService.addExpense(expense, orgId ?? undefined);
  };
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
    await StorageService.deleteExpense(id, orgId ?? undefined);
  };
  const handleSaveInventoryAudit = async (audit: InventoryAudit) => {
    setInventoryAudits(prev => [audit, ...prev]);
    await StorageService.saveInventoryAudit(audit, orgId ?? undefined);
  };
  const handleSaveSettings = async (s: AppSettings) => {
    setSettings(s);
    await StorageService.saveSettings(s, orgId ?? undefined);
  };
  const handleUpdateStock = (_productId: string, _qty: number) => {};

  return (
    <Layout>
      <Routes>
        <Route path="/" element={
          <PermGuard perm="view_dashboard">
            <Dashboard invoices={invoices} products={products} />
          </PermGuard>
        } />
        <Route path="/inventory" element={
          <PermGuard perm="manage_inventory">
            <Inventory products={products} onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />
          </PermGuard>
        } />
        <Route path="/inventory-count" element={
          <PermGuard perm="manage_inventory">
            <InventoryCount products={products} audits={inventoryAudits} onSaveAudit={handleSaveInventoryAudit} />
          </PermGuard>
        } />
        <Route path="/customers" element={
          <PermGuard perm="manage_customers">
            <Customers customers={customers} onAddCustomer={handleAddCustomer} />
          </PermGuard>
        } />
        <Route path="/invoices" element={
          <PermGuard perm="view_invoices">
            <InvoiceList invoices={invoices} onCancelInvoice={handleCancelInvoice} onAddPayment={handleAddPayment} />
          </PermGuard>
        } />
        <Route path="/create-invoice" element={
          <PermGuard perm="create_invoices">
            <InvoiceForm products={products} customers={customers} settings={settings}
              onCreateInvoice={handleCreateInvoice} onUpdateStock={handleUpdateStock} />
          </PermGuard>
        } />
        <Route path="/create-receipt" element={
          <PermGuard perm="create_invoices">
            <ReceiptForm invoices={invoices} onAddPayment={handleAddPayment} />
          </PermGuard>
        } />
        <Route path="/expenses" element={
          <PermGuard perm="manage_expenses">
            <Expenses expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} />
          </PermGuard>
        } />
        <Route path="/reports" element={
          <PermGuard perm="view_reports">
            <Reports invoices={invoices} expenses={expenses} products={products} />
          </PermGuard>
        } />
        <Route path="/cierre" element={
          <PermGuard perm="view_cierre">
            <CierreCaja invoices={invoices} />
          </PermGuard>
        } />
        <Route path="/settings" element={
          <PermGuard perm="manage_settings">
            <Settings settings={settings} onSaveSettings={handleSaveSettings} />
          </PermGuard>
        } />
        {/* Owner-only user management panel */}
        {isOwner && (
          <Route path="/users" element={<UserManagement />} />
        )}
      </Routes>
    </Layout>
  );
};

export default Workspace;
