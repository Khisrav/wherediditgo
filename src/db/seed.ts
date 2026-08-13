import { createId } from '@/lib/id'
import { nowISO } from '@/lib/dates'
import type { Account, Category } from '@/types/finance'
import { db } from './index'

const EXPENSE_CATEGORIES: Array<Omit<Category, 'id'>> = [
  { name: 'Food & Drink', kind: 'expense', icon: 'utensils', color: '#e07a5f', sortOrder: 0 },
  { name: 'Transport', kind: 'expense', icon: 'car', color: '#3d5a80', sortOrder: 1 },
  { name: 'Housing', kind: 'expense', icon: 'home', color: '#81b29a', sortOrder: 2 },
  { name: 'Shopping', kind: 'expense', icon: 'shopping-bag', color: '#f2cc8f', sortOrder: 3 },
  { name: 'Entertainment', kind: 'expense', icon: 'clapperboard', color: '#9b5de5', sortOrder: 4 },
  { name: 'Health', kind: 'expense', icon: 'heart-pulse', color: '#ef476f', sortOrder: 5 },
  { name: 'Bills', kind: 'expense', icon: 'receipt', color: '#118ab2', sortOrder: 6 },
  { name: 'Education', kind: 'expense', icon: 'graduation-cap', color: '#073b4c', sortOrder: 7 },
  { name: 'Other', kind: 'expense', icon: 'circle-ellipsis', color: '#6c757d', sortOrder: 8 },
]

const INCOME_CATEGORIES: Array<Omit<Category, 'id'>> = [
  { name: 'Salary', kind: 'income', icon: 'briefcase', color: '#2a9d8f', sortOrder: 0 },
  { name: 'Freelance', kind: 'income', icon: 'laptop', color: '#264653', sortOrder: 1 },
  { name: 'Gifts', kind: 'income', icon: 'gift', color: '#e9c46a', sortOrder: 2 },
  { name: 'Other income', kind: 'income', icon: 'plus-circle', color: '#6c757d', sortOrder: 3 },
]

export async function ensureSeeded(currency = 'USD'): Promise<void> {
  const catCount = await db.categories.count()
  if (catCount === 0) {
    const categories: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => ({
      ...c,
      id: createId('cat'),
    }))
    await db.categories.bulkAdd(categories)
  }

  const accountCount = await db.accounts.count()
  if (accountCount === 0) {
    const cash: Account = {
      id: createId('acc'),
      name: 'Cash',
      type: 'cash',
      balance: 0,
      currency,
      color: '#0b6e6a',
      archived: false,
      createdAt: nowISO(),
    }
    const checking: Account = {
      id: createId('acc'),
      name: 'Checking',
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
}
