import { format } from 'date-fns'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { db } from '@/db'
import { isNative } from '@/lib/platform'
import type { AppMeta, BackupPayload } from '@/types/finance'
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
  }
}

export async function buildBackup(): Promise<BackupPayload> {
  const [accounts, categories, budgets, transactions, meta] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.transactions.toArray(),
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
  }
}

export function validateBackup(data: unknown): BackupPayload {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file')
  const payload = data as BackupPayload
  if (payload.version !== BACKUP_VERSION) throw new Error(`Unsupported backup version: ${String(payload.version)}`)
  if (!Array.isArray(payload.accounts) || !Array.isArray(payload.categories)) {
    throw new Error('Backup is missing required data')
  }
  if (!Array.isArray(payload.budgets) || !Array.isArray(payload.transactions)) {
    throw new Error('Backup is missing required data')
  }
  return payload
}

export async function replaceFromBackup(payload: BackupPayload): Promise<void> {
  await db.transaction('rw', db.accounts, db.categories, db.budgets, db.transactions, db.meta, async () => {
    await Promise.all([
      db.accounts.clear(),
      db.categories.clear(),
      db.budgets.clear(),
      db.transactions.clear(),
      db.meta.clear(),
    ])
    await db.accounts.bulkAdd(payload.accounts)
    await db.categories.bulkAdd(payload.categories)
    await db.budgets.bulkAdd(payload.budgets)
    await db.transactions.bulkAdd(payload.transactions)
    await db.meta.bulkPut([
      { key: 'onboardingDone', value: payload.meta.onboardingDone ? 'true' : 'false' },
      { key: 'currency', value: payload.meta.currency },
      { key: 'theme', value: payload.meta.theme },
      { key: 'locale', value: payload.meta.locale ?? 'en' },
      {
        key: 'currencyPosition',
        value: payload.meta.currencyPosition === 'after' ? 'after' : 'before',
      },
      {
        key: 'heroMetric',
        value: payload.meta.heroMetric === 'budget' ? 'budget' : 'balance',
      },
    ])
  })
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
    return
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
