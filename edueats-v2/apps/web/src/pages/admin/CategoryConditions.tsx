import { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { CategoryDef, CategoryRule } from '../../types';
import { Plus, Trash2, GitBranch, Lock, Eye } from 'lucide-react';

const EFFECT_LABELS: Record<CategoryRule['effect'], { label: string; desc: string; color: string }> = {
  blocks:   { label: 'Bloquea',          desc: 'El estudiante no podrá elegir de esta categoría',          color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  requires: { label: 'Solo aparece si',  desc: 'Esta categoría solo se muestra cuando el anterior es elegido', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
};

export const CategoryConditions = () => {
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [trigger, setTrigger] = useState('');
  const [effect, setEffect] = useState<CategoryRule['effect']>('blocks');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [cats, rs] = await Promise.all([db.getCategories(), db.getCategoryRules()]);
    setCategories(cats);
    setRules(rs);
    if (cats.length > 0) {
      setTrigger(prev => prev || cats[0].id);
      setTarget(prev => prev || (cats[1]?.id ?? cats[0].id));
    }
  };

  useEffect(() => { load(); }, []);

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (trigger === target) { setError('La categoría desencadenante y la afectada no pueden ser la misma.'); return; }
    setSaving(true);
    try {
      await db.addCategoryRule({ triggerCategoryId: trigger, effect, targetCategoryId: target });
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar la regla.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await db.deleteCategoryRule(id);
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <GitBranch className="text-primary" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Condiciones de Categorías</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define reglas que controlan qué categorías puede elegir el estudiante según sus selecciones previas.
          </p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-3 p-4 rounded-xl border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <Lock size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 dark:text-red-300 text-sm">Bloquea</p>
            <p className="text-xs text-red-600 dark:text-red-400">Al elegir la categoría A, la categoría B queda bloqueada y el paso se omite automáticamente.</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
          <Eye size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-700 dark:text-blue-300 text-sm">Solo aparece si</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">La categoría B está oculta por defecto; solo aparece en el flujo si el estudiante eligió de la categoría A.</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Plus size={18} className="text-primary" /> Nueva Condición
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Si el estudiante elige de:</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-full md:w-44">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">→ Efecto:</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={effect}
              onChange={e => setEffect(e.target.value as CategoryRule['effect'])}
            >
              <option value="blocks">Bloquea</option>
              <option value="requires">Solo aparece si</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Categoría afectada:</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={target}
              onChange={e => setTarget(e.target.value)}
            >
              {categories.filter(c => c.id !== trigger).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
          >
            <Plus size={16} /> Agregar Regla
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Tabla de reglas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white">Reglas Activas ({rules.length})</h3>
        </div>
        {rules.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay reglas configuradas. Agrega una condición arriba.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Si elige de</th>
                <th className="px-6 py-3">Efecto</th>
                <th className="px-6 py-3">Categoría afectada</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {rules.map(rule => {
                const eff = EFFECT_LABELS[rule.effect];
                return (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{catName(rule.triggerCategoryId)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${eff.color}`}>{eff.label}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{catName(rule.targetCategoryId)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
