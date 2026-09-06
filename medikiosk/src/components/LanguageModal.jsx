import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check, X } from 'lucide-react';

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

export default function LanguageModal({ isOpen, onClose }) {
  // Grab translation function and i18n controller directly
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const handleLanguageChange = (langCode) => {
    // This one line switches the language across the entire application
    i18n.changeLanguage(langCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-emerald-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-emerald-600" />
            {/* Translates dynamically based on the current active language */}
            <h3 className="text-lg font-bold text-slate-900">{t('selectLang')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 grid grid-cols-1 gap-2.5">
          {AVAILABLE_LANGUAGES.map(({ code, label, native }) => {
            const isSelected = i18n.language === code;

            return (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageChange(code)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold shadow-xs'
                    : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-left">
                  <p className="text-base">{native}</p>
                  <p className="text-xs text-slate-500 font-normal">{label}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}