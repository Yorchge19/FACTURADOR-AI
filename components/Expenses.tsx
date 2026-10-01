import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, Trash2, Search, DollarSign, Calendar, Tag, Briefcase, Receipt } from 'lucide-react';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, onAddExpense, onDeleteExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialFormState: Partial<Expense> = {
    date: new Date().toISOString().split('T')[0],
    provider: '',
    category: 'Inventario',
    description: '',
    amount: 0,
    currency: 'CRC',
    reference: ''
  };

  const [formData, setFormData] = useState<Partial<Expense>>(initialFormState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense = {
      id: crypto.randomUUID(),
      ...formData
    } as Expense;
    
    onAddExpense(newExpense);
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const filteredExpenses = expenses.filter(e => 
    e.provider.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const categoryColors: Record<string, string> = {
    'Inventario': 'bg-gray-100 dark:bg-gray-800 text-black border-gray-200 dark:border-gray-700',
    'Servicios': 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300',
    'Salarios': 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700',
    'Alquiler': 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300',
    'Impuestos': 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white',
    'Otros': 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Control de Gastos</h2>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 text-sm md:text-base">Registro de compras, pagos y egresos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 border border-black dark:border-white"
        >
          <Plus size={20} /> Registrar Gasto
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-1">Total Gastos (Mostrados)</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">₡ {totalExpenses.toLocaleString()}</h3>
         </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
         <div className="relative w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400" size={18} />
           <input 
              type="text" 
              placeholder="Buscar por proveedor o descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none bg-gray-50 dark:bg-gray-800"
           />
         </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Receipt size={48} className="mb-2 opacity-20" />
            No hay gastos registrados.
          </div>
        ) : (
          filteredExpenses.map(expense => (
            <div key={expense.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide mb-1 ${categoryColors[expense.category] || categoryColors['Otros']}`}>
                       {expense.category}
                     </span>
                     <h4 className="font-bold text-gray-900 dark:text-white">{expense.provider}</h4>
                  </div>
                  <div className="text-right">
                     <div className="font-bold text-gray-900 dark:text-white text-lg">
                       {expense.currency === 'USD' ? '$' : '₡'} {expense.amount.toLocaleString()}
                     </div>
                     <div className="text-[10px] text-gray-400 dark:text-gray-400">{new Date(expense.date).toLocaleDateString()}</div>
                  </div>
               </div>
               <div className="flex justify-between items-end pt-2 border-t border-gray-50 mt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 max-w-[70%] truncate">
                    {expense.description || 'Sin descripción'}
                    {expense.reference && <span className="block text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">Ref: {expense.reference}</span>}
                  </div>
                  <button 
                    onClick={() => onDeleteExpense(expense.id)} 
                    className="p-2 text-gray-500 dark:text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg active:scale-95 hover:text-black"
                  >
                    <Trash2 size={18} />
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Fecha / Ref</th>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-400">
                     <div className="flex flex-col items-center">
                       <Receipt size={48} className="mb-2 opacity-20" />
                       No hay gastos registrados.
                     </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{new Date(expense.date).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{expense.reference || 'Sin Ref.'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{expense.provider}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate max-w-[200px]">{expense.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryColors[expense.category] || categoryColors['Otros']}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                       {expense.currency === 'USD' ? '$' : '₡'} {expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onDeleteExpense(expense.id)} 
                        className="p-2 text-gray-400 dark:text-gray-400 hover:text-black hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4 transition-opacity">
           <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up md:animate-scale-in">
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                 <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Registrar Nuevo Gasto</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-400"><Trash2 className="rotate-45" size={24}/></button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Calendar size={14}/> Fecha</label>
                       <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black focus:border-black bg-white dark:bg-gray-900" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Tag size={14}/> Referencia</label>
                       <input type="text" placeholder="# Factura" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Briefcase size={14}/> Proveedor</label>
                    <input required type="text" placeholder="Nombre del proveedor" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categoría</label>
                       <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black focus:border-black bg-white dark:bg-gray-900">
                          <option value="Inventario">Inventario</option>
                          <option value="Servicios">Servicios</option>
                          <option value="Salarios">Salarios</option>
                          <option value="Alquiler">Alquiler</option>
                          <option value="Impuestos">Impuestos</option>
                          <option value="Otros">Otros</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"><DollarSign size={14}/> Monto</label>
                       <div className="relative">
                          <select 
                             className="absolute left-0 top-0 bottom-0 w-16 pl-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 rounded-l-xl text-xs font-bold outline-none"
                             value={formData.currency}
                             onChange={e => setFormData({...formData, currency: e.target.value})}
                          >
                             <option value="CRC">CRC</option>
                             <option value="USD">USD</option>
                          </select>
                          <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full pl-20 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white font-bold dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Descripción Detallada</label>
                    <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:border-white resize-none dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" />
                 </div>

                 <div className="pt-4 flex justify-end gap-3 pb- safe-bottom">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-xl w-full md:w-auto">Cancelar</button>
                    <button type="submit" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-medium shadow-lg shadow-gray-200 w-full md:w-auto border border-black dark:border-white">Guardar Gasto</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;