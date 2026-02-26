import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { SurveyResult, SurveyDefinition } from '../../types';
import { MessageSquare, Plus, Calendar, Star, MessageCircle, CheckCircle, Reply, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export const SurveyManager = () => {
  const [activeTab, setActiveTab] = useState<'definitions' | 'results'>('definitions');
  
  // Definitions State
  const [definitions, setDefinitions] = useState<SurveyDefinition[]>([]);
  const [newDefData, setNewDefData] = useState<Partial<SurveyDefinition>>({
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  // Results State
  const [selectedDefId, setSelectedDefId] = useState<string>('all');
  const [surveys, setSurveys] = useState<SurveyResult[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDefId, activeTab]);

  const loadData = () => {
    const defs = db.getSurveyDefinitions();
    setDefinitions(defs);
    
    const results = db.getSurveys(selectedDefId === 'all' ? undefined : selectedDefId);
    setSurveys(results);
  };

  // --- Definition Handlers ---
  const handleCreateDefinition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefData.title || !newDefData.startDate || !newDefData.endDate) return;

    const newDef: SurveyDefinition = {
      id: crypto.randomUUID(),
      title: newDefData.title,
      startDate: newDefData.startDate,
      endDate: newDefData.endDate,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    db.createSurveyDefinition(newDef);
    setNewDefData({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
    setIsCreating(false);
    loadData();
  };

  const toggleStatus = (def: SurveyDefinition) => {
    db.updateSurveyDefinition({ ...def, isActive: !def.isActive });
    loadData();
  };

  const deleteDefinition = (id: string) => {
    if (confirm("¿Estás seguro? Se eliminarán todas las respuestas asociadas a esta encuesta.")) {
        db.deleteSurveyDefinition(id);
        loadData();
    }
  };

  // --- Response Handlers ---
  const handleReplySubmit = (surveyId: string) => {
    if (!replyText.trim()) return;
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      const updated = { ...survey, adminResponse: replyText, status: 'resolved' as const };
      db.updateSurvey(updated);
      setReplyingTo(null);
      setReplyText('');
      loadData();
    }
  };

  // Stats
  const avgQuality = surveys.length ? (surveys.reduce((acc, curr) => acc + curr.qualityRating, 0) / surveys.length).toFixed(1) : '0';
  const avgQuantity = surveys.length ? (surveys.reduce((acc, curr) => acc + curr.quantityRating, 0) / surveys.length).toFixed(1) : '0';

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      suggestion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      complaint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      claim: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      congratulation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-primary" /> Encuestas de Satisfacción
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gestiona los periodos de encuestas (4 al año) y revisa las respuestas.
          </p>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
           <button 
             onClick={() => setActiveTab('definitions')}
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'definitions' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500'}`}
           >
             Gestión Periodos
           </button>
           <button 
             onClick={() => setActiveTab('results')}
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'results' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500'}`}
           >
             Resultados y PQR
           </button>
        </div>
      </div>

      {/* --- TAB: DEFINITIONS --- */}
      {activeTab === 'definitions' && (
        <div className="space-y-6">
           {/* Create New Card */}
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg dark:text-white">Periodos de Encuesta</h3>
                 <button 
                   onClick={() => setIsCreating(!isCreating)}
                   className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
                 >
                   <Plus size={16} /> Crear Periodo
                 </button>
              </div>

              {isCreating && (
                <form onSubmit={handleCreateDefinition} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-600 grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-top-2">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Título de la Encuesta</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Encuesta Bimestre 1" 
                          className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={newDefData.title}
                          onChange={e => setNewDefData({...newDefData, title: e.target.value})}
                          required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Inicio</label>
                        <input 
                          type="date" 
                          className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={newDefData.startDate}
                          onChange={e => setNewDefData({...newDefData, startDate: e.target.value})}
                          required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Fin</label>
                        <input 
                          type="date" 
                          className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={newDefData.endDate}
                          onChange={e => setNewDefData({...newDefData, endDate: e.target.value})}
                          required
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex-1">Guardar</button>
                        <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold">Cancelar</button>
                    </div>
                </form>
              )}

              <div className="space-y-3">
                  {definitions.length > 0 ? definitions.map(def => (
                      <div key={def.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="mb-2 md:mb-0">
                              <h4 className="font-bold text-gray-800 dark:text-white">{def.title}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <Calendar size={12} /> {def.startDate} - {def.endDate}
                              </p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className={`text-xs font-bold px-2 py-1 rounded ${def.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                  {def.isActive ? 'Activa' : 'Inactiva'}
                              </div>
                              <button onClick={() => toggleStatus(def)} className="text-gray-500 hover:text-primary" title="Cambiar Estado">
                                  {def.isActive ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
                              </button>
                              <button onClick={() => deleteDefinition(def.id)} className="text-gray-400 hover:text-red-500 p-1">
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>
                  )) : (
                      <p className="text-center text-gray-400 py-4">No hay periodos de encuesta definidos.</p>
                  )}
              </div>
           </div>
        </div>
      )}

      {/* --- TAB: RESULTS --- */}
      {activeTab === 'results' && (
        <>
            {/* Filter */}
            <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-bold text-gray-600 dark:text-gray-300">Filtrar por Periodo:</label>
                <select 
                    className="border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                    value={selectedDefId}
                    onChange={e => setSelectedDefId(e.target.value)}
                >
                    <option value="all">Todas las respuestas</option>
                    {definitions.map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                </select>
            </div>

            {/* Quick Stats */}
            <h3 className="font-bold text-lg dark:text-white mb-4">Métricas Clave</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase">Respuestas</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{surveys.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase">Prom. Calidad</p>
                <div className="flex items-center gap-1 text-2xl font-black text-yellow-500">
                    {avgQuality} <Star size={20} className="fill-yellow-500" />
                </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase">Prom. Cantidad</p>
                <div className="flex items-center gap-1 text-2xl font-black text-blue-500">
                    {avgQuantity} <Star size={20} className="fill-blue-500" />
                </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase">Pendientes</p>
                <p className="text-2xl font-black text-orange-500">{surveys.filter(s => s.status === 'pending').length}</p>
                </div>
            </div>

            {/* Survey List */}
            <div className="space-y-4">
                {surveys.length > 0 ? (
                surveys.map((survey) => {
                    const defTitle = definitions.find(d => d.id === survey.surveyDefinitionId)?.title || "General";
                    return (
                    <div key={survey.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getTypeColor(survey.type)}`}>
                            {survey.type}
                        </span>
                        <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                            {defTitle}
                        </span>
                        <span className="text-sm text-gray-400">
                            {new Date(survey.date).toLocaleDateString()}
                        </span>
                        </div>
                        {survey.status === 'resolved' ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                            <CheckCircle size={14} /> Respondido
                        </span>
                        ) : (
                        <span className="text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                            Pendiente
                        </span>
                        )}
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{survey.userName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-3">{survey.userRole}</p>
                        
                        <div className="flex gap-6 mb-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1">
                                <span>Calidad:</span>
                                <div className="flex text-yellow-400">
                                {[...Array(survey.qualityRating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>Cantidad:</span>
                                <div className="flex text-blue-400">
                                {[...Array(survey.quantityRating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                </div>
                            </div>
                        </div>

                        {survey.comment && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-gray-700 dark:text-gray-200 text-sm italic border-l-4 border-gray-300 dark:border-gray-600">
                            &quot;{survey.comment}&quot;
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Admin Response Section */}
                    {survey.adminResponse && (
                        <div className="mt-4 ml-8 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
                            <Reply size={12} /> Respuesta Administrativa:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{survey.adminResponse}</p>
                        </div>
                    )}

                    {!survey.adminResponse && replyingTo !== survey.id && (
                        <button 
                        onClick={() => setReplyingTo(survey.id)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                        >
                        <MessageCircle size={16} /> Responder
                        </button>
                    )}

                    {replyingTo === survey.id && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                        <textarea 
                            className="w-full border rounded-lg p-3 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows={3}
                            placeholder="Escribe una respuesta para el usuario..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded"
                            >
                            Cancelar
                            </button>
                            <button 
                            onClick={() => handleReplySubmit(survey.id)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                            Enviar Respuesta
                            </button>
                        </div>
                        </div>
                    )}

                    </div>
                )})
                ) : (
                <div className="text-center py-12 text-gray-400">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No se encontraron respuestas para este periodo.</p>
                </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};