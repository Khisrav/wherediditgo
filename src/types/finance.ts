export type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'other'
export type CategoryKind = 'expense' | 'income'
export type TransactionType = 'expense' | 'income' | 'transfer'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  color: string
  archived: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  icon: string
  color: string
  sortOrder: number
}

export interface Budget {
  id: string
  categoryId: string
  month: string
  limitAmount: number
}

/** Savings target that is not a monthly spending limit. */
export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  color: string
  icon: string
  createdAt: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  accountId: string
  toAccountId?: string
  categoryId?: string
  note: string
  date: string
  createdAt: string
  updatedAt: string
}

/** Monthly bill or salary template that posts a normal transaction on app open. */
export interface Recurring {
  id: string
  type: 'expense' | 'income'
  amount: number
  accountId: string
  categoryId: string
  note: string
  dayOfMonth: number
  lastPostedMonth?: string
  createdAt: string
}

export type AppLocale = 'en' | 'tj' | 'ru'
export type CurrencyPosition = 'before' | 'after'
/** Home hero: account balance vs remaining category budgets */
export type HeroMetric = 'balance' | 'budget'
/** none = visible, hero = blur home balance/budget, all = hide every amount */
export type PrivacyMode = 'none' | 'hero' | 'all'

export interface AppMeta {
  onboardingDone: boolean
  currency: string
  theme: ThemeMode
  locale: AppLocale
  currencyPosition: CurrencyPosition
  heroMetric: HeroMetric
  hideAmounts: boolean
  privacyMode: PrivacyMode
}

export interface BackupPayload {
  version: 1
  exportedAt: string
  meta: AppMeta
  accounts: Account[]
  categories: Category[]
  budgets: Budget[]
  transactions: Transaction[]
  goals?: Goal[]
  recurring?: Recurring[]
}

export const BACKUP_VERSION = 1 as const
