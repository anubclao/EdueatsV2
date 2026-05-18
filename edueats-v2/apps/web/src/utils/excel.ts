import type ExcelJS from 'exceljs';
import { CategoryDef, Order, Recipe, User } from "../types";

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

type UserConsolidatedRow = {
  userId: string;
  userName: string;
  grade: number | string;
  section: string;
  totalOrders: number;
  categoryCounts: Record<string, number>;
};

export const exportConsolidatedOrdersByUserRange = async (
  orders: Order[],
  recipes: Recipe[],
  categories: CategoryDef[],
  dateRange: { start: string; end: string }
) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const validOrders = orders
    .filter(o => o.status === 'confirmed' && o.date >= dateRange.start && o.date <= dateRange.end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.studentName.localeCompare(b.studentName));

  if (!validOrders.length) {
    throw new Error('No hay pedidos confirmados en el rango seleccionado.');
  }

  const categoryNameById = new Map(categories.map(cat => [cat.id, cat.name]));
  const categoryOrderById = new Map(categories.map((cat, idx) => [cat.id, cat.order ?? idx]));

  // Sheet 1: resumen de cocina por categoria/plato.
  const kitchenSheet = workbook.addWorksheet('Resumen Cocina');
  kitchenSheet.columns = [
    { header: 'Categoria', key: 'categoria', width: 24 },
    { header: 'Plato', key: 'plato', width: 34 },
    { header: 'Total Selecciones', key: 'total', width: 18 },
  ];

  const kitchenCounts: Record<string, number> = {};
  validOrders.forEach(order => {
    order.items.forEach(item => {
      const key = `${item.category}|${item.recipeId}`;
      kitchenCounts[key] = (kitchenCounts[key] || 0) + 1;
    });
  });

  Object.entries(kitchenCounts)
    .map(([key, total]) => {
      const [categoryId, recipeId] = key.split('|');
      return {
        categoryId,
        categoryName: categoryNameById.get(categoryId) || translateCategory(categoryId),
        recipeName: getRecipeName(recipeId, recipes),
        total,
      };
    })
    .sort((a, b) => {
      const orderA = categoryOrderById.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
      const orderB = categoryOrderById.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.recipeName.localeCompare(b.recipeName);
    })
    .forEach(row => kitchenSheet.addRow([row.categoryName, row.recipeName, row.total]));

  // Sheet 2: resumen logistico agrupado por usuario.
  const userSheet = workbook.addWorksheet('Logistico por Usuario');
  const userMap = new Map<string, UserConsolidatedRow>();

  validOrders.forEach(order => {
    const userId = order.studentId || order.studentName;
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        userName: order.studentName,
        grade: order.studentGrade ?? '-',
        section: order.studentSection || '-',
        totalOrders: 0,
        categoryCounts: Object.fromEntries(categories.map(cat => [cat.id, 0])),
      });
    }

    const userRow = userMap.get(userId)!;
    userRow.totalOrders += 1;
    order.items.forEach(item => {
      userRow.categoryCounts[item.category] = (userRow.categoryCounts[item.category] || 0) + 1;
    });
  });

  userSheet.columns = [
    { header: 'Usuario ID', key: 'userId', width: 28 },
    { header: 'Usuario', key: 'userName', width: 28 },
    { header: 'Grado', key: 'grade', width: 10 },
    { header: 'Seccion', key: 'section', width: 12 },
    { header: 'Total Pedidos', key: 'totalOrders', width: 15 },
    ...categories.map(cat => ({ header: cat.name, key: `cat_${cat.id}`, width: 16 })),
  ];

  [...userMap.values()]
    .sort((a, b) => b.totalOrders - a.totalOrders || a.userName.localeCompare(b.userName))
    .forEach(user => {
      userSheet.addRow([
        user.userId,
        user.userName,
        user.grade,
        user.section,
        user.totalOrders,
        ...categories.map(cat => user.categoryCounts[cat.id] || 0),
      ]);
    });

  // Sheet 3: detalle completo por pedido para auditoria.
  const detailSheet = workbook.addWorksheet('Detalle Consolidado');
  detailSheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Pedido ID', key: 'orderId', width: 14 },
    { header: 'Usuario ID', key: 'userId', width: 28 },
    { header: 'Usuario', key: 'userName', width: 26 },
    { header: 'Grado', key: 'grade', width: 10 },
    { header: 'Seccion', key: 'section', width: 12 },
    ...categories.map(cat => ({ header: cat.name, key: `detail_${cat.id}`, width: 24 })),
  ];

  validOrders.forEach(order => {
    const itemsByCategory = new Map(order.items.map(item => [item.category, item.recipeId]));
    detailSheet.addRow([
      order.date,
      order.id.slice(0, 8),
      order.studentId,
      order.studentName,
      order.studentGrade ?? '-',
      order.studentSection || '-',
      ...categories.map(cat => {
        const recipeId = itemsByCategory.get(cat.id);
        return recipeId ? getRecipeName(recipeId, recipes) : '';
      }),
    ]);
  });

  await downloadWorkbook(
    workbook,
    `Consolidado_Pedidos_Usuarios_${dateRange.start}_al_${dateRange.end}.xlsx`
  );
};