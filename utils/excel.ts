import { Order, Recipe, User } from "../types";

declare global {
  interface Window {
    XLSX: any;
  }
}

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

// --- Standard Single Day Report (Legacy support) ---
export const exportOrdersToExcel = (orders: Order[], recipes: Recipe[], fileName = "Reporte_Casino.xlsx") => {
  if (!window.XLSX) {
    alert("La librería de Excel no se ha cargado.");
    return;
  }
  
  // Reuse the logic, but wrap it in a workbook
  const workbook = window.XLSX.utils.book_new();
  
  // ... (Logica anterior simplificada o mantenida si se prefiere, aquí adaptamos para usar la nueva estructura si se desea, 
  // pero mantendré la función original refactorizada para usar el writer común si fuera necesario. 
  // Por simplicidad en este parche, mantengo la lógica original para no romper dashboard actual).

  const validOrders = orders.filter(o => o.status === 'confirmed');

  // Sheet 1: Resumen
  const recipeCounts: Record<string, number> = {};
  validOrders.forEach(order => {
    order.items.forEach(item => {
      const key = `${item.category}|${item.recipeId}`;
      recipeCounts[key] = (recipeCounts[key] || 0) + 1;
    });
  });

  const summaryData = Object.entries(recipeCounts).map(([key, count]) => {
    const [category, recipeId] = key.split('|');
    return {
      "Categoría": translateCategory(category),
      "Plato": getRecipeName(recipeId, recipes),
      "Cantidad Total": count
    };
  }).sort((a, b) => a["Categoría"].localeCompare(b["Categoría"]));

  // Sheet 2: Detalle
  const detailData = validOrders.map(order => {
    const starterId = order.items.find(i => i.category === 'starter')?.recipeId;
    const mainId = order.items.find(i => i.category === 'main')?.recipeId;
    const dessertId = order.items.find(i => i.category === 'dessert')?.recipeId;
    const snackId = order.items.find(i => i.category === 'snack')?.recipeId;

    return {
      "Grado": order.studentGrade,
      "Sección": order.studentSection || '-',
      "Estudiante": order.studentName,
      "Alergias/Obs": order.studentAllergies || 'Ninguna',
      "Entrada": starterId ? getRecipeName(starterId, recipes) : '-',
      "Plato Fuerte": mainId ? getRecipeName(mainId, recipes) : '-',
      "Postre": dessertId ? getRecipeName(dessertId, recipes) : '-',
      "Refrigerio": snackId ? getRecipeName(snackId, recipes) : '-',
    };
  }).sort((a, b) => a.Grado - b.Grado);

  const summarySheet = window.XLSX.utils.json_to_sheet(summaryData);
  window.XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen Cocina");

  const detailSheet = window.XLSX.utils.json_to_sheet(detailData);
  window.XLSX.utils.book_append_sheet(workbook, detailSheet, "Listado por Curso");

  window.XLSX.writeFile(workbook, fileName);
};

// --- NEW: Advanced Range Report ---
export const generateAdvancedReport = (
  orders: Order[], 
  // users parameter removed as it was unused in logic
  recipes: Recipe[], 
  dateRange: {start: string, end: string},
  missingOrdersData: {date: string, user: User}[]
) => {
  if (!window.XLSX) {
    alert("Excel library not loaded");
    return;
  }

  const workbook = window.XLSX.utils.book_new();

  // 1. DATASET: All Orders in Range (Detailed)
  const fullLog = orders.map(o => {
    const starter = o.items.find(i => i.category === 'starter')?.recipeId;
    const main = o.items.find(i => i.category === 'main')?.recipeId;
    const dessert = o.items.find(i => i.category === 'dessert')?.recipeId;
    const snack = o.items.find(i => i.category === 'snack')?.recipeId;

    return {
      "Fecha": o.date,
      "ID Pedido": o.id.slice(0,8),
      "Rol": o.studentGrade ? 'Estudiante' : 'Staff/Visitante',
      "Grado": o.studentGrade || '-',
      "Sección": o.studentSection || '-',
      "Nombre": o.studentName,
      "Entrada": starter ? getRecipeName(starter, recipes) : '',
      "Plato Fuerte": main ? getRecipeName(main, recipes) : '',
      "Postre": dessert ? getRecipeName(dessert, recipes) : '',
      "Refrigerio": snack ? getRecipeName(snack, recipes) : '',
      "Alergias": o.studentAllergies || ''
    };
  }).sort((a, b) => a.Fecha.localeCompare(b.Fecha) || a.Grado.toString().localeCompare(b.Grado.toString()));

  const sheetOrders = window.XLSX.utils.json_to_sheet(fullLog);
  sheetOrders['!cols'] = [{wch:12}, {wch:10}, {wch:10}, {wch:8}, {wch:8}, {wch:25}, {wch:20}, {wch:25}, {wch:20}, {wch:20}, {wch:20}];
  window.XLSX.utils.book_append_sheet(workbook, sheetOrders, "Detalle Completo");

  // 2. DATASET: Missing Orders (Audit)
  const missingLog = missingOrdersData.map(item => ({
    "Fecha Faltante": item.date,
    "Usuario": item.user.name,
    "Email": item.user.email,
    "Rol": item.user.role === 'student' ? 'Estudiante' : 'Staff',
    "Grado": item.user.grade || '-'
  })).sort((a, b) => a["Fecha Faltante"].localeCompare(b["Fecha Faltante"]));

  const sheetMissing = window.XLSX.utils.json_to_sheet(missingLog);
  sheetMissing['!cols'] = [{wch:15}, {wch:25}, {wch:25}, {wch:10}, {wch:8}];
  window.XLSX.utils.book_append_sheet(workbook, sheetMissing, "Usuarios Sin Pedido");

  // 3. DATASET: Indicators (Consumption vs Supply)
  // Calculate top dishes
  const dishCounts: Record<string, number> = {};
  orders.forEach(o => {
      o.items.forEach(i => {
          const name = getRecipeName(i.recipeId, recipes);
          dishCounts[name] = (dishCounts[name] || 0) + 1;
      });
  });
  
  const indicatorsLog = Object.entries(dishCounts)
    .map(([dish, count]) => ({ "Plato": dish, "Total Consumido": count }))
    .sort((a,b) => b["Total Consumido"] - a["Total Consumido"]);

  const sheetIndicators = window.XLSX.utils.json_to_sheet(indicatorsLog);
  sheetIndicators['!cols'] = [{wch:30}, {wch:15}];
  window.XLSX.utils.book_append_sheet(workbook, sheetIndicators, "Indicadores Consumo");

  // Export
  window.XLSX.writeFile(workbook, `Reporte_General_${dateRange.start}_al_${dateRange.end}.xlsx`);
};