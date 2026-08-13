import { defineStore } from 'pinia'
import { ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { createId } from '@/lib/id'
import { monthKey } from '@/lib/dates'
import type { Budget } from '@/types/finance'

export const useBudgetsStore = defineStore('budgets', () => {
  const budgets = ref<Budget[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function start() {
    if (sub) return
    sub = liveQuery(() => db.budgets.toArray()).subscribe({
      next: (rows) => {
        budgets.value = rows
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  function forMonth(month = monthKey()) {
    return budgets.value.filter((b) => b.month === month)
  }

  async function upsertBudget(categoryId: string, limitAmount: number, month = monthKey()) {
    const existing = budgets.value.find((b) => b.categoryId === categoryId && b.month === month)
    if (existing) {
      if (limitAmount <= 0) {
        await db.budgets.delete(existing.id)
        return null
      }
      await db.budgets.update(existing.id, { limitAmount })
      return { ...existing, limitAmount }
    }
    if (limitAmount <= 0) return null
    const budget: Budget = {
      id: createId('bud'),
      categoryId,
      month,
      limitAmount,
    }
    await db.budgets.add(budget)
    return budget
  }

  async function removeBudget(id: string) {
    await db.budgets.delete(id)
  }

  return {
    budgets,
    start,
    stop,
    forMonth,
    upsertBudget,
    removeBudget,
  }
})
