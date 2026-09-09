import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Radio, Square, Send, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { sendVoiceChatMessage } from '../services/api';

export default function VoiceModal({ session, currentLang = 'en', onClose }) {
  const { t } = useTranslation();

  const [isListening, setIsListening] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isWaitingAi, setIsWaitingAi] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [triageSummary, setTriageSummary] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Connecting to triage...');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const messagesRef = useRef([]);
  const recognitionRef = useRef(null);
  const isMountedRef = useRef(true);
  const chatScrollRef = useRef(null);

  const speechLangMap = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
  };
  const activeLangCode = speechLangMap[currentLang] || 'en-IN';

  const updateMessages = (newMsgs) => {
    messagesRef.current = newMsgs;
    setMessages(newMsgs);
  };

  const cancelSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = (text, onComplete) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !soundEnabled || !isMountedRef.current) {
      if (onComplete) onComplete();
      return;
    }

    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = activeLangCode;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang === activeLangCode || v.lang.replace('_', '-').startsWith(currentLang)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      if (isMountedRef.current) {
        setIsBotSpeaking(true);
        setStatusMessage('Assistant is speaking...');
      }
    };

    utterance.onend = () => {
      if (isMountedRef.current) {
        setIsBotSpeaking(false);
        setStatusMessage('Your turn: Speak or type your answer.');
        if (onComplete) onComplete();
      }
    };

    utterance.onerror = () => {
      if (isMountedRef.current) {
        setIsBotSpeaking(false);
        if (onComplete) onComplete();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!isMountedRef.current || triageSummary) return;
    try {
      recognitionRef.current?.abort();
      recognitionRef.current?.start();
    } catch (e) {
      // Ignored if already started
    }
  };

  const handleTurn = async (userText) => {
    const text = (userText || inputText).trim();
    if (!text || isWaitingAi) return;

    setInputText('');
    cancelSpeech();
    try {
      recognitionRef.current?.abort();
    } catch (e) {}

    const updatedWithUser = [...messagesRef.current, { role: 'user', content: text }];
    updateMessages(updatedWithUser);

    setIsWaitingAi(true);
    setStatusMessage('Analyzing symptoms...');

    try {
      const data = await sendVoiceChatMessage(session.sessionId, updatedWithUser, currentLang);
      if (!isMountedRef.current) return;

      const fallbackReplies = {
        hi: 'कृपया अपनी समस्या के बारे में और बताएं।',
        mr: 'कृपया तुमच्या त्रासाबद्दल आणखी थोडी माहिती सांगा.',
        en: 'Could you tell me a little more about that?',
      };
      const aiReply = data.speechResponse || fallbackReplies[currentLang] || fallbackReplies.en;
      const updatedWithBot = [...updatedWithUser, { role: 'assistant', content: aiReply }];
      updateMessages(updatedWithBot);
      setIsWaitingAi(false);

      if (data.isComplete || data.summary?.triageLevel === 'Emergency') {
        setTriageSummary(data.summary);
        speakText(aiReply, null);
      } else {
        speakText(aiReply, () => {
          startListening();
        });
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        setIsWaitingAi(false);
        setStatusMessage('Network issue. Tap mic to retry.');
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = activeLangCode;

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setIsListening(true);
          setStatusMessage(t('listening'));
        }
      };

      recognition.onresult = (e) => {
        const spoken = e.results[0][0].transcript;
        if (isMountedRef.current && spoken.trim()) {
          handleTurn(spoken);
        }
      };

      recognition.onerror = () => {
        if (isMountedRef.current) setIsListening(false);
      };

      recognition.onend = () => {
        if (isMountedRef.current) setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    const greetings = {
      en: 'Hello! I am your clinical assistant. What chief symptom brought you in today?',
      hi: 'नमस्ते! मैं आपका स्वास्थ्य सहायक हूँ। आज आपको क्या तकलीफ़ हो रही है?',
      mr: 'नमस्कार! मी तुमचा क्लिनिकल सहाय्यक आहे. आज तुम्हाला कोणता त्रास होत आहे?',
    };
    const welcomeMsg = greetings[currentLang] || greetings.en;

    updateMessages([{ role: 'assistant', content: welcomeMsg }]);

    const timer = setTimeout(() => {
      speakText(welcomeMsg, () => {
        startListening();
      });
    }, 350);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      cancelSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [currentLang]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingAi]);

  const handleCloseModal = () => {
    isMountedRef.current = false;
    cancelSpeech();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-emerald-100 flex flex-col items-center">
        
        {/* Modal Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>{t('activeSession')}</span>
            <span className="uppercase text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded font-bold">
              {currentLang}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                cancelSpeech();
                setSoundEnabled(!soundEnabled);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              type="button"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={handleCloseModal}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mic Pulse Button */}
        <div className="relative flex items-center justify-center my-2">
          {isListening && <span className="absolute w-20 h-20 rounded-full bg-emerald-200 animate-ping opacity-75" />}
          {isBotSpeaking && <span className="absolute w-20 h-20 rounded-full bg-blue-200 animate-pulse opacity-75" />}
          <button
            type="button"
            onClick={isListening ? () => recognitionRef.current?.abort() : startListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 z-10 ${
              isListening ? 'bg-emerald-600 animate-pulse' : isBotSpeaking ? 'bg-blue-600' : 'bg-slate-800'
            }`}
          >
            {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
          </button>
        </div>

        <p className="text-xs font-medium text-slate-500 mb-2">{statusMessage || t('speakInstruction')}</p>

        {/* Chat History */}
        <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-200 text-left h-48 overflow-y-auto space-y-2 text-xs">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-2 rounded-xl max-w-[85%] ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {isWaitingAi && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-400 italic flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatScrollRef} />
        </div>

        {/* Triage Summary Card */}
        {triageSummary && (
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 my-2 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Triage Completed
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                {triageSummary.triageLevel} Priority
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium">{triageSummary.doctorNotes}</p>
          </div>
        )}

        {/* Input Bar */}
        <div className="w-full flex items-center gap-2 mt-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTurn()}
            placeholder={
              currentLang === 'hi' ? 'यहाँ अपने लक्षण लिखें या बोलें...' :
              currentLang === 'mr' ? 'येथे तुमची लक्षणे लिहा किंवा बोला...' :
              'Type your symptoms or speak...'
            }
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => handleTurn()}
            disabled={isWaitingAi}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2 rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleCloseModal}
          className="flex items-center justify-center gap-2 w-full py-2.5 mt-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          {t('endVoice')}
        </button>
      </div>
    </div>
  );
}