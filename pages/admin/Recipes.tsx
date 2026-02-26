import { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { Recipe, CategoryDef } from '../../types';
import { Plus, Trash2, Search, Pencil, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';

export const Recipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Recipe>>({
    name: '',
    description: '',
    category: '', // Empty initially
    calories: 0,
    imageUrl: ''
  });

  const fetchData = () => {
    setRecipes(db.getRecipes());
    setCategories(db.getCategories());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      category: categories.length > 0 ? categories[0].id : '', // Default to first available
      calories: 0,
      imageUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData(recipe);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;

    const recipeData: Recipe = {
        id: formData.id || crypto.randomUUID(),
        name: formData.name!,
        description: formData.description || '',
        category: formData.category!,
        calories: Number(formData.calories) || 0,
        imageUrl: formData.imageUrl
    };

    if (formData.id) {
      db.updateRecipe(recipeData);
    } else {
      db.addRecipe(recipeData);
    }
    
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta receta?')) {
      db.deleteRecipe(id);
      fetchData();
    }
  };

  // Helper to get category Name
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    getCategoryName(r.category).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Recetas</h2>
        <button 
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Añadir Receta
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar recetas..." 
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.id} className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all overflow-hidden flex flex-col">
            
            {/* Image Preview */}
            <div className="h-32 w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <ImageIcon size={48} />
                    </div>
                )}
                <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 rounded-md text-xs font-bold uppercase bg-white/90 text-gray-800 shadow-sm backdrop-blur-sm">
                        {getCategoryName(recipe.category)}
                    </span>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                   <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1" title={recipe.name}>{recipe.name}</h3>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2 flex-1">{recipe.description}</p>
                
                <div className="flex items-center justify-between mt-4 border-t border-gray-50 dark:border-gray-700 pt-3">
                    <div className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {recipe.calories} kcal
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => handleEdit(recipe)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDelete(recipe.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold dark:text-white">
              {formData.id ? 'Editar Receta' : 'Nueva Receta'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Image URL Input - STRICTLY URL ONLY */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL de la Imagen (Enlace Directo)</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="url"
                            placeholder="https://images.unsplash.com/..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={formData.imageUrl || ''}
                            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                        />
                    </div>
                    {formData.imageUrl && (
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, imageUrl: ''})}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Limpiar URL"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-400">Pega el enlace directo a una imagen (jpg, png, webp). No se admiten subidas de archivos.</p>

                {/* Preview */}
                <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex items-center justify-center relative">
                    {formData.imageUrl ? (
                        <img 
                            src={formData.imageUrl} 
                            alt="Vista previa" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = ''; 
                                (e.target as HTMLImageElement).style.display = 'none'; 
                            }}
                        />
                    ) : (
                         <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
                            <ImageIcon size={32} />
                            <span className="text-xs">Vista previa de URL</span>
                        </div>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input 
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                  <select 
                    className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.category || ''}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calorías</label>
                  <input 
                    type="number"
                    className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.calories ?? 0}
                    onChange={e => setFormData({...formData, calories: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                <textarea 
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600">
                  {formData.id ? 'Actualizar Receta' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};