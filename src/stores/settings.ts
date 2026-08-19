import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { detectDefaultLocale, isAppLocale, setI18nLocale, toIntlLocale, type AppLocale } from '@/i18n'
import { defaultCurrencyForLocale } from '@/lib/currencies'
import { monthKey } from '@/lib/dates'
import { createId } from '@/lib/id'
import { getCurrencySymbol } from '@/lib/money'
import { applyStatusBar } from '@/services/native/chrome'
import type { CurrencyPosition, HeroMetric, PrivacyMode, ThemeMode } from '@/types/finance'

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function isCurrencyPosition(value: string | undefined | null): value is CurrencyPosition {
  return value === 'before' || value === 'after'
}

function isHeroMetric(value: string | undefined | null): value is HeroMetric {
  return value === 'balance' || value === 'budget'
}

function isPrivacyMode(value: string | undefined | null): value is PrivacyMode {
  return value === 'none' || value === 'hero' || value === 'all'
}

function privacyFromStored(map: Record<string, string>): PrivacyMode {
  if (isPrivacyMode(map.privacyMode)) return map.privacyMode
  return map.hideAmounts === 'true' ? 'all' : 'none'
}

export const useSettingsStore = defineStore('settings', () => {
  const ready = ref(false)
  const onboardingDone = ref(false)
  const currency = ref('USD')
  const currencyPosition = ref<CurrencyPosition>('before')
  const heroMetric = ref<HeroMetric>('balance')
  const privacyMode = ref<PrivacyMode>('none')
  const hideAmounts = computed(() => privacyMode.value === 'all')
  const blurHero = computed(() => privacyMode.value === 'hero')
  const locale = ref<AppLocale>('en')
  const theme = ref<ThemeMode>('system')
  const resolvedTheme = ref<'light' | 'dark'>('light')
  const lastAccountId = ref('')
  const lastToAccountId = ref('')
  const lastExpenseCategoryId = ref('')
  const lastIncomeCategoryId = ref('')
  const lastBackupAt = ref('')
  const pinEnabled = ref(false)
  const pinHash = ref('')
  const biometricEnabled = ref(false)
  const isUnlocked = ref(true)

  const intlLocale = computed(() => toIntlLocale(locale.value))

  async function hashPin(pin: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode('wdg_pin_' + pin)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  async function load() {
    const storedLocaleRow = await db.meta.get('locale')
    const localeCode = isAppLocale(storedLocaleRow?.value)
      ? storedLocaleRow.value
      : detectDefaultLocale()
    const storedCurrencyRow = await db.meta.get('currency')
    const currencyCode = storedCurrencyRow?.value || defaultCurrencyForLocale(localeCode)
    await ensureSeeded(currencyCode, localeCode)
    const rows = await db.meta.toArray()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    onboardingDone.value = map.onboardingDone === 'true'
    currency.value = map.currency ?? currencyCode
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
    privacyMode.value = privacyFromStored(map)
    lastAccountId.value = map.lastAccountId ?? ''
    lastToAccountId.value = map.lastToAccountId ?? ''
    lastExpenseCategoryId.value = map.lastExpenseCategoryId ?? ''
    lastIncomeCategoryId.value = map.lastIncomeCategoryId ?? ''
    lastBackupAt.value = map.lastBackupAt ?? ''
    pinEnabled.value = map.pinEnabled === 'true'
    pinHash.value = map.pinHash ?? ''
    biometricEnabled.value = map.biometricEnabled === 'true'
    if (pinEnabled.value && pinHash.value) {
      isUnlocked.value = false
    } else {
      isUnlocked.value = true
    }
    locale.value = localeCode
    setI18nLocale(locale.value)
    applyTheme(theme.value)
    ready.value = true
  }

  async function setPin(pinCode: string) {
    const hash = await hashPin(pinCode)
    pinEnabled.value = true
    pinHash.value = hash
    isUnlocked.value = true
    await db.meta.bulkPut([
      { key: 'pinEnabled', value: 'true' },
      { key: 'pinHash', value: hash },
    ])
  }

  async function removePin() {
    pinEnabled.value = false
    pinHash.value = ''
    biometricEnabled.value = false
    isUnlocked.value = true
    await db.meta.bulkPut([
      { key: 'pinEnabled', value: 'false' },
      { key: 'pinHash', value: '' },
      { key: 'biometricEnabled', value: 'false' },
    ])
  }

  async function verifyPin(pinCode: string): Promise<boolean> {
    if (!pinHash.value) return true
    const hash = await hashPin(pinCode)
    if (hash === pinHash.value) {
      isUnlocked.value = true
      return true
    }
    return false
  }

  async function setBiometricEnabled(val: boolean) {
    biometricEnabled.value = val
    await db.meta.put({ key: 'biometricEnabled', value: val ? 'true' : 'false' })
  }

  function unlockApp() {
    isUnlocked.value = true
  }

  function lockApp() {
    if (pinEnabled.value) {
      isUnlocked.value = false
    }
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

  async function setPrivacyMode(mode: PrivacyMode) {
    privacyMode.value = mode
    await db.meta.bulkPut([
      { key: 'privacyMode', value: mode },
      { key: 'hideAmounts', value: mode === 'all' ? 'true' : 'false' },
    ])
  }

  async function setLocale(code: AppLocale) {
    locale.value = code
    setI18nLocale(code)
    await db.meta.put({ key: 'locale', value: code })
  }

  async function rememberLastUsed(input: {
    accountId: string
    toAccountId?: string
    expenseCategoryId?: string
    incomeCategoryId?: string
  }) {
    const rows: { key: string; value: string }[] = [
      { key: 'lastAccountId', value: input.accountId },
    ]
    lastAccountId.value = input.accountId
    if (input.toAccountId) {
      lastToAccountId.value = input.toAccountId
      rows.push({ key: 'lastToAccountId', value: input.toAccountId })
    }
    if (input.expenseCategoryId) {
      lastExpenseCategoryId.value = input.expenseCategoryId
      rows.push({ key: 'lastExpenseCategoryId', value: input.expenseCategoryId })
    }
    if (input.incomeCategoryId) {
      lastIncomeCategoryId.value = input.incomeCategoryId
      rows.push({ key: 'lastIncomeCategoryId', value: input.incomeCategoryId })
    }
    await db.meta.bulkPut(rows)
  }

  async function completeOnboarding(input: {
    currency: string
    accounts?: Array<{ id: string; name: string; balance: number }>
    budgets?: Array<{ categoryId: string; limitAmount: number }>
  }) {
    const selectedCurrency = input.currency
    currency.value = selectedCurrency
    onboardingDone.value = true
    await db.meta.bulkPut([
      { key: 'currency', value: selectedCurrency },
      { key: 'onboardingDone', value: 'true' },
      { key: 'locale', value: locale.value },
      { key: 'currencyPosition', value: currencyPosition.value },
      { key: 'heroMetric', value: heroMetric.value },
      { key: 'privacyMode', value: privacyMode.value },
      { key: 'hideAmounts', value: privacyMode.value === 'all' ? 'true' : 'false' },
    ])
    const accounts = await db.accounts.toArray()
    await Promise.all(
      accounts.map((a) => {
        const patch = input.accounts?.find((row) => row.id === a.id)
        return db.accounts.update(a.id, {
          currency: selectedCurrency,
          ...(patch
            ? { name: patch.name.trim() || a.name, balance: patch.balance }
            : {}),
        })
      }),
    )
    if (input.budgets?.length) {
      const month = monthKey()
      await db.budgets.bulkAdd(
        input.budgets
          .filter((b) => b.limitAmount > 0 && b.categoryId)
          .map((b) => ({
            id: createId('bud'),
            categoryId: b.categoryId,
            month,
            limitAmount: b.limitAmount,
          })),
      )
    }
  }

  async function markBackupNow() {
    const at = new Date().toISOString()
    lastBackupAt.value = at
    await db.meta.put({ key: 'lastBackupAt', value: at })
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
    privacyMode,
    hideAmounts,
    blurHero,
    locale,
    intlLocale,
    theme,
    resolvedTheme,
    lastAccountId,
    lastToAccountId,
    lastExpenseCategoryId,
    lastIncomeCategoryId,
    lastBackupAt,
    pinEnabled,
    pinHash,
    biometricEnabled,
    isUnlocked,
    currencySymbol,
    load,
    setTheme,
    setCurrency,
    setCurrencyPosition,
    setHeroMetric,
    setPrivacyMode,
    setLocale,
    rememberLastUsed,
    completeOnboarding,
    markBackupNow,
    applyTheme,
    setPin,
    removePin,
    verifyPin,
    setBiometricEnabled,
    unlockApp,
    lockApp,
  }
})
