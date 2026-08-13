import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { createId } from '@/lib/id'
import { nowISO } from '@/lib/dates'
import type { Account, AccountType } from '@/types/finance'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function start() {
    if (sub) return
    sub = liveQuery(() => db.accounts.toArray()).subscribe({
      next: (rows) => {
        accounts.value = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  const active = computed(() => accounts.value.filter((a) => !a.archived))
  const totalBalance = computed(() =>
    active.value.reduce((s, a) => {
      // Credit balances are liabilities — subtract
      if (a.type === 'credit') return s - a.balance
      return s + a.balance
    }, 0),
  )

  async function addAccount(input: {
    name: string
    type: AccountType
    balance?: number
    color?: string
    currency: string
  }) {
    const account: Account = {
      id: createId('acc'),
      name: input.name.trim(),
      type: input.type,
      balance: input.balance ?? 0,
      currency: input.currency,
      color: input.color ?? '#0b6e6a',
      archived: false,
      createdAt: nowISO(),
    }
    await db.accounts.add(account)
    return account
  }

  async function updateAccount(id: string, patch: Partial<Account>) {
    await db.accounts.update(id, patch)
  }

  async function adjustBalance(id: string, delta: number) {
    const acc = await db.accounts.get(id)
    if (!acc) return
    await db.accounts.update(id, { balance: acc.balance + delta })
  }

  async function setBalance(id: string, balance: number) {
    await db.accounts.update(id, { balance })
  }

  async function archiveAccount(id: string) {
    await db.accounts.update(id, { archived: true })
  }

  function byId(id: string) {
    return accounts.value.find((a) => a.id === id)
  }

  return {
    accounts,
    active,
    totalBalance,
    start,
    stop,
    addAccount,
    updateAccount,
    adjustBalance,
    setBalance,
    archiveAccount,
    byId,
  }
})
