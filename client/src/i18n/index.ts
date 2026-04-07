import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

// Add additional language imports here:
// import af from './af.json';

const resources = {
  en: { translation: en },
  // af: { translation: af },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
