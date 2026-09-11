'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import translations from '@/locales/translations';

type Language = 'it' | 'en' | 'fr' | 'de' | 'es';

type Translations = {
  [key: string]: string | Translations;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedTranslation(translations: Translations, key: string): string | undefined {
    return key.split('.').reduce((obj: Translations | string | undefined, keyPart: string) => {
        if (typeof obj === 'object' && obj !== null && keyPart in obj) {
            return (obj as Translations)[keyPart];
        }
        return undefined;
    }, translations) as string | undefined;
}


export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('it');
  
  useEffect(() => {
    const storedLang = localStorage.getItem('waxpro_language') as Language;
    if (storedLang && translations[storedLang]) {
      setLanguage(storedLang);
      return;
    }
    // Nessuna preferenza salvata: proviamo a indovinare la lingua dal
    // dispositivo/browser (navigator.languages, in ordine di preferenza),
    // cosi' un utente non italiano non si trova l'app in una lingua che non
    // capisce alla primissima apertura. Non scriviamo su localStorage qui:
    // resta un default automatico, non una scelta esplicita dell'utente,
    // che puo' sempre cambiarla da Impostazioni (handleSetLanguage sotto).
    const supported: Language[] = ['it', 'en', 'es', 'fr', 'de'];
    const candidates = typeof navigator !== 'undefined'
      ? (navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language])
      : [];
    for (const candidate of candidates) {
      const primary = candidate.slice(0, 2).toLowerCase() as Language;
      if (supported.includes(primary)) {
        setLanguage(primary);
        break;
      }
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('waxpro_language', lang);
  };
  
  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    const translationSet = translations[language] || translations.it;

    // Pluralizzazione: se viene passato options.count === 1 e per la
    // chiave esiste una variante "<key>_one", usiamo quella al posto della
    // chiave base (che resta la forma plurale/"altro"), cosi' non serve
    // toccare tutte le chiamate esistenti per aggiungere il singolare.
    let resolvedKey = key;
    if (options && typeof options.count === 'number' && options.count === 1) {
      const singularKey = `${key}_one`;
      if (getNestedTranslation(translationSet, singularKey) !== undefined) {
        resolvedKey = singularKey;
      }
    }

    let translatedText = getNestedTranslation(translationSet, resolvedKey);

    if (translatedText && options) {
      Object.keys(options).forEach(optionKey => {
        const regex = new RegExp(`{${optionKey}}`, 'g');
        translatedText = translatedText!.replace(regex, String(options[optionKey]));
      });
    }
    
    return translatedText || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
