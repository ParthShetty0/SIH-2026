import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartPulse, ShieldCheck, Clock } from 'lucide-react';

export default function Header() {
  const { t } = useTranslation();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-white border-b border-emerald-100 px-6 sm:px-12 py-4 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
          <HeartPulse className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {t('badge')}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 leading-tight">
            MediKiosk
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Encrypted Triage</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-100 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{time || '09:41 AM'}</span>
        </div>
      </div>
    </header>
  );
}