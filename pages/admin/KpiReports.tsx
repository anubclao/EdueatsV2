import { useState, useEffect, React } from 'react';
import { KpiReportData } from '../../types';
import { CalendarDays, BarChart, TrendingUp, Lightbulb, Loader2 } from 'lucide-react';
import { db } from '../../services/db';
import { GeneratedReport, ReportType } from '../../types';
import { geminiService } from '../../services/gemini';

export const KpiReports = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [kpiData, setKpiData] = useState<KpiReportData | null>(null);
  const [comparisonData, setComparisonData] = useState<KpiReportData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize dates to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);

    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    setCompareEndDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setCompareStartDate(sixtyDaysAgo.toISOString().split('T')[0]);

  }, []);

  const fetchKpiData = () => {
    // This is where you'd fetch/calculate your KPIs
    // For now, let's mock some data or use existing db methods
    setIsLoading(true);
    const allOrders = db.getOrders();
    const allUsers = db.getUsers();
    const allMenus = db.getAllMenus();

    // Filter orders for the main range
    const mainRangeOrders = allOrders.filter(order => order.date >= startDate && order.date <= endDate);
    const mainRangeConfirmedOrders = mainRangeOrders.filter(order => order.status === 'confirmed');
    const mainRangeUniqueUsers = new Set(mainRangeConfirmedOrders.map(order => order.studentId)).size;
    const mainRangeTotalOrders = mainRangeConfirmedOrders.length;
    const mainRangeOperatingDays = new Set(allMenus.filter(m => m.isPublished && m.date >= startDate && m.date <= endDate).map(m => m.date)).size;
    const mainRangeParticipationRate = mainRangeOperatingDays > 0 ? (mainRangeUniqueUsers / allUsers.length) * 100 : 0;

    setKpiData({
      totalOrders: mainRangeTotalOrders,
      uniqueUsers: mainRangeUniqueUsers,
      participationRate: mainRangeParticipationRate,
      operatingDays: mainRangeOperatingDays,
    });

    // Filter orders for the comparison range
    const compareRangeOrders = allOrders.filter(order => order.date >= compareStartDate && order.date <= compareEndDate);
    const compareRangeConfirmedOrders = compareRangeOrders.filter(order => order.status === 'confirmed');
    const compareRangeUniqueUsers = new Set(compareRangeConfirmedOrders.map(order => order.studentId)).size;
    const compareRangeTotalOrders = compareRangeConfirmedOrders.length;
    const compareRangeOperatingDays = new Set(allMenus.filter(m => m.isPublished && m.date >= compareStartDate && m.date <= compareEndDate).map(m => m.date)).size;
    const compareRangeParticipationRate = compareRangeOperatingDays > 0 ? (compareRangeUniqueUsers / allUsers.length) * 100 : 0;

    setComparisonData({
      totalOrders: compareRangeTotalOrders,
      uniqueUsers: compareRangeUniqueUsers,
      participationRate: compareRangeParticipationRate,
      operatingDays: compareRangeOperatingDays,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchKpiData();
    }
  }, [startDate, endDate, compareStartDate, compareEndDate]);

  const generateAiAnalysis = async () => {
    if (!kpiData || !comparisonData) return;

    setIsLoading(true);
    try {
      const prompt = `Analiza los siguientes datos de KPIs para dos períodos y proporciona predicciones y recomendaciones:

      Período Principal (${startDate} a ${endDate}):
      - Total de Pedidos Confirmados: ${kpiData.totalOrders}
      - Usuarios Únicos con Pedido: ${kpiData.uniqueUsers}
      - Tasa de Participación: ${kpiData.participationRate.toFixed(2)}%
      - Días Operativos: ${kpiData.operatingDays}

      Período de Comparación (${compareStartDate} a ${compareEndDate}):
      - Total de Pedidos Confirmados: ${comparisonData.totalOrders}
      - Usuarios Únicos con Pedido: ${comparisonData.uniqueUsers}
      - Tasa de Participación: ${comparisonData.participationRate.toFixed(2)}%
      - Días Operativos: ${comparisonData.operatingDays}

      Basado en esta información, ¿cuáles son las tendencias clave, qué predicciones puedes hacer sobre el futuro rendimiento y qué recomendaciones específicas darías para mejorar la participación y el total de pedidos?`;

      const response = await geminiService.getGenericTextResponse(prompt);
      setAiAnalysis(response);

      // Save the generated report to the database
      const reportId = `kpi-${Date.now()}`;
      const newReport: GeneratedReport = {
        id: reportId,
        type: 'kpi' as ReportType,
        dateGenerated: new Date().toISOString(),
        title: `Análisis KPI ${startDate} a ${endDate}`,
        content: response,
        filtersUsed: {
          startDate, endDate, compareStartDate, compareEndDate
        }
      };
      db.saveGeneratedReport(newReport);
    } catch (error) {
      console.error("Error fetching AI analysis:", error);
      setAiAnalysis("Error al generar el análisis de IA. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderKpiCard = (title: string, value: string | number, trend: number | null = null, unit: string = '') => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
        {unit && <span className="text-base text-gray-500 dark:text-gray-400 mb-1">{unit}</span>}
        {trend !== null && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );

  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0; // Handle division by zero
    return ((current - previous) / previous) * 100;
  };

  const totalOrdersTrend = kpiData && comparisonData ? calculateTrend(kpiData.totalOrders, comparisonData.totalOrders) : null;
  const participationRateTrend = kpiData && comparisonData ? calculateTrend(kpiData.participationRate, comparisonData.participationRate) : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <BarChart className="text-primary" /> Reportes y Métricas KPI
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Análisis de rendimiento, comparativas y predicciones.</p>

      {/* Date Range Selectors */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold text-sm">
          <CalendarDays size={18} className="text-primary" /> Período Principal:
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        <span className="text-gray-400">a</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold text-sm ml-auto">
          <CalendarDays size={18} className="text-blue-500" /> Período Comparativo:
        </div>
        <input type="date" value={compareStartDate} onChange={e => setCompareStartDate(e.target.value)} className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        <span className="text-gray-400">a</span>
        <input type="date" value={compareEndDate} onChange={e => setCompareEndDate(e.target.value)} className="border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
      </div>

      {/* KPIs Grid */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderKpiCard('Total Pedidos Confirmados', kpiData.totalOrders, totalOrdersTrend)}
          {renderKpiCard('Usuarios Únicos con Pedido', kpiData.uniqueUsers)}
          {renderKpiCard('Tasa de Participación', kpiData.participationRate.toFixed(1), participationRateTrend, '%')}
          {renderKpiCard('Días Operativos con Menú', kpiData.operatingDays)}
        </div>
      )}

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Lightbulb size={200} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Lightbulb size={24} className="text-yellow-300" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Análisis y Predicciones de IA</h3>
            </div>
            {!aiAnalysis && kpiData && comparisonData && (
              <button
                onClick={generateAiAnalysis}
                disabled={isLoading}
                className="bg-white text-purple-700 hover:bg-purple-50 px-6 py-2.5 rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
                {isLoading ? 'Generando Análisis...' : 'Generar Análisis IA'}
              </button>
            )}
          </div>

          {aiAnalysis ? (
            <p className="text-white/80 text-sm md:text-base leading-relaxed italic">
              {aiAnalysis}
            </p>
          ) : (
            <p className="text-white/70 text-sm">
              Selecciona los rangos de fechas y haz clic en &apos;Generar Análisis IA&apos; para obtener predicciones y recomendaciones basadas en tus métricas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper for TrendingDown icon (assuming it's not directly imported in lucide-react, or needs a local definition)
const TrendingDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
    <polyline points="16 17 22 17 22 11"></polyline>
  </svg>
);
