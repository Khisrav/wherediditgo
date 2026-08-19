import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import { createId } from '@/lib/id'
import type { Debt, DebtStatus, DebtType } from '@/types/finance'

export const useDebtsStore = defineStore('debts', () => {
  const ready = ref(false)
  const debts = ref<Debt[]>([])

  const activeDebts = computed(() => debts.value.filter((d) => d.status === 'active'))
  const settledDebts = computed(() => debts.value.filter((d) => d.status === 'settled'))

  const totalLent = computed(() =>
    activeDebts.value
      .filter((d) => d.type === 'lent')
      .reduce((sum, d) => sum + Math.max(0, d.amount - d.paidAmount), 0),
  )

  const totalBorrowed = computed(() =>
    activeDebts.value
      .filter((d) => d.type === 'borrowed')
      .reduce((sum, d) => sum + Math.max(0, d.amount - d.paidAmount), 0),
  )

  const netDebt = computed(() => totalLent.value - totalBorrowed.value)

  async function load() {
    const list = await db.debts.toArray()
    debts.value = list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    ready.value = true
  }

  async function addDebt(input: {
    type: DebtType
    personName: string
    amount: number
    dueDate?: string
    note?: string
  }) {
    const now = new Date().toISOString()
    const item: Debt = {
      id: createId('debt'),
      type: input.type,
      personName: input.personName.trim(),
      amount: Math.abs(input.amount),
      paidAmount: 0,
      status: 'active',
      dueDate: input.dueDate || undefined,
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    await db.debts.add(item)
    debts.value.unshift(item)
    return item
  }

  async function recordPayment(id: string, paymentAmount: number) {
    const idx = debts.value.findIndex((d) => d.id === id)
    if (idx === -1) return
    const target = debts.value[idx]
    const newPaid = Math.min(target.amount, target.paidAmount + Math.abs(paymentAmount))
    const newStatus: DebtStatus = newPaid >= target.amount ? 'settled' : 'active'
    const now = new Date().toISOString()

    await db.debts.update(id, {
      paidAmount: newPaid,
      status: newStatus,
      updatedAt: now,
    })

    debts.value[idx] = {
      ...target,
      paidAmount: newPaid,
      status: newStatus,
      updatedAt: now,
    }
  }

  async function deleteDebt(id: string) {
    await db.debts.delete(id)
    debts.value = debts.value.filter((d) => d.id !== id)
  }

  return {
    ready,
    debts,
    activeDebts,
    settledDebts,
    totalLent,
    totalBorrowed,
    netDebt,
    load,
    addDebt,
    recordPayment,
    deleteDebt,
  }
})
