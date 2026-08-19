import type { AppLocale } from '@/types/finance'

export interface CurrencyOption {
  code: string
  /** i18n key under `currencies.*` */
  nameKey: string
}

/** Shared currency list used by onboarding + settings */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'TJS', nameKey: 'tjs' },
  { code: 'RUB', nameKey: 'rub' },
  { code: 'USD', nameKey: 'usd' },
  { code: 'EUR', nameKey: 'eur' },
  { code: 'GBP', nameKey: 'gbp' },
  { code: 'JPY', nameKey: 'jpy' },
  { code: 'CAD', nameKey: 'cad' },
  { code: 'AUD', nameKey: 'aud' },
  { code: 'INR', nameKey: 'inr' },
  { code: 'BRL', nameKey: 'brl' },
  { code: 'MXN', nameKey: 'mxn' },
  { code: 'CHF', nameKey: 'chf' },
  { code: 'SEK', nameKey: 'sek' },
  { code: 'PLN', nameKey: 'pln' },
  { code: 'TRY', nameKey: 'try' },
  { code: 'UAH', nameKey: 'uah' },
  { code: 'KZT', nameKey: 'kzt' },
]

export function defaultCurrencyForLocale(locale: AppLocale): string {
  if (locale === 'ru') return 'RUB'
  if (locale === 'tj') return 'TJS'
  return 'USD'
}
