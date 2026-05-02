import { useState, useEffect } from 'react';
import { GeneratedReport, KpiReportData } from '../../types';
import { CalendarDays, BarChart, TrendingUp, TrendingDown, Save } from 'lucide-react';
import { db } from '../../services/db';



export const KpiReports = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [kpiData, setKpiData] = useState<KpiReportData | null>(null);
  const [comparisonData, setComparisonData] = useState<KpiReportData | null>(null);
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

  const fetchKpiData = async () => {
    // This is where you'd fetch/calculate your KPIs
    // For now, let's mock some data or use existing db methods
    setIsLoading(true);
    const [allOrders, allUsers, allMenus] = await Promise.all([
      db.getOrders(),
      db.getUsers(),
      db.getAllMenus(),
    ]);

    // Filter orders for the main range
    const mainRangeOrders = allOrders.filter(order => order.date >= startDate && order.date <= endDate);
    const mainRangeConfirmedOrders = mainRangeOrders.filter(order => order.status === 'confirmed');
    const mainRangeUniqueUsers = new Set(mainRangeConfirmedOrders.map(order => order.studentId)).size;
    const mainRangeTotalOrders = mainRangeConfirmedOrders.length;
    const mainRangeOperatingDays = new Set(allMenus.filter(m => m.isPublished && m.date >= startDate && m.date <= endDate).map(m => m.date)).size;
    const mainRangeParticipationRate = mainRangeOperatingDays > 0 ? (mainRangeUniqueUsers / allUsers.length) * 100 : 0;

    setKpiData({
      totalOrders: mainRangeTotalOrders,
      avgOrderItems: 0, // Placeholder, as it's not calculated here
      topRecipe: null, // Placeholder
      bottomRecipe: null, // Placeholder
      orderTrend: [], // Placeholder
      categoryDistribution: [], // Placeholder
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
      avgOrderItems: 0, // Placeholder
      topRecipe: null, // Placeholder
      bottomRecipe: null, // Placeholder
      orderTrend: [], // Placeholder
      categoryDistribution: [], // Placeholder
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

  const handleSaveReport = async () => {
    if (!kpiData) return;

    const report: GeneratedReport = {
      id: crypto.randomUUID(),
      type: 'kpi',
      dateGenerated: new Date().toISOString(),
      title: `KPI ${startDate} a ${endDate}`,
      content: [
        `Total pedidos: ${kpiData.totalOrders}`,
        `Usuarios únicos: ${kpiData.uniqueUsers}`,
        `Participación: ${kpiData.participationRate.toFixed(1)}%`,
        `Días operativos: ${kpiData.operatingDays}`,
      ].join('\n'),
      filtersUsed: { startDate, endDate, compareStartDate, compareEndDate },
    };

    await db.saveGeneratedReport(report);
    alert('Reporte KPI guardado en el historial.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <BarChart className="text-primary" /> Reportes y Métricas KPI
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Análisis de rendimiento, comparativas y predicciones.</p>
        </div>
        <button
          onClick={handleSaveReport}
          disabled={!kpiData || isLoading}
          className="bg-primary hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium"
        >
          <Save size={16} /> Guardar KPI
        </button>
      </div>

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
    </div>
  );
};


