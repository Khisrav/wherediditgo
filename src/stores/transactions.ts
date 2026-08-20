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

  async function signedFlowDelta(accountId: string, flow: 'in' | 'out', amount: number) {
    const acc = await db.accounts.get(accountId)
    const isCredit = acc?.type === 'credit'
    // Assets: in +, out −. Credit `balance` is amount owed: spend/advance +, payment −.
    if (isCredit) return flow === 'out' ? amount : -amount
    return flow === 'out' ? -amount : amount
  }

  async function applyBalanceEffects(tx: Transaction, direction: 1 | -1) {
    const accounts = useAccountsStore()
    if (tx.type === 'expense') {
      const delta = await signedFlowDelta(tx.accountId, 'out', tx.amount)
      await accounts.adjustBalance(tx.accountId, delta * direction)
    } else if (tx.type === 'income') {
      const delta = await signedFlowDelta(tx.accountId, 'in', tx.amount)
      await accounts.adjustBalance(tx.accountId, delta * direction)
    } else if (tx.type === 'transfer') {
      const fromDelta = await signedFlowDelta(tx.accountId, 'out', tx.amount)
      await accounts.adjustBalance(tx.accountId, fromDelta * direction)
      if (tx.toAccountId) {
        const toDelta = await signedFlowDelta(tx.toAccountId, 'in', tx.amount)
        await accounts.adjustBalance(tx.toAccountId, toDelta * direction)
      }
    }
  }

  async function addTransaction(input: TxInput) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Amount must be a valid positive number')
    }
    if (!input.accountId) {
      throw new Error('Account is required')
    }
    if (input.type === 'transfer' && input.toAccountId && input.accountId === input.toAccountId) {
      throw new Error('Source and destination accounts must be different')
    }
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
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Amount must be a valid positive number')
    }
    if (!input.accountId) {
      throw new Error('Account is required')
    }
    if (input.type === 'transfer' && input.toAccountId && input.accountId === input.toAccountId) {
      throw new Error('Source and destination accounts must be different')
    }
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
