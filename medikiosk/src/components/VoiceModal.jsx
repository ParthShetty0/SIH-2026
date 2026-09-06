import { useTranslation } from 'react-i18next';

export default function VoiceModal({ session, onClose }) {
  const { t } = useTranslation();
  if (!session) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-emerald-100 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold mb-6">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          {t.activeSession}
        </div>

        <div className="relative flex items-center justify-center my-6">
          <span className="absolute w-28 h-28 rounded-full bg-emerald-100 animate-ping opacity-75" />
          <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 relative z-10">
            <Mic className="w-8 h-8" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mt-2 mb-1">{t.listening}</h3>
        <p className="text-sm text-slate-500 mb-2 max-w-xs">{t.speakInstruction}</p>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 mb-6">
          ID: {session.sessionId}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors shadow-xs"
        >
          <Square className="w-4 h-4 fill-current" />
          {t.endVoice}
        </button>
      </div>
    </div>
  );
}