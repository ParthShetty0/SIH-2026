import React from 'react';
import { Loader2 } from 'lucide-react';

export default function KioskCard({
  badgeText,
  icon: Icon,
  title,
  subtitle,
  actionText,
  loading = false,
  loadingText,
  onClick,
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="group relative flex flex-col items-center justify-between text-center p-8 min-h-[360px] bg-white rounded-3xl border border-slate-200/90 shadow-xs transition-all duration-200 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 active:scale-[0.98] disabled:opacity-60"
    >
      <div className="w-full flex justify-end">
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
          {badgeText}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-6 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all duration-200 shadow-xs">
          {loading ? (
            <Loader2 className="w-9 h-9 animate-spin text-emerald-600 group-hover:text-white" />
          ) : (
            <Icon className="w-9 h-9 stroke-[1.75]" />
          )}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed max-w-[210px]">
          {loading ? loadingText : subtitle}
        </p>
      </div>

      <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-center text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
        {actionText} →
      </div>
    </button>
  );
}