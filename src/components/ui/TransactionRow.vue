<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeftRight } from '@lucide/vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { formatTxDate } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import type { Transaction } from '@/types/finance'

const props = defineProps<{
  transaction: Transaction
  hideDate?: boolean
}>()

defineEmits<{ select: [] }>()

const { t } = useI18n()
const categories = useCategoriesStore()
const accounts = useAccountsStore()
const settings = useSettingsStore()

const category = computed(() =>
  props.transaction.categoryId ? categories.byId(props.transaction.categoryId) : null,
)

const account = computed(() => accounts.byId(props.transaction.accountId))

const label = computed(() => {
  if (props.transaction.type === 'transfer') {
    const to = props.transaction.toAccountId
      ? (accounts.byId(props.transaction.toAccountId)?.name ?? '?')
      : (props.transaction.note.trim() || t('goals.title'))
    return `${account.value?.name ?? '?'} → ${to}`
  }
  const note = props.transaction.note.trim()
  if (note) return note
  return category.value?.name ?? t('transaction.uncategorized')
})

const subtitle = computed(() => {
  const date = formatTxDate(props.transaction.date, settings.intlLocale)
  if (props.transaction.type === 'transfer') return props.hideDate ? '' : date
  const parts = props.hideDate ? [] : [date]
  const note = props.transaction.note.trim()
  if (note && category.value) parts.push(category.value.name)
  if (account.value) parts.push(account.value.name)
  return parts.join(' · ')
})

const amountClass = computed(() => {
  if (props.transaction.type === 'income') return 'amount--income'
  if (props.transaction.type === 'expense') return 'amount--expense'
  return 'amount--transfer'
})

const iconBg = computed(() => {
  if (props.transaction.type === 'transfer') {
    return 'color-mix(in srgb, var(--color-transfer) 18%, transparent)'
  }
  const c = category.value?.color ?? '#6c757d'
  return `color-mix(in srgb, ${c} 22%, transparent)`
})
</script>

<template>
  <button type="button" class="row" @click="$emit('select')">
    <span class="icon" :style="{ background: iconBg }">
      <ArrowLeftRight v-if="transaction.type === 'transfer'" :size="18" />
      <IconByName v-else :name="category?.icon ?? 'circle'" :size="18" />
    </span>
    <span class="meta">
      <span class="title">{{ label }}</span>
      <span v-if="subtitle" class="sub">{{ subtitle }}</span>
    </span>
    <span class="amount" :class="amountClass">
      <MoneyText :amount="transaction.amount" :signed="transaction.type" />
    </span>
  </button>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-3) 0;
  text-align: left;
  min-height: var(--touch-min);
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: var(--color-on-surface);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  font-size: var(--text-caption);
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  font-size: 0.95rem;
  white-space: nowrap;
}

.amount--income {
  color: var(--color-income);
}

.amount--expense {
  color: var(--color-expense);
}

.amount--transfer {
  color: var(--color-transfer);
}
</style>
