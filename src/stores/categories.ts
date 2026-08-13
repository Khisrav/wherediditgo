import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '@/db'
import { createId } from '@/lib/id'
import type { Category, CategoryKind } from '@/types/finance'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function start() {
    if (sub) return
    sub = liveQuery(() => db.categories.orderBy('sortOrder').toArray()).subscribe({
      next: (rows) => {
        categories.value = rows
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  const expense = computed(() => categories.value.filter((c) => c.kind === 'expense'))
  const income = computed(() => categories.value.filter((c) => c.kind === 'income'))

  async function addCategory(input: {
    name: string
    kind: CategoryKind
    icon?: string
    color?: string
  }) {
    const list = input.kind === 'expense' ? expense.value : income.value
    const category: Category = {
      id: createId('cat'),
      name: input.name.trim(),
      kind: input.kind,
      icon: input.icon ?? 'circle',
      color: input.color ?? '#6c757d',
      sortOrder: list.length,
    }
    await db.categories.add(category)
    return category
  }

  async function updateCategory(id: string, patch: Partial<Category>) {
    await db.categories.update(id, patch)
  }

  async function removeCategory(id: string) {
    await db.categories.delete(id)
  }

  function byId(id: string) {
    return categories.value.find((c) => c.id === id)
  }

  return {
    categories,
    expense,
    income,
    start,
    stop,
    addCategory,
    updateCategory,
    removeCategory,
    byId,
  }
})
