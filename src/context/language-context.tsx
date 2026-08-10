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
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('waxpro_language', lang);
  };
  
  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    const translationSet = translations[language] || translations.it;
    let translatedText = getNestedTranslation(translationSet, key);

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
