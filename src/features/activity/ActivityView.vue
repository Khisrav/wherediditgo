<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Trash2 } from '@lucide/vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { monthKey, monthLabel } from '@/lib/dates'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const settings = useSettingsStore()
const ui = useUiStore()

const query = ref('')
const month = ref(monthKey())
const typeFilter = ref('all')
const categoryFilter = ref('all')

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

async function remove(id: string) {
  const ok = window.confirm(t('activity.deleteConfirm'))
  if (!ok) return
  await transactions.deleteTransaction(id)
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

      <div class="row">
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
      <div v-for="tx in filtered" :key="tx.id" class="item">
        <TransactionRow :transaction="tx" @select="ui.openAdd(tx)" />
        <button
          type="button"
          class="delete"
          :aria-label="t('activity.deleteAria')"
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
