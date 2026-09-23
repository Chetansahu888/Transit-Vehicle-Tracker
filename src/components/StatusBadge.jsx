import React from 'react';
import { getStatusCategory } from '../constants';

export default function StatusBadge({ status, className = '' }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 italic">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Not Set
      </span>
    );
  }

  const category = getStatusCategory(status);

  let style = {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500'
  };

  switch (category) {
    case 'reached':
      style = {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
      break;
    case 'transit':
      style = {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
      break;
    case 'pending':
      style = {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
      break;
    default:
      style = {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500'
      };
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="truncate max-w-[160px]">{status}</span>
    </span>
  );
}
