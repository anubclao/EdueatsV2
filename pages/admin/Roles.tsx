import { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { RoleDef } from '../../types';
import { Plus, Trash2, Pencil, Shield, Lock, AlertCircle } from 'lucide-react';

export const Roles = () => {
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const initialForm: RoleDef = { id: '', name: '', description: '', isSystem: false };
  const [formData, setFormData] = useState<RoleDef>(initialForm);

  const fetchRoles = () => {
    setRoles(db.getRoles());
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenAdd = () => {
    setFormData({ id: '', name: '', description: '', isSystem: false });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (role: RoleDef) => {
    setFormData(role);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      const success = db.deleteRole(id);
      if (!success) {
        alert("No se pueden eliminar roles del sistema.");
      }
      fetchRoles();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (isEditing) {
      db.updateRole(formData);
    } else {
      // Generate ID from name if needed, or use random
      const newId = formData.id || formData.name.toLowerCase().replace(/\s+/g, '-');
      const newRole = { ...formData, id: newId };
      const success = db.addRole(newRole);
      if (!success) {
        alert("El ID del rol ya existe.");
        return;
      }
    }
    
    setIsModalOpen(false);
    fetchRoles();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Shield className="text-primary" /> Gestión de Roles
        </h2>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start">
             <div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.name}</h3>
                    {role.isSystem && (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide flex items-center gap-1">
                            <Lock size={10} /> Sistema
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{role.description || 'Sin descripción'}</p>
                <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-600 dark:text-gray-500">
                    ID: {role.id}
                </code>
             </div>
             
             <div className="flex gap-2">
                <button 
                    onClick={() => handleEdit(role)} 
                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <Pencil size={18} />
                </button>
                {!role.isSystem && (
                    <button 
                        onClick={() => handleDelete(role.id)} 
                        className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
             </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg flex gap-3 items-start border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <p>
          <strong>Nota:</strong> Los roles de sistema (Admin, Estudiante, Visitante) son necesarios para el funcionamiento core de la aplicación y no pueden ser eliminados, aunque sí puedes editar su nombre visual.
        </p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold dark:text-white">
              {isEditing ? 'Editar Rol' : 'Nuevo Rol'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Rol</label>
                <input 
                  required
                  placeholder="Ej: Profesor"
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Interno</label>
                <input 
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="Ej: profesor"
                  className={`w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={formData.id} 
                  onChange={e => setFormData({...formData, id: e.target.value.toLowerCase().replace(/\s/g,'-')})} 
                />
                {!isEditing && <p className="text-xs text-gray-400 mt-1">Identificador único (sin espacios).</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                <textarea 
                  rows={2}
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600">
                  Guardar Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};