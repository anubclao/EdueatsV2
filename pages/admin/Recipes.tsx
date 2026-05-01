import { useState, useEffect, useRef, FormEvent } from 'react';
import { db } from '../../services/db';
import { Recipe, CategoryDef } from '../../types';
import { Plus, Trash2, Search, Pencil, Image as ImageIcon, X } from 'lucide-react';

export const Recipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Recipe>>({
    name: '',
    description: '',
    category: '', // Empty initially
    calories: 0,
    imageUrl: ''
  });

  const fetchData = async () => {
    setRecipes(await db.getRecipes());
    setCategories(await db.getCategories());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      category: categories.length > 0 ? categories[0].id : '',
      calories: 0,
      imageUrl: ''
    });
    setImagePreview('');
    setImageFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData(recipe);
    setImagePreview(recipe.imageUrl || '');
    setImageFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const [errors, setErrors] = useState<{ name?: string; category?: string; image?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!formData.name?.trim()) newErrors.name = 'El nombre es obligatorio.';
    if (!formData.category) newErrors.category = 'Selecciona una categoría.';
    if (!imageFile && !formData.imageUrl) newErrors.image = 'La imagen es obligatoria.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, image: undefined }));
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors(prev => ({ ...prev, image: 'La imagen es obligatoria.' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setUploading(true);
    let finalImageUrl = formData.imageUrl || '';

    try {
      if (imageFile) {
        const recipeId = formData.id || crypto.randomUUID();
        const fd = new FormData();
        fd.append('image', imageFile);
        fd.append('category', formData.category!);
        fd.append('recipeId', recipeId);
        const res = await fetch('/api/recipes/upload-image', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
        finalImageUrl = data.imageUrl;
      }

      const recipeData: Recipe = {
        id: formData.id || crypto.randomUUID(),
        name: formData.name!,
        description: formData.description || '',
        category: formData.category!,
        calories: Number(formData.calories) || 0,
        imageUrl: finalImageUrl || undefined,
      };

      if (formData.id) {
        await db.updateRecipe(recipeData);
      } else {
        await db.addRecipe(recipeData);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta receta?')) {
      await db.deleteRecipe(id);
      await fetchData();
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
              
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen de la Receta</label>

                {/* Preview / Drop zone */}
                <div
                  className={`w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border-2 border-dashed flex items-center justify-center relative cursor-pointer hover:border-primary transition-colors ${errors.image ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 pointer-events-none">
                      <ImageIcon size={36} />
                      <span className="text-xs text-center">Haz clic para seleccionar<br/>jpg · png · webp · gif (máx 5 MB)</span>
                    </div>
                  )}
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleClearImage(); }}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow"
                      title="Quitar imagen"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imageFile && (
                  <p className="text-xs text-gray-500 truncate">📎 {imageFile.name}</p>
                )}
                {errors.image && <p className="text-xs text-red-500 font-medium">{errors.image}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input 
                  className={`w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.name ? 'border-red-400' : ''}`}
                  value={formData.name || ''} 
                  onChange={e => { setFormData({...formData, name: e.target.value}); setErrors(prev => ({...prev, name: undefined})); }} 
                />
                {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                  <select 
                    className={`w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.category ? 'border-red-400' : ''}`}
                    value={formData.category || ''}
                    onChange={e => { setFormData({...formData, category: e.target.value}); setErrors(prev => ({...prev, category: undefined})); }}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-500 font-medium mt-1">{errors.category}</p>}
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
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-60">
                  {uploading ? 'Subiendo…' : formData.id ? 'Actualizar Receta' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};