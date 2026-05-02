import { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { GeneratedReport, ReportType } from '../../types';
import { History, CalendarDays, FileText, Search, Trash2 } from 'lucide-react';

export const ReportHistory = () => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<ReportType | ''>('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setReports(await db.getGeneratedReports());
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este reporte?')) {
      await db.deleteGeneratedReport(id);
      await fetchReports();
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesDate = filterDate ? report.dateGenerated.startsWith(filterDate) : true;
    const matchesType = filterType ? report.type === filterType : true;
    return matchesDate && matchesType;
  });

  const formatDate = (isoString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleDateString('es-ES', options);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <History className="text-primary" /> Historial de Reportes Generados
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Explora y gestiona los análisis de IA y reportes generados previamente.</p>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <input 
            type="date" 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as ReportType | '')}
            className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full"
          >
            <option value="">Todos los Tipos</option>
            <option value="kpi">Métricas KPI</option>
            <option value="overview">Reportes Generales</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredReports.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredReports.map(report => (
              <div key={report.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">{report.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Generado el: {formatDate(report.dateGenerated)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">Tipo: {report.type}</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  {/* Optionally add a 'View Report' button to open a modal or navigate to a detailed view */}
                  <button 
                    onClick={() => alert(`Contenido del reporte:\n\n${report.content}`)} // Simple alert for now
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors w-full"
                  >
                    <Search size={16} /> Ver Contenido
                  </button>
                  <button 
                    onClick={() => handleDelete(report.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors w-full"
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <History size={48} className="mx-auto mb-4 opacity-30" />
            <p>No se encontraron reportes generados.</p>
          </div>
        )}
      </div>
    </div>
  );
};
