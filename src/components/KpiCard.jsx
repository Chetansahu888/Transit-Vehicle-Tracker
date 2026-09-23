import React from 'react';

export default function KpiCard({ title, value, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: {
      bar: 'bg-indigo-600',
      iconBox: 'bg-indigo-50 text-indigo-600',
    },
    emerald: {
      bar: 'bg-emerald-500',
      iconBox: 'bg-emerald-50 text-emerald-600',
    },
    amber: {
      bar: 'bg-amber-500',
      iconBox: 'bg-amber-50 text-amber-600',
    },
    rose: {
      bar: 'bg-rose-500',
      iconBox: 'bg-rose-50 text-rose-600',
    },
    blue: {
      bar: 'bg-blue-500',
      iconBox: 'bg-blue-50 text-blue-600',
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs p-4 hover:border-slate-300 transition-all flex flex-col justify-between">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${scheme.bar}`} />

      {/* Title + Icon */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${scheme.iconBox}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Number */}
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {value}
        </h3>
      </div>
    </div>
  );
}
