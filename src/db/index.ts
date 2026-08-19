import Dexie, { type EntityTable } from 'dexie'
import type { Account, Budget, Category, Debt, Goal, Recurring, Transaction } from '@/types/finance'

export interface MetaRow {
  key: string
  value: string
}

class FinanceDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  categories!: EntityTable<Category, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  goals!: EntityTable<Goal, 'id'>
  recurring!: EntityTable<Recurring, 'id'>
  debts!: EntityTable<Debt, 'id'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor() {
    super('wherediditgo')
    this.version(1).stores({
      accounts: 'id, type, archived',
      categories: 'id, kind, sortOrder',
      budgets: 'id, categoryId, month, [categoryId+month]',
      transactions: 'id, type, accountId, categoryId, date, createdAt',
      meta: 'key',
    })
    this.version(2).stores({
      goals: 'id, createdAt',
    })
    this.version(3).stores({
      recurring: 'id, type, accountId, categoryId',
    })
    this.version(4).stores({
      debts: 'id, type, personName, status, createdAt',
    })
  }
}

export const db = new FinanceDB()

export async function resetLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.budgets, db.transactions, db.goals, db.recurring, db.debts, db.meta],
    async () => {
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.transactions.clear(),
        db.goals.clear(),
        db.recurring.clear(),
        db.debts.clear(),
        db.meta.clear(),
      ])
    },
  )
}

