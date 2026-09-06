import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      badge: 'SMART HEALTH KIOSK',
      hospitalName: 'Ayushman Clinical Center',
      subtitle: 'Touch an option below to begin your consultation intake',
      voiceTitle: 'Clinical Voice Bot',
      voiceSubtitle: 'Speak directly with our AI triage assistant',
      langTitle: 'Change Language',
      langSubtitle: 'Switch dialect & regional voice prompts',
      ocrTitle: 'Prescription OCR',
      ocrSubtitle: 'Scan handwritten or printed prescription',
      listening: 'Listening to your symptoms...',
      speakInstruction: 'Please speak into the kiosk mic clearly.',
      endVoice: 'Complete Voice Intake',
      selectLang: 'Select Preferred Language',
      prescriptionDetails: 'Verified Prescription Summary',
      patient: 'Patient Name',
      medication: 'Prescribed Medication',
      doctor: 'Attending Practitioner',
      confirm: 'Confirm & Proceed to Queue',
      activeSession: 'Active Intake Session',
    },
  },
  hi: {
    translation: {
      badge: 'स्मार्ट स्वास्थ्य कियोस्क',
      hospitalName: 'आयुष्मान क्लीनिकल सेंटर',
      subtitle: 'पंजीकरण और परामर्श शुरू करने के लिए नीचे स्पर्श करें',
      voiceTitle: 'एआई वॉयस बॉट',
      voiceSubtitle: 'हमारे एआई सहायक से सीधे बोलकर बात करें',
      langTitle: 'भाषा बदलें',
      langSubtitle: 'इंटरफ़ेस और क्षेत्रीय भाषा चुनें',
      ocrTitle: 'पर्चा स्कैनर (OCR)',
      ocrSubtitle: 'हस्तलिखित या मुद्रित पर्चा स्कैन करें',
      listening: 'आपके लक्षण सुने जा रहे हैं...',
      speakInstruction: 'कृपया माइक्रोफ़ोन के पास साफ़ आवाज़ में बोलें।',
      endVoice: 'सत्र पूरा करें',
      selectLang: 'पसंदीदा भाषा चुनें',
      prescriptionDetails: 'सत्यापित पर्चा विवरण',
      patient: 'मरीज़ का नाम',
      medication: 'निर्धारित दवा और खुराक',
      doctor: 'परामर्शदाता चिकित्सक',
      confirm: 'पुष्टि करें और आगे बढ़ें',
      activeSession: 'सक्रिय पंजीकरण सत्र',
    },
  },
  mr: {
    translation: {
      badge: 'स्मार्ट आरोग्य केंद्र',
      hospitalName: 'आयुष्मान क्लिनिकल केंद्र',
      subtitle: 'नोंदणी आणि तपासणी सुरू करण्यासाठी खालील पर्याय निवडा',
      voiceTitle: 'एआय व्हॉईस बॉट',
      voiceSubtitle: 'क्लिनिकल सहाय्यकाशी थेट संवाद साधा',
      langTitle: 'भाषा निवडा',
      langSubtitle: 'इंटरफेस आणि प्रादेशिक भाषा बदला',
      ocrTitle: 'प्रिस्क्रिप्शन OCR',
      ocrSubtitle: 'वैद्यकीय प्रिस्क्रिप्शन स्कॅन करा',
      listening: 'तुमची लक्षणे ऐकत आहोत...',
      speakInstruction: 'कृपया कियोस्क माइकजवळ स्पष्टपणे बोला.',
      endVoice: 'नोंदणी पूर्ण करा',
      selectLang: 'पसंतीची भाषा निवडा',
      prescriptionDetails: 'तपासलेले प्रिस्क्रिप्शन तपशील',
      patient: 'रुग्णाचे नाव',
      medication: 'औषध आणि डोस',
      doctor: 'तपासणी करणारे डॉक्टर',
      confirm: 'खात्री करा आणि टोकन मिळवा',
      activeSession: 'सक्रिय नोंदणी सत्र',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;