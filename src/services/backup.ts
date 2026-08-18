import { format } from 'date-fns'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { db } from '@/db'
import { isNative } from '@/lib/platform'
import type {
  Account,
  AccountType,
  AppMeta,
  BackupPayload,
  Budget,
  Category,
  CategoryKind,
  Goal,
  Recurring,
  Transaction,
  TransactionType,
} from '@/types/finance'
import { BACKUP_VERSION } from '@/types/finance'

async function readMeta(): Promise<AppMeta> {
  const rows = await db.meta.toArray()
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const locale = map.locale
  return {
    onboardingDone: map.onboardingDone === 'true',
    currency: map.currency ?? 'USD',
    theme: (map.theme as AppMeta['theme']) ?? 'system',
    locale: locale === 'tj' || locale === 'ru' || locale === 'en' ? locale : 'en',
    currencyPosition: map.currencyPosition === 'after' ? 'after' : 'before',
    heroMetric: map.heroMetric === 'budget' ? 'budget' : 'balance',
    hideAmounts: map.hideAmounts === 'true' || map.privacyMode === 'all',
    privacyMode:
      map.privacyMode === 'hero' || map.privacyMode === 'all' || map.privacyMode === 'none'
        ? map.privacyMode
        : map.hideAmounts === 'true'
          ? 'all'
          : 'none',
    lastBackupAt: map.lastBackupAt || undefined,
  }
}

