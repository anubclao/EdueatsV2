import { useState, useEffect, FormEvent } from 'react';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { SurveyType, SurveyResult, SurveyDefinition } from '../../types';
import { Star, MessageSquare, Send, Smile, Lock, Calendar, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react';

export const SurveyForm = () => {
  const { user } = useAuth();
  
  // View State
  const [activeSurveys, setActiveSurveys] = useState<SurveyDefinition[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDefinition | null>(null);
  const [completedSurveys, setCompletedSurveys] = useState<string[]>([]); // IDs of completed surveys

  // Form State
  const [submitted, setSubmitted] = useState(false);
  const [qualityRating, setQualityRating] = useState(0);
  const [quantityRating, setQuantityRating] = useState(0);
  const [type, setType] = useState<SurveyType>('suggestion');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (user) {
        loadSurveys();
    }
  }, [user]);

  const loadSurveys = () => {
      const today = new Date().toISOString().split('T')[0];
      const allDefs = db.getSurveyDefinitions();
      
      // Filter Active and Within Date Range
      const active = allDefs.filter(d => d.isActive && today >= d.startDate && today <= d.endDate);
      setActiveSurveys(active);

      // Check which ones the user has already done
      const completed: string[] = [];
      active.forEach(def => {
          if (user && db.hasUserResponded(user.id, def.id)) {
              completed.push(def.id);
          }
      });
      setCompletedSurveys(completed);
  };

  const handleSelectSurvey = (def: SurveyDefinition) => {
      setSelectedSurvey(def);
      setSubmitted(false);
      setQualityRating(0);
      setQuantityRating(0);
      setComment('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSurvey) return;
    
    if (qualityRating === 0 || quantityRating === 0) {
      alert("Por favor califica ambos aspectos (Calidad y Cantidad).");
      return;
    }

    const newSurvey: SurveyResult = {
      id: crypto.randomUUID(),
      surveyDefinitionId: selectedSurvey.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      date: new Date().toISOString(),
      qualityRating,
      quantityRating,
      type,
      comment,
      status: 'pending'
    };

    const res = db.saveSurvey(newSurvey);
    if (res.success) {
        setSubmitted(true);
        loadSurveys(); // Refresh status
    } else {
        alert(res.message);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl w-full">
      <span className="font-bold text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-transform hover:scale-110 ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          >
            <Star size={32} />
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500">
        {value === 1 ? 'Muy Malo' : value === 5 ? 'Excelente' : value > 0 ? 'Regular' : 'Selecciona'}
      </span>
    </div>
  );

  // VIEW 1: SUCCESS MESSAGE
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4 animate-in zoom-in duration-300">
        <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6 text-green-600 dark:text-green-400">
          <Smile size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">¡Encuesta Enviada!</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Gracias por completar la encuesta &quot;{selectedSurvey?.title}&quot;. Tu opinión es muy importante.
        </p>
        <button 
            onClick={() => setSelectedSurvey(null)}
            className="mt-6 text-primary hover:underline font-bold"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  // VIEW 2: FORM FOR SELECTED SURVEY
  if (selectedSurvey) {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button 
                onClick={() => setSelectedSurvey(null)} 
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
                <ArrowLeft size={18} /> Volver a Encuestas
            </button>

            <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {selectedSurvey.title}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Disponible hasta: {selectedSurvey.endDate}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StarRating value={quantityRating} onChange={setQuantityRating} label="Cantidad" />
                <StarRating value={qualityRating} onChange={setQualityRating} label="Sabor y Calidad" />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de comentario</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                    { id: 'suggestion', label: 'Sugerencia', icon: '💡' },
                    { id: 'complaint', label: 'Queja', icon: '😕' },
                    { id: 'claim', label: 'Reclamo', icon: '⚠️' },
                    { id: 'congratulation', label: 'Felicitación', icon: '🎉' }
                    ].map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => setType(opt.id as SurveyType)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        type === opt.id 
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-200' 
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <span className="block text-xl mb-1">{opt.icon}</span>
                        {opt.label}
                    </button>
                    ))}
                </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Detalles <span className="text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <textarea 
                    rows={4}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Escribe aquí tus comentarios..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                </div>

                <button 
                type="submit"
                className="w-full bg-primary hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 text-lg"
                >
                <Send size={20} /> Enviar Encuesta
                </button>
            </form>
        </div>
      );
  }

  // VIEW 3: LIST OF SURVEYS
  return (
    <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center justify-center gap-2">
                <MessageSquare className="text-primary" /> Encuestas Disponibles
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
                Participa en las evaluaciones periódicas de la alimentación escolar.
            </p>
        </div>

        <div className="space-y-4">
            {activeSurveys.length > 0 ? activeSurveys.map(survey => {
                const isCompleted = completedSurveys.includes(survey.id);
                return (
                    <div 
                        key={survey.id}
                        onClick={() => !isCompleted && handleSelectSurvey(survey)}
                        className={`
                            relative overflow-hidden rounded-xl border p-6 flex justify-between items-center transition-all
                            ${isCompleted 
                                ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80 cursor-default' 
                                : 'bg-white dark:bg-gray-800 border-blue-100 dark:border-gray-600 hover:border-blue-300 hover:shadow-md cursor-pointer group'
                            }
                        `}
                    >
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{survey.title}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Calendar size={14} /> Cierra: {survey.endDate}
                            </p>
                        </div>
                        
                        <div>
                            {isCompleted ? (
                                <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm border border-green-200">
                                    <CheckCircle size={16} /> Completada
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-blue-600 font-bold group-hover:underline">
                                    Responder <ChevronRight size={18} />
                                </span>
                            )}
                        </div>
                    </div>
                )
            }) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <Lock size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">No hay encuestas activas</h3>
                    <p className="text-gray-400 mt-1">Por favor espera a que se habilite el próximo periodo de evaluación.</p>
                </div>
            )}
        </div>
    </div>
  );
};