interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
}

export function StatsCard({ label, value, change, trend = 'up' }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-lg p-5 shadow-sm border-t-2 border-t-[#276fbf]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#6e7d8c] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-[#1d2d3e] mt-1.5">{value}</p>
        </div>
        {change && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend === 'up' ? 'bg-green-50 text-[#3d8c36]' : 'bg-red-50 text-red-600'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
