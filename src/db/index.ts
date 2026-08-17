import Dexie, { type EntityTable } from 'dexie'
import type { Account, Budget, Category, Goal, Transaction } from '@/types/finance'

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
  }
}

export const db = new FinanceDB()
