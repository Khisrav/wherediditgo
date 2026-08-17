import { defineStore } from 'pinia'
import { ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { nowISO } from '@/lib/dates'
import { createId } from '@/lib/id'
import { useTransactionsStore } from '@/stores/transactions'
import type { Goal } from '@/types/finance'

export interface GoalInput {
  name: string
  targetAmount: number
  currentAmount?: number
  deadline?: string
  color?: string
  icon?: string
}

export const useGoalsStore = defineStore('goals', () => {
  const goals = ref<Goal[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function start() {
    if (sub) return
    sub = liveQuery(() => db.goals.toArray()).subscribe({
      next: (rows) => {
        goals.value = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  async function addGoal(input: GoalInput) {
    const goal: Goal = {
      id: createId('goal'),
      name: input.name.trim(),
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount ?? 0,
      deadline: input.deadline || undefined,
      color: input.color ?? '#0b6e6a',
      icon: input.icon ?? 'piggy-bank',
      createdAt: nowISO(),
    }
    await db.goals.add(goal)
    return goal
  }

  async function addToGoal(id: string, amount: number, fromAccountId: string) {
    if (amount <= 0) return null
    const goal = await db.goals.get(id)
    if (!goal) return null
    const account = await db.accounts.get(fromAccountId)
    if (!account || account.archived) return null

    const transactions = useTransactionsStore()
    await db.transaction('rw', db.transactions, db.accounts, db.goals, async () => {
      await transactions.addTransaction({
        type: 'transfer',
        amount,
        accountId: fromAccountId,
        note: goal.name,
      })
      await db.goals.update(id, { currentAmount: goal.currentAmount + amount })
    })
    return { ...goal, currentAmount: goal.currentAmount + amount }
  }

  async function updateGoal(id: string, patch: Partial<Goal>) {
    await db.goals.update(id, patch)
  }

  async function removeGoal(id: string) {
    await db.goals.delete(id)
  }

  function byId(id: string) {
    return goals.value.find((g) => g.id === id)
  }

  return {
    goals,
    start,
    stop,
    addGoal,
    addToGoal,
    updateGoal,
    removeGoal,
    byId,
  }
})
