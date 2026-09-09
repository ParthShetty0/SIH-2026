import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Languages, FileScan, Activity, AlertCircle, X } from 'lucide-react';

import Header from './components/Header';
import KioskCard from './components/KioskCard';
import LanguageModal from './components/LanguageModal';
import VoiceModal from './components/VoiceModal';
import OcrModal from './components/OcrModal';
import { startVoiceSession, uploadPrescription } from './services/api';

export default function App() {
  const { t, i18n } = useTranslation();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceSession, setVoiceSession] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState('');

  const fileInputRef = useRef(null);

  const handleVoiceBot = async () => {
    setVoiceLoading(true);
    try {
      const data = await startVoiceSession();
      setVoiceSession(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');
    try {
      const data = await uploadPrescription(file);
      setOcrResult(data);
    } catch (err) {
      setOcrError(err.message);
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const currentLanguageLabel = {
    en: 'English',
    hi: 'हिन्दी',
    mr: 'मराठी',
  }[i18n.language] || 'English';

  return (
    <div className="min-h-screen w-full bg-[#f8faf9] flex flex-col justify-between text-slate-800 antialiased font-sans select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf"
        className="hidden"
      />

      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Patient Self-Check-In
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-lg mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <KioskCard
            badgeText="Fast Track"
            icon={Mic}
            title={t('voiceTitle')}
            subtitle={t('voiceSubtitle')}
            actionText="Tap to Speak"
            loading={voiceLoading}
            loadingText="Connecting..."
            onClick={handleVoiceBot}
          />

          <KioskCard
            badgeText={currentLanguageLabel}
            icon={Languages}
            title={t('langTitle')}
            subtitle={t('langSubtitle')}
            actionText="Select Language"
            onClick={() => setIsLangOpen(true)}
          />

          <KioskCard
            badgeText="AI Vision"
            icon={FileScan}
            title={t('ocrTitle')}
            subtitle={t('ocrSubtitle')}
            actionText="Upload / Scan"
            loading={ocrLoading}
            loadingText="Scanning image..."
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      </main>

      <footer className="w-full bg-white border-t border-slate-200 px-6 sm:px-12 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2 text-slate-500">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Need staff assistance? Press the physical call button on the side panel.</span>
        </div>
        <span>MediKiosk OS v2.4 • Clinical Grade</span>
      </footer>

      <LanguageModal isOpen={isLangOpen} onClose={() => setIsLangOpen(false)} />

      {/* Conditionally rendered so audio never plays on initial site load */}
      {voiceSession && (
        <VoiceModal
          session={voiceSession}
          currentLang={i18n.language}
          onClose={() => setVoiceSession(null)}
        />
      )}

      <OcrModal result={ocrResult} onClose={() => setOcrResult(null)} />

      {ocrError && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 p-4 bg-white border border-red-200 text-slate-800 rounded-2xl shadow-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium">{ocrError}</p>
          <button onClick={() => setOcrError('')} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}