import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { applyStatusBar } from '@/services/native/chrome'
import type { ThemeMode } from '@/types/finance'

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export const useSettingsStore = defineStore('settings', () => {
  const ready = ref(false)
  const onboardingDone = ref(false)
  const currency = ref('USD')
  const theme = ref<ThemeMode>('system')
  const resolvedTheme = ref<'light' | 'dark'>('light')

  async function load() {
    await ensureSeeded()
    const rows = await db.meta.toArray()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    onboardingDone.value = map.onboardingDone === 'true'
    currency.value = map.currency ?? 'USD'
    theme.value = (map.theme as ThemeMode) ?? 'system'
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

  async function completeOnboarding(selectedCurrency: string) {
    currency.value = selectedCurrency
    onboardingDone.value = true
    await db.meta.bulkPut([
      { key: 'currency', value: selectedCurrency },
      { key: 'onboardingDone', value: 'true' },
    ])
    // Update account currencies
    const accounts = await db.accounts.toArray()
    await Promise.all(
      accounts.map((a) => db.accounts.update(a.id, { currency: selectedCurrency })),
    )
  }

  const currencySymbol = computed(() => {
    try {
      return (
        new Intl.NumberFormat(navigator.language, {
          style: 'currency',
          currency: currency.value,
        })
          .formatToParts(0)
          .find((p) => p.type === 'currency')?.value ?? currency.value
      )
    } catch {
      return currency.value
    }
  })

  return {
    ready,
    onboardingDone,
    currency,
    theme,
    resolvedTheme,
    currencySymbol,
    load,
    setTheme,
    setCurrency,
    completeOnboarding,
    applyTheme,
  }
})
