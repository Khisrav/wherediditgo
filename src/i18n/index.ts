import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ru from './locales/ru'
import tj from './locales/tj'

import type { AppLocale } from '@/types/finance'

export type { AppLocale }

export const APP_LOCALES: AppLocale[] = ['en', 'tj', 'ru']

export const DEFAULT_LOCALE: AppLocale = 'en'

/** Map app locale codes to BCP 47 tags used by Intl / date formatting */
export function toIntlLocale(locale: AppLocale): string {
  if (locale === 'tj') return 'tg'
  return locale
}

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === 'en' || value === 'tj' || value === 'ru'
}

export function detectDefaultLocale(): AppLocale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const lang = (navigator.language || '').toLowerCase()
  if (lang.startsWith('ru')) return 'ru'
  if (lang.startsWith('tg') || lang.startsWith('tj')) return 'tj'
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en',
  messages: { en, tj, ru },
})

export function setI18nLocale(locale: AppLocale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = toIntlLocale(locale)
}

export default i18n
