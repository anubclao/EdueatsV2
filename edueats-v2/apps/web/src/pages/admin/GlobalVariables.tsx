import { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { GlobalVariable } from '../../types';
import { Plus, Trash2, Pencil, Settings, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export const GlobalVariables = () => {
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<GlobalVariable>({ id: '', name: '', value: '' });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' } | null>(null);

  const fetchVariables = async () => {
    setVariables(await db.getGlobalVariables());
  };

  useEffect(() => {
    fetchVariables();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({ id: '', name: '', value: '' });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (variable: GlobalVariable) => {
    setFormData(variable);
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta variable global?')) {
      const res = await db.deleteGlobalVariable(id);
      if (res.success) {
        setMessage({ text: 'Variable eliminada satisfactoriamente.', type: 'success' });
        await fetchVariables();
      } else {
        setMessage({ text: res.message || 'Error al eliminar la variable.', type: 'error' });
      }
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.id || !formData.name || !formData.value) {
      setMessage({ text: 'Todos los campos son obligatorios.', type: 'error' });
      return;
    }

    const exists = variables.find(v => v.id === formData.id);

    if (exists) {
      // Update existing
      const res = await db.updateGlobalVariable(formData);
      if (res.success) {
        setMessage({ text: 'Variable modificada satisfactoriamente.', type: 'success' });
      } else {
        setMessage({ text: 'Error al modificar la variable.', type: 'error' });
      }
    } else {
      // Add new
      const res = await db.addGlobalVariable(formData);
      if (res.success) {
        setMessage({ text: 'Variable creada satisfactoriamente.', type: 'success' });
      } else {
        setMessage({ text: res.message || 'Error al crear la variable.', type: 'error' });
      }
    }

    await fetchVariables();
    setIsModalOpen(false);
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Settings className="text-primary" /> Variables Globales
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Administra las variables globales del sistema.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Nueva Variable</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* MESSAGE DISPLAY */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Valor</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {variables.length > 0 ? (
                variables.map((variable) => (
                  <tr key={variable.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {variable.id}
                        {variable.isSystem && (
                          <span title="Variable del sistema (no eliminable)">
                            <Info size={14} className="text-blue-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{variable.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{variable.value}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(variable)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                          <Pencil size={18} />
                        </button>
                        {!variable.isSystem && (
                          <button onClick={() => handleDelete(variable.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <Settings size={48} className="mx-auto mb-4 opacity-20" />
                    No se encontraron variables globales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Settings className="text-primary" />
              {formData.id && variables.find(v => v.id === formData.id) ? 'Editar Variable Global' : 'Nueva Variable Global'}
            </h3>
            {message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                <span>{message.text}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID (Identificador Único)</label>
                <input
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  disabled={!!formData.isSystem || (!!formData.id && !!variables.find(v => v.id === formData.id))}
                />
                {formData.isSystem && <p className="text-xs text-blue-500 mt-1">Este ID no se puede editar porque es una variable del sistema.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
                <input
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600">Guardar Variable</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
