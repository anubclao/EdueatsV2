import { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { CategoryDef } from '../../types';
import { Plus, Trash2, Pencil, Tags, ArrowUp, ArrowDown } from 'lucide-react';

export const Categories = () => {
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const initialForm: CategoryDef = { id: '', name: '', order: 0 };
  const [formData, setFormData] = useState<CategoryDef>(initialForm);
  const [isEditing, setIsEditing] = useState(false);

  const fetchCategories = () => {
    setCategories(db.getCategories());
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 1;
    setFormData({ id: '', name: '', order: nextOrder });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (cat: CategoryDef) => {
    setFormData(cat);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro? Eliminar una categoría podría afectar recetas existentes.')) {
      db.deleteCategory(id);
      fetchCategories();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (isEditing) {
      db.updateCategory(formData);
    } else {
      // Auto-generate ID from name if not provided (simple slugify)
      const newId = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const newCat = { ...formData, id: newId || crypto.randomUUID().slice(0, 8) };
      db.addCategory(newCat);
    }
    
    setIsModalOpen(false);
    fetchCategories();
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newCategories.length) {
      // Swap orders values for persistence
      const tempOrder = newCategories[index].order;
      newCategories[index].order = newCategories[targetIndex].order;
      newCategories[targetIndex].order = tempOrder;

      // Update both in DB
      db.updateCategory(newCategories[index]);
      db.updateCategory(newCategories[targetIndex]);
      
      fetchCategories();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Tags className="text-primary" /> Gestión de Categorías
        </h2>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Nueva Categoría
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 w-24 text-center">Orden</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">ID Interno</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {categories.map((cat, index) => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => moveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-primary disabled:opacity-30"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <span className="font-mono w-6 text-center">{cat.order}</span>
                    <button 
                      onClick={() => moveOrder(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-1 text-gray-400 hover:text-primary disabled:opacity-30"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{cat.name}</td>
                <td className="px-6 py-4 font-mono text-gray-500 text-xs">{cat.id}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(cat)} className="p-1 text-gray-400 hover:text-blue-500">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-xl font-bold dark:text-white">
              {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input 
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Orden (Prioridad)</label>
                <input 
                  type="number"
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.order} 
                  onChange={e => setFormData({...formData, order: Number(e.target.value)})} 
                />
              </div>

              {!isEditing && (
                <div className="text-xs text-gray-500">
                  El ID se generará automáticamente basado en el nombre (ej: &quot;Plato Fuerte&quot; -&gt; &quot;plato-fuerte&quot;).
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};