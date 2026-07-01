'use client';
import { Card } from '../ui/card';

interface StatsProps {
  stats: {
    total: number;
    today: number;
    resolved: number;
    pending: number;
    critical: number;
    resolution_rate: number;
  } | null;
  loading: boolean;
}

export default function LiveStatsBanner({ stats, loading }: StatsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6 h-24 skeleton" />
        ))}
      </div>
    );
  }

  const items = [
    { title: "Today's Reports", value: stats.today, color: "text-blue-400", desc: "New issues today" },
    { title: "Resolved Reports", value: stats.resolved, color: "text-green-400", desc: "Total issues resolved" },
    { title: "Pending Reports", value: stats.pending, color: "text-amber-400", desc: "Awaiting inspection" },
    { title: "Critical Issues", value: stats.critical, color: "text-red-400 font-bold animate-pulse-glow", desc: "High hazard areas" },
    { title: "Resolution Rate", value: `${stats.resolution_rate}%`, color: "text-cyan-400", desc: "Completion efficiency" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {items.map((item, idx) => (
        <Card key={idx} className="p-5 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {item.title}
          </div>
          <div className={`text-3xl font-extrabold my-2 ${item.color}`}>
            {item.value}
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            {item.desc}
          </div>
        </Card>
      ))}
    </div>
  );
}
