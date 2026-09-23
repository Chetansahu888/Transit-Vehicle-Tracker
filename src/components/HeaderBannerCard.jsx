import React from 'react';

export default function HeaderBannerCard({ 
  icon: Icon, 
  title, 
  description, 
  statPills = [], 
  actionButton = null,
  children 
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-5 py-4 shrink-0 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon container + Title + Description */}
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Right: Quick Stat Pills + Primary Action Button */}
        <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
          {statPills.map((pill, idx) => (
            <div
              key={idx}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                pill.active 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {pill.label && <span className="text-slate-400 font-normal">{pill.label}:</span>}
              <span className="font-mono font-bold">{pill.value}</span>
            </div>
          ))}

          {actionButton}
        </div>
      </div>

      {children && <div className="mt-3 pt-3 border-t border-slate-100">{children}</div>}
    </div>
  );
}
