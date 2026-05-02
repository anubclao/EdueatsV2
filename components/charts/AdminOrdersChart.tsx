type AdminOrdersChartPoint = {
  date: string;
  pedidos: number;
  faltantes: number;
};

export default function AdminOrdersChart({ data }: { data: AdminOrdersChartPoint[] }) {
  const chartMax = Math.max(1, ...data.map((entry) => entry.pedidos + entry.faltantes));

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Pedidos Confirmados</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-gray-200 dark:bg-gray-500" />Sin Pedido</span>
      </div>

      <div className="grid h-full grid-cols-7 items-end gap-3 border-b border-l border-gray-200 dark:border-gray-600 px-3 pb-6 pt-4">
        {data.map((entry) => {
          const pedidosHeight = ((entry.pedidos || 0) / chartMax) * 100;
          const faltantesHeight = ((entry.faltantes || 0) / chartMax) * 100;

          return (
            <div key={entry.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
              <div
                className="flex h-full w-full max-w-12 flex-col justify-end overflow-hidden rounded-t-md"
                title={`${entry.date}: ${entry.pedidos} confirmados, ${entry.faltantes} sin pedido`}
              >
                <div className="bg-emerald-500" style={{ height: `${Math.max(0, pedidosHeight)}%` }} />
                <div className="bg-gray-200 dark:bg-gray-500" style={{ height: `${Math.max(0, faltantesHeight)}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
