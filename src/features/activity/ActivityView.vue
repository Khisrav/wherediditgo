<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, Trash2 } from '@lucide/vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { monthKey, monthLabel } from '@/lib/dates'
import { useCategoriesStore } from '@/stores/categories'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import type { TransactionType } from '@/types/finance'

const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const ui = useUiStore()

const query = ref('')
const month = ref(monthKey())
const typeFilter = ref<'all' | TransactionType>('all')
const categoryFilter = ref('all')

const months = computed(() => {
  const set = new Set(transactions.transactions.map((t) => t.date.slice(0, 7)))
  set.add(monthKey())
  return [...set].sort().reverse()
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return transactions.transactions.filter((t) => {
    if (month.value && !t.date.startsWith(month.value)) return false
    if (typeFilter.value !== 'all' && t.type !== typeFilter.value) return false
    if (categoryFilter.value !== 'all' && t.categoryId !== categoryFilter.value) return false
    if (!q) return true
    const cat = t.categoryId ? categories.byId(t.categoryId)?.name ?? '' : ''
    return (
      t.note.toLowerCase().includes(q) ||
      cat.toLowerCase().includes(q) ||
      t.type.includes(q)
    )
  })
})

async function remove(id: string) {
  const ok = window.confirm('Delete this transaction? This updates your account balance.')
  if (!ok) return
  await transactions.deleteTransaction(id)
}
</script>

<template>
  <div class="activity">
    <header>
      <h1>Activity</h1>
      <p class="sub">{{ filtered.length }} transactions</p>
    </header>

    <div class="filters">
      <label class="search">
        <Search :size="18" aria-hidden="true" />
        <input v-model="query" type="search" placeholder="Search notes or categories" />
      </label>

      <div class="row">
        <select v-model="month" aria-label="Month">
          <option v-for="m in months" :key="m" :value="m">{{ monthLabel(m) }}</option>
        </select>
        <select v-model="typeFilter" aria-label="Type">
          <option value="all">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <select v-model="categoryFilter" aria-label="Category">
        <option value="all">All categories</option>
        <option v-for="c in categories.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <EmptyState
      v-if="!filtered.length"
      title="No matching transactions"
      description="Try another filter or add something new."
      action-label="Add transaction"
      @action="ui.openAdd()"
    />

    <div v-else class="list">
      <div v-for="tx in filtered" :key="tx.id" class="item">
        <TransactionRow :transaction="tx" @select="ui.openAdd(tx)" />
        <button
          type="button"
          class="delete"
          aria-label="Delete transaction"
          @click="remove(tx.id)"
        >
          <Trash2 :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

h1 {
  font-size: var(--text-headline);
}

.sub {
  color: var(--color-muted);
  font-size: var(--text-label);
  margin-top: var(--space-1);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-muted);
}

.search input {
  flex: 1;
  border: none;
  background: transparent;
  min-height: 40px;
  outline: none;
  color: var(--color-on-surface);
}

.row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-2);
}

select {
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.list {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-1) var(--space-3);
}

.item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-outline-variant);
}

.item:last-child {
  border-bottom: none;
}

.delete {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-muted);
}

.delete:hover,
.delete:focus-visible {
  background: color-mix(in srgb, var(--color-error) 14%, transparent);
  color: var(--color-error);
}
</style>
