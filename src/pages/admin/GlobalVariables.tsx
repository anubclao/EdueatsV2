import { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { GlobalVariable } from '../../types';
import { Plus, Edit, Save, XCircle, Loader2 } from 'lucide-react';

export const GlobalVariables = () => {
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editName, setEditName] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  useEffect(() => {
    fetchVariables();
  }, []);

  const fetchVariables = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedVariables = await dbService.getGlobalVariables();
      setVariables(fetchedVariables);
    } catch (err) {
      console.error("Error fetching global variables:", err);
      setError("Failed to fetch global variables.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (variable: GlobalVariable) => {
    setEditingId(variable.id);
    setEditName(variable.name);
    setEditValue(variable.value);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await dbService.setGlobalVariable({ id, name: editName, value: editValue });
      setEditingId(null);
      fetchVariables();
    } catch (err) {
      console.error("Error saving variable:", err);
      alert("Failed to save variable.");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditValue('');
  };

  const handleAddVariable = async () => {
    if (!newVarName || !newVarValue) {
      alert('Name and Value cannot be empty.');
      return;
    }
    try {
      await dbService.setGlobalVariable({ id: newVarName.toLowerCase().replace(/\s/g, '-'), name: newVarName, value: newVarValue });
      setNewVarName('');
      setNewVarValue('');
      fetchVariables();
    } catch (err) {
      console.error("Error adding variable:", err);
      alert("Failed to add variable.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-700">Loading global variables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchVariables} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-md max-w-full mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Global Variables</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Variable</h2>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <input
            type="text"
            placeholder="Variable Name (e.g., Min Order Amount)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Variable Value (e.g., 10.00)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newVarValue}
            onChange={(e) => setNewVarValue(e.target.value)}
          />
          <button
            onClick={handleAddVariable}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-5 w-5 mr-2" /> Add Variable
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Existing Variables</h2>
        <ul className="space-y-4">
          {variables.length === 0 && <li className="text-gray-500">No global variables found.</li>}
          {variables.map(variable => (
            <li key={variable.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-4 rounded-md shadow-sm">
              {editingId === variable.id ? (
                <div className="flex-1 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex-1 w-full">
                  <p className="font-medium text-gray-700">{variable.name} (<span className="text-sm text-gray-500">{variable.id}</span>)</p>
                  <p className="text-gray-600">Value: <span className="font-mono bg-gray-200 px-1 rounded text-sm">{variable.value}</span></p>
                </div>
              )}
              <div className="flex space-x-2 mt-4 sm:mt-0 sm:ml-4">
                {editingId === variable.id ? (
                  <>
                    <button onClick={() => handleSaveEdit(variable.id)} className="p-2 rounded-full text-green-600 hover:bg-green-100"><Save className="h-5 w-5" /></button>
                    <button onClick={handleCancelEdit} className="p-2 rounded-full text-red-600 hover:bg-red-100"><XCircle className="h-5 w-5" /></button>
                  </>
                ) : (
                  <button onClick={() => handleEditClick(variable)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100"><Edit className="h-5 w-5" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
