import { useTranslation } from 'react-i18next';

export default function OcrModal({ result, onClose }) {
  const { t } = useTranslation();
  if (!result) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-7 shadow-2xl border border-emerald-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t.prescriptionDetails}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-6 space-y-3">
          <div className="flex items-start gap-3.5 p-3.5 bg-[#fbfdfc] border border-emerald-100/80 rounded-2xl">
            <User className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{t.patient}</p>
              <p className="text-slate-900 font-semibold mt-0.5">{result.extractedData?.patientName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl">
            <Pill className="w-5 h-5 text-emerald-700 mt-0.5" />
            <div>
              <p className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">{t.medication}</p>
              <p className="text-slate-900 font-bold text-base mt-0.5">{result.extractedData?.medication}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{result.extractedData?.instructions}</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 bg-[#fbfdfc] border border-emerald-100/80 rounded-2xl">
            <Stethoscope className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{t.doctor}</p>
              <p className="text-slate-900 font-semibold mt-0.5">{result.extractedData?.doctor}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-sm shadow-emerald-600/20"
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
}