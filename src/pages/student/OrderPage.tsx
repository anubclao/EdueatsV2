
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService } from '../../services/dbService';
import { supabase } from '../../services/supabaseClient';
import { DailyMenuConfig, Recipe, CategoryDef, OrderItem, User, _RecurringPreference } from '../../types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface SelectedMenuItem extends OrderItem {
  quantity: number;
}

export const OrderPage = () => {
  const { date } = useParams<{ date: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<DailyMenuConfig | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedMenuItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [saveAsPreference, setSaveAsPreference] = useState(false);

  useEffect(() => {
    fetchOrderData();
  }, [date]);

  const handleSubmitOrder = async () => {
    if (!currentUser || !menu || selectedItems.length === 0) {
      alert('Cannot submit an empty order or without user data.');
      return;
    }

    setLoading(true);
    try {
      const newOrderItems = selectedItems.map(item => ({
        category: item.category,
        recipeId: item.recipeId,
        quantity: item.quantity,
      }));

      const newOrder = {
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentGrade: currentUser.grade,
        studentSection: currentUser.section,
        studentAllergies: Array.isArray(currentUser.allergies) ? currentUser.allergies : (currentUser.allergies ? [currentUser.allergies] : []),
        date: date!,
        items: newOrderItems,
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      const createdOrder = await dbService.createOrder(newOrder);

      if (createdOrder && saveAsPreference) {
        const dayOfWeek = new Date(date!).getDay(); // 0 for Sunday, 1 for Monday, etc.
        const existingPreference = await dbService.getPreference(currentUser.id, dayOfWeek);

        const preferenceItems = selectedItems.map(item => ({
          category: item.category,
          recipeId: item.recipeId,
        }));

        if (existingPreference) {
          await dbService.updatePreference({
            studentId: currentUser.id,
            dayOfWeek: dayOfWeek,
            items: preferenceItems,
          });
        } else {
          await dbService.createPreference({
            studentId: currentUser.id,
            dayOfWeek: dayOfWeek,
            items: preferenceItems,
          });
        }
        alert('Order submitted and preferences saved!');
      } else if (createdOrder) {
        alert('Order submitted successfully!');
      }
      setShowConfirmationModal(false);
      // Optionally redirect or clear selection
      setSelectedItems([]);
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('Failed to submit order.');
    } finally {
      setLoading(false);
    }
  };


  const fetchOrderData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedMenu = await dbService.getDailyMenu(date!); // date is guaranteed by router
      setMenu(fetchedMenu);

      const fetchedRecipes = await dbService.getRecipes();
      setRecipes(fetchedRecipes);

      const fetchedCategories = await dbService.getCategories();
      setCategories(fetchedCategories);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const profile = await dbService.getUser(authUser.id);
        setCurrentUser(profile);
      }

    } catch (err) {
      console.error("Error fetching order data:", err);
      setError("Failed to load order data.");
    } finally {
      setLoading(false);
    }
  };

  const getRecipeName = (recipeId: string) => {
    return recipes.find(r => r.id === recipeId)?.name || 'Unknown Recipe';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown Category';
  };

  const handleQuantityChange = (recipeId: string, delta: number) => {
    setSelectedItems(prevItems => {
      const existingItem = prevItems.find(item => item.recipeId === recipeId);
      const menuItem = menu?.items?.find(item => item.recipeId === recipeId);
      const isMandatory = menuItem?.isMandatory || false;

      if (existingItem) {
        const newQuantity = Math.max(0, existingItem.quantity + delta);
        if (isMandatory && newQuantity < 1) {
          return prevItems.map(item =>
            item.recipeId === recipeId ? { ...item, quantity: 1 } : item
          );
        }
        return prevItems.map(item =>
          item.recipeId === recipeId ? { ...item, quantity: newQuantity } : item
        ).filter(item => item.quantity > 0);
      } else if (delta > 0) {
        const category = recipes.find(r => r.id === recipeId)?.category || '';
        return [...prevItems, { recipeId, category, quantity: delta }];
      }
      return prevItems;
    });
  };

  // Initialize selected items with mandatory items from the menu
  useEffect(() => {
    if (menu && recipes.length > 0 && categories.length > 0) {
      const initialSelected = menu.items
        ?.filter(item => item.isMandatory)
        .map(item => ({
          recipeId: item.recipeId,
          category: recipes.find(r => r.id === item.recipeId)?.category || '',
          quantity: 1,
        })) || [];
      setSelectedItems(initialSelected);
    }
  }, [menu, recipes, categories]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-700">Loading menu for {date}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchOrderData} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="text-center p-8 text-gray-600">
        <h1 className="text-3xl font-bold mb-4">No Menu Available</h1>
        <p>No menu has been configured for {format(new Date(date!), 'PPP')}.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Order for {format(new Date(date!), 'PPP')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {menu.items?.map(menuItem => {
          const recipe = recipes.find(r => r.id === menuItem.recipeId);
          if (!recipe) return null;



          return (
            <div key={menuItem.recipeId} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800">{getRecipeName(menuItem.recipeId)}</h2>
              <p className="text-sm text-gray-600">Category: {getCategoryName(recipe.category)}</p>
              <p className="text-sm text-gray-600 mb-2">Mandatory: {menuItem.isMandatory ? 'Yes' : 'No'}</p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleQuantityChange(menuItem.recipeId, -1)}
                  className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  -
                </button>
                <span className="w-8 text-center border border-gray-300 rounded-md py-1">
                  {selectedItems.find(item => item.recipeId === menuItem.recipeId)?.quantity || 0}
                </span>
                <button
                  onClick={() => handleQuantityChange(menuItem.recipeId, 1)}
                  className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={() => setShowConfirmationModal(true)}
          disabled={selectedItems.length === 0 || !currentUser}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Review Order ({selectedItems.reduce((sum, item) => sum + item.quantity, 0)} items)
        </button>
      </div>

      {showConfirmationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Your Order</h2>
            <div className="space-y-2 mb-4">
              {selectedItems.map(item => (
                <p key={item.recipeId} className="flex justify-between text-gray-700">
                  <span>{getRecipeName(item.recipeId)}</span>
                  <span>x{item.quantity}</span>
                </p>
              ))}
            </div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="savePreference"
                className="mr-2"
                checked={saveAsPreference}
                onChange={(e) => setSaveAsPreference(e.target.checked)}
              />
              <label htmlFor="savePreference" className="text-gray-700">Save as recurring preference</label>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOrder}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
