import { createId } from '@/lib/id'
import { nowISO } from '@/lib/dates'
import en from '@/i18n/locales/en'
import ru from '@/i18n/locales/ru'
import tj from '@/i18n/locales/tj'
import type { Account, AppLocale, Category } from '@/types/finance'
import { db } from './index'

const LOCALES = { en, ru, tj } as const

type SeedMessages = (typeof en)['seed']

function seedMessages(locale: AppLocale): SeedMessages {
  return LOCALES[locale].seed as SeedMessages
}

const EXPENSE_DEFS: Array<Omit<Category, 'id' | 'name'> & { nameKey: keyof SeedMessages['categories'] }> = [
  { nameKey: 'food', kind: 'expense', icon: 'utensils', color: '#e07a5f', sortOrder: 0 },
  { nameKey: 'transport', kind: 'expense', icon: 'car', color: '#3d5a80', sortOrder: 1 },
  { nameKey: 'housing', kind: 'expense', icon: 'home', color: '#81b29a', sortOrder: 2 },
  { nameKey: 'shopping', kind: 'expense', icon: 'shopping-bag', color: '#f2cc8f', sortOrder: 3 },
  { nameKey: 'entertainment', kind: 'expense', icon: 'clapperboard', color: '#9b5de5', sortOrder: 4 },
  { nameKey: 'health', kind: 'expense', icon: 'heart-pulse', color: '#ef476f', sortOrder: 5 },
  { nameKey: 'bills', kind: 'expense', icon: 'receipt', color: '#118ab2', sortOrder: 6 },
  { nameKey: 'education', kind: 'expense', icon: 'graduation-cap', color: '#073b4c', sortOrder: 7 },
  { nameKey: 'other', kind: 'expense', icon: 'circle-ellipsis', color: '#6c757d', sortOrder: 8 },
]

const INCOME_DEFS: Array<Omit<Category, 'id' | 'name'> & { nameKey: keyof SeedMessages['categories'] }> = [
  { nameKey: 'salary', kind: 'income', icon: 'briefcase', color: '#2a9d8f', sortOrder: 0 },
  { nameKey: 'freelance', kind: 'income', icon: 'laptop', color: '#264653', sortOrder: 1 },
  { nameKey: 'gifts', kind: 'income', icon: 'gift', color: '#e9c46a', sortOrder: 2 },
  { nameKey: 'otherIncome', kind: 'income', icon: 'plus-circle', color: '#6c757d', sortOrder: 3 },
]

export async function ensureSeeded(currency = 'USD', locale: AppLocale = 'en'): Promise<void> {
  const names = seedMessages(locale)

  const catCount = await db.categories.count()
  if (catCount === 0) {
    const categories: Category[] = [...EXPENSE_DEFS, ...INCOME_DEFS].map((c) => ({
      id: createId('cat'),
      name: names.categories[c.nameKey],
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
    }))
    await db.categories.bulkAdd(categories)
  }

  const accountCount = await db.accounts.count()
  if (accountCount === 0) {
    const cash: Account = {
      id: createId('acc'),
      name: names.accounts.cash,
      type: 'cash',
      balance: 0,
      currency,
      color: '#0b6e6a',
      archived: false,
      createdAt: nowISO(),
    }
    const checking: Account = {
      id: createId('acc'),
      name: names.accounts.checking,
      type: 'checking',
      balance: 0,
      currency,
      color: '#3d5a80',
      archived: false,
      createdAt: nowISO(),
    }
    await db.accounts.bulkAdd([cash, checking])
  }

  const onboarding = await db.meta.get('onboardingDone')
  if (!onboarding) {
    await db.meta.put({ key: 'onboardingDone', value: 'false' })
  }
  const cur = await db.meta.get('currency')
  if (!cur) {
    await db.meta.put({ key: 'currency', value: currency })
  }
  const theme = await db.meta.get('theme')
  if (!theme) {
    await db.meta.put({ key: 'theme', value: 'system' })
  }
  const storedLocale = await db.meta.get('locale')
  if (!storedLocale) {
    await db.meta.put({ key: 'locale', value: locale })
  }
  const currencyPosition = await db.meta.get('currencyPosition')
  if (!currencyPosition) {
    await db.meta.put({ key: 'currencyPosition', value: 'before' })
  }
  const heroMetric = await db.meta.get('heroMetric')
  if (!heroMetric) {
    await db.meta.put({ key: 'heroMetric', value: 'balance' })
  }
  const hideAmounts = await db.meta.get('hideAmounts')
  if (!hideAmounts) {
    await db.meta.put({ key: 'hideAmounts', value: 'false' })
  }
  const privacyMode = await db.meta.get('privacyMode')
  if (!privacyMode) {
    await db.meta.put({
      key: 'privacyMode',
      value: hideAmounts?.value === 'true' ? 'all' : 'none',
    })
  }
}
