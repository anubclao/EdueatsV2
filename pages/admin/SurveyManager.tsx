import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { SurveyResult, SurveyDefinition } from '../../types';
import { MessageSquare, Plus, Calendar, Star, MessageCircle, CheckCircle, Reply, ToggleLeft, ToggleRight, Trash2, Phone, AlertTriangle } from 'lucide-react';

export const SurveyManager = () => {
  const [activeTab, setActiveTab] = useState<'definitions' | 'results' | 'pqr'>('definitions');
  
  // Definitions State
  const [definitions, setDefinitions] = useState<SurveyDefinition[]>([]);
  const [newDefData, setNewDefData] = useState<Partial<SurveyDefinition>>({
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Results State
  const [selectedDefId, setSelectedDefId] = useState<string>('all');
  const [surveys, setSurveys] = useState<SurveyResult[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // PQR State
  const [pqrList, setPqrList] = useState<SurveyResult[]>([]);
  const [pqrReplyingTo, setPqrReplyingTo] = useState<string | null>(null);
  const [pqrReplyText, setPqrReplyText] = useState('');
  const [pqrFilter, setPqrFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    loadData();
  }, [selectedDefId, activeTab]);

  const loadData = async () => {
    const defs = await db.getSurveyDefinitions();
    setDefinitions(defs);

    if (activeTab === 'results' || activeTab === 'definitions') {
      const results = await db.getSurveys(selectedDefId === 'all' ? undefined : selectedDefId);
      setSurveys(results);
    }

    if (activeTab === 'pqr') {
      // Load all complaints and claims across all periods
      const complaints = await db.getSurveys(undefined);
      const pqrs = complaints.filter(s => s.type === 'complaint' || s.type === 'claim');
      setPqrList(pqrs);
    }
  };

  // --- Definition Handlers ---
  const handleCreateDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefData.title || !newDefData.startDate || !newDefData.endDate) return;
    if (newDefData.endDate < newDefData.startDate!) {
      setSaveError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const newDef: SurveyDefinition = {
        id: crypto.randomUUID(),
        title: newDefData.title,
        startDate: newDefData.startDate,
        endDate: newDefData.endDate,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await db.createSurveyDefinition(newDef);
      setNewDefData({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
      setIsCreating(false);
      await loadData();
    } catch (err) {
      setSaveError((err as Error).message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (def: SurveyDefinition) => {
    await db.updateSurveyDefinition({ ...def, isActive: !def.isActive });
    await loadData();
  };

  const deleteDefinition = async (id: string) => {
    if (confirm("Â¿EstÃ¡s seguro? Se eliminarÃ¡n todas las respuestas asociadas a esta encuesta.")) {
        await db.deleteSurveyDefinition(id);
        await loadData();
    }
  };

  // --- Response Handlers ---
  const handleReplySubmit = async (surveyId: string) => {
    if (!replyText.trim()) return;
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      const updated = { ...survey, adminResponse: replyText, status: 'resolved' as const };
      await db.updateSurvey(updated);
      setReplyingTo(null);
      setReplyText('');
      await loadData();
    }
  };

  const handlePqrReplySubmit = async (pqrId: string) => {
    if (!pqrReplyText.trim()) return;
    const pqr = pqrList.find(p => p.id === pqrId);
    if (pqr) {
      const updated = { ...pqr, adminResponse: pqrReplyText, status: 'resolved' as const };
      await db.updateSurvey(updated);
      setPqrReplyingTo(null);
      setPqrReplyText('');
      await loadData();
    }
  };

  const getWhatsAppLink = (phone: string, userName: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hola ${userName}, somos del equipo de EduEats. Nos comunicamos en relaciÃ³n a tu PQR registrada. Â¿CÃ³mo podemos ayudarte?`);
    return `https://wa.me/${clean}?text=${msg}`;
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

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      suggestion: 'Sugerencia', complaint: 'Queja', claim: 'Reclamo', congratulation: 'FelicitaciÃ³n'
    };
    return map[type] || type;
  };

  const filteredPqr = pqrList.filter(p => pqrFilter === 'all' ? true : p.status === pqrFilter);
  const pendingPqrCount = pqrList.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-primary" /> Encuestas de SatisfacciÃ³n
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gestiona los periodos de encuestas (4 al aÃ±o) y revisa las respuestas.
          </p>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
           <button 
             onClick={() => setActiveTab('definitions')}
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'definitions' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500'}`}
           >
             Gestión de Periodos
           </button>
           <button 
             onClick={() => setActiveTab('results')}
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'results' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500'}`}
           >
             Resultados
           </button>
           <button 
             onClick={() => setActiveTab('pqr')}
             className={`relative px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'pqr' ? 'bg-white dark:bg-gray-600 shadow text-orange-600' : 'text-gray-500'}`}
           >
             PQR
             {pendingPqrCount > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                 {pendingPqrCount > 9 ? '9+' : pendingPqrCount}
               </span>
             )}
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
                   onClick={() => {
                     setNewDefData({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
                     setSaveError('');
                     setIsSaving(false);
                     setIsCreating(true);
                   }}
                   disabled={isCreating}
                   className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                 >
                   <Plus size={16} /> Crear Periodo
                 </button>
              </div>

              {isCreating && (
                <form onSubmit={handleCreateDefinition} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-600 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">TÃ­tulo de la Encuesta</label>
                            <input 
                              type="text" 
                              placeholder="Ej: Encuesta Bimestre 1" 
                              className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={newDefData.title}
                              onChange={e => setNewDefData({...newDefData, title: e.target.value})}
                              required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {saveError && <p className="text-xs text-red-500 font-medium self-center mr-auto">{saveError}</p>}
                        <button type="button" onClick={() => { setIsCreating(false); setSaveError(''); }} className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60 min-w-[80px]">
                          {isSaving ? 'Guardandoâ€¦' : 'Guardar'}
                        </button>
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
            <h3 className="font-bold text-lg dark:text-white mb-4">MÃ©tricas Clave</h3>
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
                            {getTypeLabel(survey.type)}
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

      {/* --- TAB: PQR --- */}
      {activeTab === 'pqr' && (
        <>
          {/* PQR Header + Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 uppercase">Total PQR</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{pqrList.length}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
              <p className="text-xs font-bold text-orange-600 uppercase">Pendientes</p>
              <p className="text-2xl font-black text-orange-600">{pqrList.filter(p => p.status === 'pending').length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
              <p className="text-xs font-bold text-green-600 uppercase">Resueltas</p>
              <p className="text-2xl font-black text-green-600">{pqrList.filter(p => p.status === 'resolved').length}</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            {(['all', 'pending', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setPqrFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pqrFilter === f ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 shadow' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
              >
                {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Resueltas'}
              </button>
            ))}
          </div>

          {/* PQR List */}
          <div className="space-y-4">
            {filteredPqr.length > 0 ? filteredPqr.map(pqr => {
              const defTitle = definitions.find(d => d.id === pqr.surveyDefinitionId)?.title || 'General';
              const hasPhone = pqr.userPhone && pqr.userPhone.trim().length > 0;
              return (
                <div key={pqr.id} className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 ${pqr.type === 'claim' ? 'border-red-400' : 'border-orange-400'} border-t border-r border-b border-gray-100 dark:border-gray-700`}>
                  
                  {/* Top Row */}
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getTypeColor(pqr.type)}`}>
                        {pqr.type === 'claim' ? 'âš  Reclamo' : 'ðŸ“¢ Queja'}
                      </span>
                      <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                        {defTitle}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(pqr.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {pqr.status === 'resolved' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                        <CheckCircle size={13} /> Resuelta
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                        <AlertTriangle size={13} /> Pendiente
                      </span>
                    )}
                  </div>

                  {/* User Info Row */}
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{pqr.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{pqr.userRole}</p>
                      {hasPhone && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                          <Phone size={11} /> {pqr.userPhone}
                        </p>
                      )}
                    </div>
                    {/* WhatsApp Button */}
                    {hasPhone ? (
                      <a
                        href={getWhatsAppLink(pqr.userPhone!, pqr.userName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Responder por WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic flex items-center gap-1">
                        <Phone size={12} /> Sin telÃ©fono registrado
                      </span>
                    )}
                  </div>

                  {/* Comment */}
                  {pqr.comment && (
                    <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-gray-700 dark:text-gray-200 text-sm italic border-l-4 border-orange-300 dark:border-orange-700">
                      &quot;{pqr.comment}&quot;
                    </div>
                  )}

                  {/* Admin Response */}
                  {pqr.adminResponse && (
                    <div className="mb-2 ml-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
                        <Reply size={12} /> Nota interna del admin:
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{pqr.adminResponse}</p>
                    </div>
                  )}

                  {/* Reply Form */}
                  {!pqr.adminResponse && pqrReplyingTo !== pqr.id && (
                    <button
                      onClick={() => { setPqrReplyingTo(pqr.id); setPqrReplyText(''); }}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                    >
                      <MessageCircle size={16} /> Agregar nota interna
                    </button>
                  )}

                  {pqrReplyingTo === pqr.id && (
                    <div className="mt-3 animate-in slide-in-from-top-2">
                      <textarea
                        className="w-full border rounded-lg p-3 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={3}
                        placeholder="Agrega una nota de seguimiento para esta PQR..."
                        value={pqrReplyText}
                        onChange={e => setPqrReplyText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setPqrReplyingTo(null); setPqrReplyText(''); }}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handlePqrReplySubmit(pqr.id)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Guardar Nota
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            }) : (
              <div className="text-center py-16 text-gray-400">
                <AlertTriangle size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">No hay PQRs {pqrFilter !== 'all' ? `con estado "${pqrFilter === 'pending' ? 'pendiente' : 'resuelta'}"` : 'registradas'}.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
