import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { createId } from '@/lib/id'
import { nowISO, todayISO } from '@/lib/dates'
import { useAccountsStore } from '@/stores/accounts'
import type { Transaction, TransactionType } from '@/types/finance'

export interface TxInput {
  type: TransactionType
  amount: number
  accountId: string
  toAccountId?: string
  categoryId?: string
  note?: string
  date?: string
}

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function start() {
    if (sub) return
    sub = liveQuery(() => db.transactions.orderBy('date').reverse().toArray()).subscribe({
      next: (rows) => {
        // Secondary sort by createdAt for same day
        transactions.value = rows.sort((a, b) => {
          if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt)
          return b.date.localeCompare(a.date)
        })
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  const recent = computed(() => transactions.value.slice(0, 5))

  async function applyBalanceEffects(tx: Transaction, direction: 1 | -1) {
    const accounts = useAccountsStore()
    if (tx.type === 'expense') {
      await accounts.adjustBalance(tx.accountId, -tx.amount * direction)
    } else if (tx.type === 'income') {
      await accounts.adjustBalance(tx.accountId, tx.amount * direction)
    } else if (tx.type === 'transfer') {
      await accounts.adjustBalance(tx.accountId, -tx.amount * direction)
      if (tx.toAccountId) await accounts.adjustBalance(tx.toAccountId, tx.amount * direction)
    }
  }

  async function addTransaction(input: TxInput) {
    if (input.amount <= 0) throw new Error('Amount must be greater than zero')
    const tx: Transaction = {
      id: createId('tx'),
      type: input.type,
      amount: Math.round(input.amount),
      accountId: input.accountId,
      toAccountId: input.type === 'transfer' ? input.toAccountId : undefined,
      categoryId: input.type === 'transfer' ? undefined : input.categoryId,
      note: input.note?.trim() ?? '',
      date: input.date ?? todayISO(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await db.transactions.add(tx)
      await applyBalanceEffects(tx, 1)
    })
    return tx
  }

  async function updateTransaction(id: string, input: TxInput) {
    const existing = await db.transactions.get(id)
    if (!existing) throw new Error('Transaction not found')

    const next: Transaction = {
      ...existing,
      type: input.type,
      amount: Math.round(input.amount),
      accountId: input.accountId,
      toAccountId: input.type === 'transfer' ? input.toAccountId : undefined,
      categoryId: input.type === 'transfer' ? undefined : input.categoryId,
      note: input.note?.trim() ?? '',
      date: input.date ?? existing.date,
      updatedAt: nowISO(),
    }

    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await applyBalanceEffects(existing, -1)
      await db.transactions.put(next)
      await applyBalanceEffects(next, 1)
    })
    return next
  }

  async function deleteTransaction(id: string) {
    const existing = await db.transactions.get(id)
    if (!existing) return
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await applyBalanceEffects(existing, -1)
      await db.transactions.delete(id)
    })
    return existing
  }

  async function restoreTransaction(tx: Transaction) {
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      await db.transactions.put(tx)
      await applyBalanceEffects(tx, 1)
    })
    return tx
  }

  function byId(id: string) {
    return transactions.value.find((t) => t.id === id)
  }

  return {
    transactions,
    recent,
    start,
    stop,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    byId,
  }
})
