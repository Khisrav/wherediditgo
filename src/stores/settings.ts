import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { isAppLocale, setI18nLocale, toIntlLocale, type AppLocale } from '@/i18n'
import { getCurrencySymbol } from '@/lib/money'
import { applyStatusBar } from '@/services/native/chrome'
import type { CurrencyPosition, HeroMetric, ThemeMode } from '@/types/finance'

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function detectDefaultLocale(): AppLocale {
  const lang = (navigator.language || 'en').toLowerCase()
  if (lang.startsWith('ru')) return 'ru'
  if (lang.startsWith('tg') || lang.startsWith('tj')) return 'tj'
  return 'en'
}

function isCurrencyPosition(value: string | undefined | null): value is CurrencyPosition {
  return value === 'before' || value === 'after'
}

function isHeroMetric(value: string | undefined | null): value is HeroMetric {
  return value === 'balance' || value === 'budget'
}

export const useSettingsStore = defineStore('settings', () => {
  const ready = ref(false)
  const onboardingDone = ref(false)
  const currency = ref('USD')
  const currencyPosition = ref<CurrencyPosition>('before')
  const heroMetric = ref<HeroMetric>('balance')
  const locale = ref<AppLocale>('en')
  const theme = ref<ThemeMode>('system')
  const resolvedTheme = ref<'light' | 'dark'>('light')

  const intlLocale = computed(() => toIntlLocale(locale.value))

  async function load() {
    await ensureSeeded()
    const rows = await db.meta.toArray()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    onboardingDone.value = map.onboardingDone === 'true'
    currency.value = map.currency ?? 'USD'
    theme.value = (map.theme as ThemeMode) ?? 'system'
    currencyPosition.value = isCurrencyPosition(map.currencyPosition)
      ? map.currencyPosition
      : 'before'
    if (!isCurrencyPosition(map.currencyPosition)) {
      await db.meta.put({ key: 'currencyPosition', value: currencyPosition.value })
    }
    heroMetric.value = isHeroMetric(map.heroMetric) ? map.heroMetric : 'balance'
    if (!isHeroMetric(map.heroMetric)) {
      await db.meta.put({ key: 'heroMetric', value: heroMetric.value })
    }
    const storedLocale = map.locale
    locale.value = isAppLocale(storedLocale) ? storedLocale : detectDefaultLocale()
    if (!isAppLocale(storedLocale)) {
      await db.meta.put({ key: 'locale', value: locale.value })
    }
    setI18nLocale(locale.value)
    applyTheme(theme.value)
    ready.value = true
  }

  function applyTheme(mode: ThemeMode) {
    theme.value = mode
    resolvedTheme.value = resolveTheme(mode)
    document.documentElement.setAttribute('data-theme', resolvedTheme.value)
    void applyStatusBar(resolvedTheme.value)
  }

  async function setTheme(mode: ThemeMode) {
    applyTheme(mode)
    await db.meta.put({ key: 'theme', value: mode })
  }

  async function setCurrency(code: string) {
    currency.value = code
    await db.meta.put({ key: 'currency', value: code })
  }

  async function setCurrencyPosition(position: CurrencyPosition) {
    currencyPosition.value = position
    await db.meta.put({ key: 'currencyPosition', value: position })
  }

  async function setHeroMetric(metric: HeroMetric) {
    heroMetric.value = metric
    await db.meta.put({ key: 'heroMetric', value: metric })
  }

  async function setLocale(code: AppLocale) {
    locale.value = code
    setI18nLocale(code)
    await db.meta.put({ key: 'locale', value: code })
  }

  async function completeOnboarding(selectedCurrency: string) {
    currency.value = selectedCurrency
    onboardingDone.value = true
    await db.meta.bulkPut([
      { key: 'currency', value: selectedCurrency },
      { key: 'onboardingDone', value: 'true' },
      { key: 'locale', value: locale.value },
      { key: 'currencyPosition', value: currencyPosition.value },
      { key: 'heroMetric', value: heroMetric.value },
    ])
    const accounts = await db.accounts.toArray()
    await Promise.all(
      accounts.map((a) => db.accounts.update(a.id, { currency: selectedCurrency })),
    )
  }

  const currencySymbol = computed(() =>
    getCurrencySymbol(currency.value, intlLocale.value),
  )

  return {
    ready,
    onboardingDone,
    currency,
    currencyPosition,
    heroMetric,
    locale,
    intlLocale,
    theme,
    resolvedTheme,
    currencySymbol,
    load,
    setTheme,
    setCurrency,
    setCurrencyPosition,
    setHeroMetric,
    setLocale,
    completeOnboarding,
    applyTheme,
  }
})
