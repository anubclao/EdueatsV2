type StudentCaloriesChartPoint = {
  day: string;
  calories: number;
};

export default function StudentCaloriesChart({
  data,
  compact = false,
}: {
  data: StudentCaloriesChartPoint[];
  compact?: boolean;
}) {
  const chartMax = Math.max(800, ...data.map((entry) => entry.calories), 1);

  return (
    <div className="relative h-full w-full">
      {!compact && (
        <>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200 dark:border-gray-600" />
          <div
            className="absolute inset-x-0 border-t border-dashed border-amber-400/80"
            style={{ bottom: `${(800 / chartMax) * 100}%` }}
          >
            <span className="absolute right-0 -top-5 text-[10px] font-medium text-amber-500">Rec. Max</span>
          </div>
        </>
      )}

      <div className={`grid h-full items-end gap-2 ${compact ? 'grid-cols-7' : 'grid-cols-7 border-b border-l border-gray-200 dark:border-gray-600 px-3 pb-6 pt-4'}`}>
        {data.map((entry, index) => {
          const height = Math.max(6, (entry.calories / chartMax) * 100);
          const colorClass = entry.calories > 1000
            ? 'bg-amber-500'
            : entry.calories < 400
              ? 'bg-red-500'
              : 'bg-emerald-500';

          return (
            <div key={`${entry.day}-${index}`} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
              <div className="relative flex h-full w-full items-end justify-center">
                <div
                  className={`${colorClass} w-full max-w-10 rounded-t-md transition-all hover:opacity-90`}
                  style={{ height: `${height}%`, opacity: compact ? 0.8 : 1 }}
                  title={`${entry.day}: ${entry.calories} kcal`}
                />
              </div>
              {!compact && <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.day}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
