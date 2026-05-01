import { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { User, DailyMenuConfig, Recipe, CategoryDef } from '../../types';
import { format, addDays } from 'date-fns';
import { Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [menus, setMenus] = useState<DailyMenuConfig[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await dbService.getUsers();
      setUsers(fetchedUsers);

      const fetchedMenus = await dbService.getDailyMenus();
      setMenus(fetchedMenus);

      const fetchedRecipes = await dbService.getRecipes();
      setRecipes(fetchedRecipes);

      const fetchedCategories = await dbService.getCategories();
      setCategories(fetchedCategories);

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestUser = async () => {
    try {
      const newUser: Partial<User> = {
        name: 'Test User',
        email: `testuser${Date.now()}@example.com`,
        role: 'student',
        emailVerified: true,
        grade: 5,
        section: 'A',
      };
      await dbService.createUser(newUser);
      alert('Test user added!');
      fetchData(); // Refresh data
    } catch (err) {
      console.error("Error adding test user:", err);
      alert("Failed to add test user.");
    }
  };

  const handlePlanTomorrowMenu = async () => {
    try {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const existingMenu = menus.find(m => m.date === tomorrow);

      if (existingMenu) {
        alert(`Menu for ${tomorrow} already exists!`);
        return;
      }

      // Ensure we have some recipes and categories to pick from
      if (recipes.length === 0 || categories.length === 0) {
        alert('Please add some recipes and categories first!');
        return;
      }

      // Simple menu planning: one recipe from each category
      const newMenuItems = categories.map(cat => {
        const recipe = recipes.find(r => r.category === cat.id);
        return {
          recipeId: recipe ? recipe.id : 'default-recipe-id',
          isMandatory: true,
        };
      }).filter(item => item.recipeId !== 'default-recipe-id');

      if (newMenuItems.length === 0) {
        alert('Could not plan menu: No suitable recipes found for categories.');
        return;
      }

      const newMenu: Partial<DailyMenuConfig> = {
        date: tomorrow,
        isPublished: true,
        items: newMenuItems,
      };

      await dbService.createDailyMenu(newMenu);
      alert(`Menu planned for ${tomorrow}!`);
      fetchData(); // Refresh data
    } catch (err) {
      console.error("Error planning menu:", err);
      alert("Failed to plan menu.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-700">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-md max-w-full mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Users ({users.length})</h2>
          <button
            onClick={handleAddTestUser}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-5 w-5 mr-2" /> Add Test User
          </button>
          <ul className="mt-4 space-y-2">
            {users.slice(0, 5).map(user => (
              <li key={user.id} className="flex items-center justify-between text-gray-700">
                <span>{user.name} ({user.role})</span>
                <span className="text-sm text-gray-500">{user.email}</span>
              </li>
            ))}
            {users.length > 5 && <li className="text-gray-500 text-sm">...and {users.length - 5} more</li>}
            {users.length === 0 && <li className="text-gray-500">No users found.</li>}
          </ul>
        </div>

        <div className="bg-green-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-green-800 mb-4">Daily Menus ({menus.length})</h2>
          <button
            onClick={handlePlanTomorrowMenu}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Plus className="h-5 w-5 mr-2" /> Plan Tomorrow&apos;s Menu
          </button>
          <ul className="mt-4 space-y-2">
            {menus.slice(0, 5).map(menu => (
              <li key={menu.date} className="flex items-center justify-between text-gray-700">
                <span>{format(new Date(menu.date), 'PPP')}</span>
                {menu.isPublished ? (
                  <CheckCircle className="h-5 w-5 text-green-500" aria-label="Published" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" aria-label="Not Published" />
                )}
              </li>
            ))}
            {menus.length > 5 && <li className="text-gray-500 text-sm">...and {menus.length - 5} more</li>}
            {menus.length === 0 && <li className="text-gray-500">No menus found.</li>}
          </ul>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">Recipes ({recipes.length})</h2>
          <p className="text-gray-600">Manage recipes here.</p>
          <ul className="mt-4 space-y-2">
            {recipes.slice(0, 5).map(recipe => (
              <li key={recipe.id} className="flex items-center justify-between text-gray-700">
                <span>{recipe.name}</span>
                <span className="text-sm text-gray-500">{categories.find(c => c.id === recipe.category)?.name || 'N/A'}</span>
              </li>
            ))}
            {recipes.length > 5 && <li className="text-gray-500 text-sm">...and {recipes.length - 5} more</li>}
            {recipes.length === 0 && <li className="text-gray-500">No recipes found.</li>}
          </ul>
        </div>
      </div>

      {/* Add more admin sections here */}
    </div>
  );
};
