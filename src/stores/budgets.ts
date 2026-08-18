import { defineStore } from 'pinia'
import { ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { createId } from '@/lib/id'
import { monthKey, previousMonthKey } from '@/lib/dates'
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
    const existing =
      budgets.value.find((b) => b.categoryId === categoryId && b.month === month) ??
      (await db.budgets.where('[categoryId+month]').equals([categoryId, month]).first())
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

  async function copyMonth(fromMonth: string, toMonth: string) {
    if (fromMonth === toMonth) return []
    const source = await db.budgets.where('month').equals(fromMonth).toArray()
    const created: Budget[] = []
    for (const row of source) {
      const next = await upsertBudget(row.categoryId, row.limitAmount, toMonth)
      if (next) created.push(next)
    }
    return created
  }

  async function clearMonth(month: string) {
    const rows = await db.budgets.where('month').equals(month).toArray()
    if (!rows.length) return
    await db.budgets.bulkDelete(rows.map((b) => b.id))
  }

  async function carryForwardIfNeeded(month = monthKey()): Promise<'copied' | 'none'> {
    const existingCount = await db.budgets.where('month').equals(month).count()
    if (existingCount) return 'none'
    const prev = previousMonthKey(month)
    const sourceCount = await db.budgets.where('month').equals(prev).count()
    if (!sourceCount) return 'none'
    const skipped = await db.meta.get(`budgetCopySkipped:${month}`)
    if (skipped?.value === 'true') return 'none'
    await copyMonth(prev, month)
    await db.meta.put({ key: `budgetAutoCopied:${month}`, value: 'true' })
    return 'copied'
  }

  async function skipCarry(month: string) {
    await db.meta.put({ key: `budgetCopySkipped:${month}`, value: 'true' })
  }

  return {
    budgets,
    start,
    stop,
    forMonth,
    upsertBudget,
    removeBudget,
    copyMonth,
    clearMonth,
    carryForwardIfNeeded,
    skipCarry,
  }
})
