import type ExcelJS from 'exceljs';
import { Order, Recipe, User } from "../types";

// --- Helper Functions ---
const getRecipeName = (id: string, recipes: Recipe[]) => recipes.find(r => r.id === id)?.name || 'No seleccionado';

const translateCategory = (cat: string) => {
  const map: Record<string, string> = {
    starter: 'Entrada',
    main: 'Plato Fuerte',
    dessert: 'Postre',
    snack: 'Refrigerio'
  };
  return map[cat] || cat;
};

const downloadWorkbook = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// --- Standard Single Day Report ---
export const exportOrdersToExcel = async (orders: Order[], recipes: Recipe[], fileName = "Reporte_Casino.xlsx") => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const validOrders = orders.filter(o => o.status === 'confirmed');

  // Sheet 1: Resumen
  const recipeCounts: Record<string, number> = {};
  validOrders.forEach(order => {
    order.items.forEach(item => {
      const key = `${item.category}|${item.recipeId}`;
      recipeCounts[key] = (recipeCounts[key] || 0) + 1;
    });
  });

  const summaryRows = Object.entries(recipeCounts).map(([key, count]) => {
    const [category, recipeId] = key.split('|');
    return [translateCategory(category), getRecipeName(recipeId, recipes), count];
  }).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const summarySheet = workbook.addWorksheet('Resumen Cocina');
  summarySheet.columns = [
    { header: 'Categoría', key: 'cat', width: 18 },
    { header: 'Plato', key: 'plato', width: 30 },
    { header: 'Cantidad Total', key: 'qty', width: 16 },
  ];
  summaryRows.forEach(r => summarySheet.addRow(r));

  // Sheet 2: Detalle
  const detailSheet = workbook.addWorksheet('Listado por Curso');
  detailSheet.columns = [
    { header: 'Grado', key: 'grado', width: 8 },
    { header: 'Sección', key: 'seccion', width: 10 },
    { header: 'Estudiante', key: 'nombre', width: 25 },
    { header: 'Alergias/Obs', key: 'alergias', width: 20 },
    { header: 'Entrada', key: 'entrada', width: 22 },
    { header: 'Plato Fuerte', key: 'main', width: 22 },
    { header: 'Postre', key: 'postre', width: 22 },
    { header: 'Refrigerio', key: 'snack', width: 22 },
  ];

  [...validOrders]
    .sort((a, b) => (a.studentGrade ?? 0) - (b.studentGrade ?? 0))
    .forEach(order => {
      const starterId = order.items.find(i => i.category === 'starter')?.recipeId;
      const mainId = order.items.find(i => i.category === 'main')?.recipeId;
      const dessertId = order.items.find(i => i.category === 'dessert')?.recipeId;
      const snackId = order.items.find(i => i.category === 'snack')?.recipeId;
      detailSheet.addRow([
        order.studentGrade,
        order.studentSection || '-',
        order.studentName,
        order.studentAllergies || 'Ninguna',
        starterId ? getRecipeName(starterId, recipes) : '-',
        mainId ? getRecipeName(mainId, recipes) : '-',
        dessertId ? getRecipeName(dessertId, recipes) : '-',
        snackId ? getRecipeName(snackId, recipes) : '-',
      ]);
    });

  await downloadWorkbook(workbook, fileName);
};

// --- Advanced Range Report ---
export const generateAdvancedReport = async (
  orders: Order[],
  recipes: Recipe[],
  dateRange: { start: string, end: string },
  missingOrdersData: { date: string, user: User }[]
) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  // 1. Detalle Completo
  const sheetOrders = workbook.addWorksheet('Detalle Completo');
  sheetOrders.columns = [
    { header: 'Fecha', key: 'fecha', width: 13 },
    { header: 'ID Pedido', key: 'id', width: 11 },
    { header: 'Rol', key: 'rol', width: 16 },
    { header: 'Grado', key: 'grado', width: 8 },
    { header: 'Sección', key: 'seccion', width: 9 },
    { header: 'Nombre', key: 'nombre', width: 26 },
    { header: 'Entrada', key: 'entrada', width: 22 },
    { header: 'Plato Fuerte', key: 'main', width: 26 },
    { header: 'Postre', key: 'postre', width: 22 },
    { header: 'Refrigerio', key: 'snack', width: 22 },
    { header: 'Alergias', key: 'alergias', width: 22 },
  ];

  [...orders]
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.studentGrade ?? '').localeCompare(String(b.studentGrade ?? '')))
    .forEach(o => {
      const starter = o.items.find(i => i.category === 'starter')?.recipeId;
      const main = o.items.find(i => i.category === 'main')?.recipeId;
      const dessert = o.items.find(i => i.category === 'dessert')?.recipeId;
      const snack = o.items.find(i => i.category === 'snack')?.recipeId;
      sheetOrders.addRow([
        o.date,
        o.id.slice(0, 8),
        o.studentGrade ? 'Estudiante' : 'Staff/Visitante',
        o.studentGrade || '-',
        o.studentSection || '-',
        o.studentName,
        starter ? getRecipeName(starter, recipes) : '',
        main ? getRecipeName(main, recipes) : '',
        dessert ? getRecipeName(dessert, recipes) : '',
        snack ? getRecipeName(snack, recipes) : '',
        o.studentAllergies || '',
      ]);
    });

  // 2. Usuarios Sin Pedido
  const sheetMissing = workbook.addWorksheet('Usuarios Sin Pedido');
  sheetMissing.columns = [
    { header: 'Fecha Faltante', key: 'fecha', width: 16 },
    { header: 'Usuario', key: 'usuario', width: 26 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Rol', key: 'rol', width: 11 },
    { header: 'Grado', key: 'grado', width: 9 },
  ];

  [...missingOrdersData]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(item => {
      sheetMissing.addRow([
        item.date,
        item.user.name,
        item.user.email,
        item.user.role === 'student' ? 'Estudiante' : 'Staff',
        item.user.grade || '-',
      ]);
    });

  // 3. Indicadores Consumo
  const dishCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      const name = getRecipeName(i.recipeId, recipes);
      dishCounts[name] = (dishCounts[name] || 0) + 1;
    });
  });

  const sheetIndicators = workbook.addWorksheet('Indicadores Consumo');
  sheetIndicators.columns = [
    { header: 'Plato', key: 'plato', width: 32 },
    { header: 'Total Consumido', key: 'total', width: 17 },
  ];

  Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dish, count]) => sheetIndicators.addRow([dish, count]));

  await downloadWorkbook(workbook, `Reporte_General_${dateRange.start}_al_${dateRange.end}.xlsx`);
};