export async function buildBackup(): Promise<BackupPayload> {
  const [accounts, categories, budgets, transactions, goals, recurring, meta] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.transactions.toArray(),
    db.goals.toArray(),
    db.recurring.toArray(),
    readMeta(),
  ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    meta,
    accounts,
    categories,
    budgets,
    transactions,
    goals,
    recurring,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

/** IndexedDB cannot clone Vue proxies or `undefined` fields. */
function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const ACCOUNT_TYPES: AccountType[] = ['cash', 'checking', 'savings', 'credit', 'other']
const TX_TYPES: TransactionType[] = ['expense', 'income', 'transfer']
const CAT_KINDS: CategoryKind[] = ['expense', 'income']

function sanitizeAccount(value: unknown): Account | null {
  const r = asRecord(value)
  const id = str(r?.id)
  if (!r || !id) return null
  const type = ACCOUNT_TYPES.includes(r.type as AccountType) ? (r.type as AccountType) : 'other'
  return {
    id,
    name: str(r.name, 'Account'),
    type,
    balance: Math.round(num(r.balance)),
    currency: str(r.currency, 'USD'),
    color: str(r.color, '#0b6e6a'),
    archived: bool(r.archived),
    createdAt: str(r.createdAt, new Date().toISOString()),
  }
}

function sanitizeCategory(value: unknown): Category | null {
  const r = asRecord(value)
  const id = str(r?.id)
  if (!r || !id) return null
  const kind = CAT_KINDS.includes(r.kind as CategoryKind) ? (r.kind as CategoryKind) : 'expense'
  return {
    id,
    name: str(r.name, 'Category'),
    kind,
    icon: str(r.icon, 'circle'),
    color: str(r.color, '#6c757d'),
    sortOrder: Math.round(num(r.sortOrder)),
  }
}

function sanitizeBudget(value: unknown): Budget | null {
  const r = asRecord(value)
  const id = str(r?.id)
  const categoryId = str(r?.categoryId)
  if (!r || !id || !categoryId) return null
  return {
    id,
    categoryId,
    month: str(r.month),
    limitAmount: Math.round(num(r.limitAmount)),
  }
}

function sanitizeTransaction(value: unknown): Transaction | null {
  const r = asRecord(value)
  const id = str(r?.id)
  const accountId = str(r?.accountId)
  if (!r || !id || !accountId) return null
  const type = TX_TYPES.includes(r.type as TransactionType) ? (r.type as TransactionType) : 'expense'
  const toAccountId = str(r.toAccountId)
  const categoryId = str(r.categoryId)
  const now = new Date().toISOString()
  return {
    id,
    type,
    amount: Math.round(Math.abs(num(r.amount))),
    accountId,
    ...(type === 'transfer' && toAccountId ? { toAccountId } : {}),
    ...(type !== 'transfer' && categoryId ? { categoryId } : {}),
    note: str(r.note),
    date: str(r.date, str(r.createdAt, now).slice(0, 10)),
    createdAt: str(r.createdAt, now),
    updatedAt: str(r.updatedAt, str(r.createdAt, now)),
  }
}

function sanitizeGoal(value: unknown): Goal | null {
  const r = asRecord(value)
  const id = str(r?.id)
  if (!r || !id) return null
  const deadline = str(r.deadline)
  return {
    id,
    name: str(r.name, 'Goal'),
    targetAmount: Math.round(num(r.targetAmount)),
    currentAmount: Math.round(num(r.currentAmount)),
    ...(deadline ? { deadline } : {}),
    color: str(r.color, '#0b6e6a'),
    icon: str(r.icon, 'piggy-bank'),
    createdAt: str(r.createdAt, new Date().toISOString()),
  }
}

function sanitizeRecurring(value: unknown): Recurring | null {
  const r = asRecord(value)
  const id = str(r?.id)
  const accountId = str(r?.accountId)
  const categoryId = str(r?.categoryId)
  if (!r || !id || !accountId || !categoryId) return null
  const type = r.type === 'income' ? 'income' : 'expense'
  const lastPostedMonth = str(r.lastPostedMonth)
  return {
    id,
    type,
    amount: Math.round(Math.abs(num(r.amount))),
    accountId,
    categoryId,
    note: str(r.note),
    dayOfMonth: Math.min(28, Math.max(1, Math.round(num(r.dayOfMonth, 1)))),
    ...(lastPostedMonth ? { lastPostedMonth } : {}),
    createdAt: str(r.createdAt, new Date().toISOString()),
  }
}

function sanitizeMeta(value: unknown): AppMeta {
  const r = asRecord(value) ?? {}
  const locale = r.locale
  return {
    onboardingDone: bool(r.onboardingDone, true),
    currency: str(r.currency, 'USD'),
    theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'system' ? r.theme : 'system',
    locale: locale === 'tj' || locale === 'ru' || locale === 'en' ? locale : 'en',
    currencyPosition: r.currencyPosition === 'after' ? 'after' : 'before',
    heroMetric: r.heroMetric === 'budget' ? 'budget' : 'balance',
    hideAmounts: bool(r.hideAmounts) || r.privacyMode === 'all',
    privacyMode:
      r.privacyMode === 'hero' || r.privacyMode === 'all' || r.privacyMode === 'none'
        ? r.privacyMode
        : r.hideAmounts === true
          ? 'all'
          : 'none',
    ...(str(r.lastBackupAt) ? { lastBackupAt: str(r.lastBackupAt) } : {}),
  }
}

export function validateBackup(data: unknown): BackupPayload {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file')
  const raw = data as Record<string, unknown>
  const version = raw.version
  if (version != null && version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${String(version)}`)
  }
  if (!Array.isArray(raw.accounts) || !Array.isArray(raw.categories)) {
    throw new Error('Backup is missing required data')
  }
  if (!Array.isArray(raw.budgets) || !Array.isArray(raw.transactions)) {
    throw new Error('Backup is missing required data')
  }
  const accounts = raw.accounts.map(sanitizeAccount).filter((row): row is Account => row !== null)
  const categories = raw.categories.map(sanitizeCategory).filter((row): row is Category => row !== null)
  if (!accounts.length || !categories.length) {
    throw new Error('Backup is missing required data')
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: str(raw.exportedAt, new Date().toISOString()),
    meta: sanitizeMeta(raw.meta),
    accounts,
    categories,
    budgets: raw.budgets.map(sanitizeBudget).filter((row): row is Budget => row !== null),
    transactions: raw.transactions
      .map(sanitizeTransaction)
      .filter((row): row is Transaction => row !== null),
    goals: Array.isArray(raw.goals)
      ? raw.goals.map(sanitizeGoal).filter((row): row is Goal => row !== null)
      : [],
    recurring: Array.isArray(raw.recurring)
      ? raw.recurring.map(sanitizeRecurring).filter((row): row is Recurring => row !== null)
      : [],
  }
}

export async function replaceFromBackup(payload: BackupPayload): Promise<void> {
  const data = clonePlain(validateBackup(payload))
  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.budgets, db.transactions, db.goals, db.recurring, db.meta],
    async () => {
    await Promise.all([
      db.accounts.clear(),
      db.categories.clear(),
      db.budgets.clear(),
      db.transactions.clear(),
      db.goals.clear(),
      db.recurring.clear(),
      db.meta.clear(),
    ])
    await db.accounts.bulkAdd(data.accounts)
    await db.categories.bulkAdd(data.categories)
    await db.budgets.bulkAdd(data.budgets)
    await db.transactions.bulkAdd(data.transactions)
    if (data.goals?.length) await db.goals.bulkAdd(data.goals)
    if (data.recurring?.length) await db.recurring.bulkAdd(data.recurring)
    await db.meta.bulkPut([
      { key: 'onboardingDone', value: data.meta.onboardingDone ? 'true' : 'false' },
      { key: 'currency', value: data.meta.currency },
      { key: 'theme', value: data.meta.theme },
      { key: 'locale', value: data.meta.locale },
      { key: 'currencyPosition', value: data.meta.currencyPosition },
      { key: 'heroMetric', value: data.meta.heroMetric },
      {
        key: 'hideAmounts',
        value: data.meta.privacyMode === 'all' || data.meta.hideAmounts ? 'true' : 'false',
      },
      { key: 'privacyMode', value: data.meta.privacyMode },
      ...(data.meta.lastBackupAt
        ? [{ key: 'lastBackupAt', value: data.meta.lastBackupAt }]
        : []),
    ])
  })
}

async function upsertById<T extends { id: string }>(
  table: { bulkPut: (items: T[]) => Promise<unknown> },
  rows: T[] | undefined,
) {
  if (!rows?.length) return
  await table.bulkPut(rows)
}

/** Merge backup rows by id. Does not clear existing data or overwrite app settings. */
export async function mergeFromBackup(payload: BackupPayload): Promise<void> {
  const data = clonePlain(validateBackup(payload))
  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.budgets, db.transactions, db.goals, db.recurring],
    async () => {
      await upsertById(db.accounts, data.accounts)
      await upsertById(db.categories, data.categories)
      await upsertById(db.budgets, data.budgets)
      await upsertById(db.transactions, data.transactions)
      await upsertById(db.goals, data.goals)
      await upsertById(db.recurring, data.recurring)
    },
  )
}

export async function markBackupExported(at = new Date().toISOString()): Promise<void> {
  await db.meta.put({ key: 'lastBackupAt', value: at })
}

export async function exportBackupFile(): Promise<void> {
  const backup = await buildBackup()
  const json = JSON.stringify(backup, null, 2)
  const filename = `wherediditgo-backup-${format(new Date(), 'yyyyMMdd')}.json`

  if (isNative()) {
    await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const uri = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
    await Share.share({
      title: 'WhereDidItGo backup',
      url: uri.uri,
      dialogTitle: 'Export backup',
    })
    await markBackupExported()
    return
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  await markBackupExported()
}

export async function exportTransactionsCsv(): Promise<void> {
  const [txs, categories, accounts] = await Promise.all([
    db.transactions.orderBy('date').reverse().toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
  ])
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]))

  const header = 'date,type,amount,category,account,to_account,note'
  const lines = txs.map((t) => {
    const amount = (t.amount / 100).toFixed(2)
    const cells = [
      t.date,
      t.type,
      amount,
      t.categoryId ? catMap[t.categoryId] ?? '' : '',
      accMap[t.accountId] ?? '',
      t.toAccountId ? accMap[t.toAccountId] ?? '' : '',
      `"${(t.note ?? '').replaceAll('"', '""')}"`,
    ]
    return cells.join(',')
  })
  const csv = [header, ...lines].join('\n')
  const filename = `wherediditgo-transactions-${format(new Date(), 'yyyyMMdd')}.csv`

  if (isNative()) {
    await Filesystem.writeFile({
      path: filename,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const uri = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
    await Share.share({
      title: 'Transactions CSV',
      url: uri.uri,
      dialogTitle: 'Export CSV',
    })
    return
  }

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackupJson(text: string): BackupPayload {
  return validateBackup(JSON.parse(text) as unknown)
}
