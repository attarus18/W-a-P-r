'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';

type CurrencyCode = 'EUR' | 'USD';

interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

interface Currencies {
  [key: string]: Currency;
}

const currencies: Currencies = {
  EUR: { code: 'EUR', name: 'Euro', symbol: '€' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
};

// Tasso di cambio di esempio. In un'applicazione reale, questo verrebbe da un'API.
const exchangeRates = {
  EUR: 1,
  USD: 1.08, 
};

interface CurrencyContextType {
  currencies: Currencies;
  currency: Currency;
  setCurrency: (currencyCode: CurrencyCode) => void;
  convert: (amount: number, from?: CurrencyCode) => number;
  formatCurrency: (amount: number, convertAmount?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(currencies.EUR);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const storedCurrency = localStorage.getItem('waxpro_currency') as CurrencyCode;
    if (storedCurrency && currencies[storedCurrency]) {
      setCurrencyState(currencies[storedCurrency]);
    }
  }, []);

  const setCurrency = (currencyCode: CurrencyCode) => {
    if (currencies[currencyCode]) {
      const oldCurrency = currency;
      const newCurrency = currencies[currencyCode];
      
      if(oldCurrency.code !== newCurrency.code) {
        setCurrencyState(newCurrency);
        localStorage.setItem('waxpro_currency', currencyCode);
        
        const rate = exchangeRates[newCurrency.code] / exchangeRates[oldCurrency.code];

        toast({
            title: t('currency.toast_title'),
            description: t('currency.toast_description', {
                old_currency: oldCurrency.code,
                new_currency: newCurrency.code,
                rate: rate.toFixed(4)
            }),
        });
      }
    }
  };
  
  const convert = useCallback((amount: number, from: CurrencyCode = 'EUR'): number => {
      const rate = exchangeRates[currency.code] / exchangeRates[from];
      return amount * rate;
  }, [currency]);

  const formatCurrency = useCallback((amount: number, convertAmount = true): string => {
    const displayAmount = convertAmount ? convert(amount) : amount;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
    }).format(displayAmount);
  }, [currency, convert]);

  return (
    <CurrencyContext.Provider value={{ currencies, currency, setCurrency, convert, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
