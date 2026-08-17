import { defineStore } from 'pinia'
import { ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { clampDayOfMonth, monthKey, nowISO, todayISO } from '@/lib/dates'
import { createId } from '@/lib/id'
import { useTransactionsStore } from '@/stores/transactions'
import type { Recurring } from '@/types/finance'

export interface RecurringInput {
  type: 'expense' | 'income'
  amount: number
  accountId: string
  categoryId: string
  note?: string
  dayOfMonth: number
  lastPostedMonth?: string
}

export const useRecurringStore = defineStore('recurring', () => {
  const items = ref<Recurring[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function start() {
    if (sub) return
    sub = liveQuery(() => db.recurring.toArray()).subscribe({
      next: (rows) => {
        items.value = rows.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.createdAt.localeCompare(b.createdAt))
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  async function addRecurring(input: RecurringInput) {
    if (input.amount <= 0) throw new Error('Amount must be greater than zero')
    const row: Recurring = {
      id: createId('rec'),
      type: input.type,
      amount: Math.round(input.amount),
      accountId: input.accountId,
      categoryId: input.categoryId,
      note: input.note?.trim() ?? '',
      dayOfMonth: clampDayOfMonth(input.dayOfMonth),
      lastPostedMonth: input.lastPostedMonth ?? monthKey(),
      createdAt: nowISO(),
    }
    await db.recurring.add(row)
    return row
  }

  async function removeRecurring(id: string) {
    await db.recurring.delete(id)
  }

  async function postDue() {
    const current = monthKey()
    const today = new Date().getDate()
    const rows = await db.recurring.toArray()
    const transactions = useTransactionsStore()

    for (const row of rows) {
      if (row.lastPostedMonth === current) continue
      if (current < monthKey(row.createdAt)) continue
      if (today < row.dayOfMonth) continue

      const account = await db.accounts.get(row.accountId)
      if (!account || account.archived) continue
      const category = await db.categories.get(row.categoryId)
      if (!category || category.kind !== row.type) continue

      try {
        await transactions.addTransaction({
          type: row.type,
          amount: row.amount,
          accountId: row.accountId,
          categoryId: row.categoryId,
          note: row.note,
          date: todayISO(),
        })
        await db.recurring.update(row.id, { lastPostedMonth: current })
      } catch {
        // Leave lastPostedMonth unset so the next open can retry.
      }
    }
  }

  return {
    items,
    start,
    stop,
    addRecurring,
    removeRecurring,
    postDue,
  }
})
