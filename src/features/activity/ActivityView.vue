<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from '@lucide/vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Snackbar from '@/components/ui/Snackbar.vue'
import SwipeToDelete from '@/components/ui/SwipeToDelete.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { monthKey, monthLabel } from '@/lib/dates'
import { successFeedback, warningFeedback } from '@/services/native/haptics'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import type { Transaction } from '@/types/finance'

const { t } = useI18n()
const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const settings = useSettingsStore()
const ui = useUiStore()

const query = ref('')
const month = ref(monthKey())
const typeFilter = ref('all')
const categoryFilter = ref('all')
const openSwipeId = ref<string | null>(null)
const snackOpen = ref(false)
const pendingUndo = ref<Transaction | null>(null)

const months = computed(() => {
  const set = new Set(transactions.transactions.map((tx) => tx.date.slice(0, 7)))
  set.add(monthKey())
  return [...set].sort().reverse()
})

const monthOptions = computed(() =>
  months.value.map((m) => ({
    value: m,
    label: monthLabel(m, settings.intlLocale),
  })),
)

const typeOptions = computed(() => [
  { value: 'all', label: t('activity.allTypes') },
  { value: 'expense', label: t('txTypes.expense') },
  { value: 'income', label: t('txTypes.income') },
  { value: 'transfer', label: t('txTypes.transfer') },
])

const categoryOptions = computed(() => [
  { value: 'all', label: t('activity.allCategories') },
  ...categories.categories.map((c) => ({ value: c.id, label: c.name })),
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return transactions.transactions.filter((tx) => {
    if (month.value && !tx.date.startsWith(month.value)) return false
    if (typeFilter.value !== 'all' && tx.type !== typeFilter.value) return false
    if (categoryFilter.value !== 'all' && tx.categoryId !== categoryFilter.value) return false
    if (!q) return true
    const cat = tx.categoryId ? (categories.byId(tx.categoryId)?.name ?? '') : ''
    return (
      tx.note.toLowerCase().includes(q) ||
      cat.toLowerCase().includes(q) ||
      tx.type.includes(q)
    )
  })
})

function setOpen(id: string, open: boolean) {
  openSwipeId.value = open ? id : openSwipeId.value === id ? null : openSwipeId.value
}

async function remove(id: string) {
  const existing = transactions.byId(id)
  if (!existing) return
  const snapshot: Transaction = { ...existing }
  openSwipeId.value = null
  await transactions.deleteTransaction(id)
  pendingUndo.value = snapshot
  snackOpen.value = true
  void warningFeedback()
}

async function undoDelete() {
  const tx = pendingUndo.value
  if (!tx) return
  snackOpen.value = false
  pendingUndo.value = null
  await transactions.restoreTransaction(tx)
  void successFeedback()
}

function onSnackOpen(open: boolean) {
  snackOpen.value = open
  if (!open) pendingUndo.value = null
}
</script>

<template>
  <div class="activity">
    <header>
      <h1>{{ t('activity.title') }}</h1>
      <p class="sub">{{ t('activity.transactionsCount', { count: filtered.length }) }}</p>
    </header>

    <div class="filters">
      <label class="search">
        <Search :size="18" aria-hidden="true" />
        <input v-model="query" type="search" :placeholder="t('activity.searchPlaceholder')" />
      </label>

      <div class="filter-row">
        <AppSelect
          v-model="month"
          :options="monthOptions"
          :aria-label="t('activity.month')"
        />
        <AppSelect
          v-model="typeFilter"
          :options="typeOptions"
          :aria-label="t('activity.type')"
        />
      </div>

      <AppSelect
        v-model="categoryFilter"
        :options="categoryOptions"
        :aria-label="t('activity.category')"
      />
    </div>

    <EmptyState
      v-if="!filtered.length"
      :title="t('activity.emptyTitle')"
      :description="t('activity.emptyDesc')"
      :action-label="t('nav.addTransaction')"
      @action="ui.openAdd()"
    />

    <div v-else class="list">
      <SwipeToDelete
        v-for="tx in filtered"
        :key="tx.id"
        :open="openSwipeId === tx.id"
        @update:open="setOpen(tx.id, $event)"
        @delete="remove(tx.id)"
      >
        <TransactionRow :transaction="tx" @select="ui.openAdd(tx)" />
      </SwipeToDelete>
    </div>

    <Snackbar
      :open="snackOpen"
      :message="t('activity.deleted')"
      :action-label="t('common.undo')"
      :nonce="pendingUndo?.id ?? ''"
      @update:open="onSnackOpen"
      @action="undoDelete"
    />
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

.filter-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-2);
}

.list {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-4);
  overflow: hidden;
}
</style>
