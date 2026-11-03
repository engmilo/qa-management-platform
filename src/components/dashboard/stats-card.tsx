interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
}

export function StatsCard({ label, value, change, trend = 'up' }: StatsCardProps) {
  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        </div>
        {change && (
          <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
