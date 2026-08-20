<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { monthLabel } from '@/lib/dates'
import { parseMoneyToMinor } from '@/lib/money'
import { warningFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'
import { useSettingsStore } from '@/stores/settings'
import type { Recurring } from '@/types/finance'

const { t } = useI18n()
const recurring = useRecurringStore()
const categories = useCategoriesStore()
const accounts = useAccountsStore()
const settings = useSettingsStore()

const sheetOpen = ref(false)
const editing = ref<Recurring | null>(null)
const recType = ref<'expense' | 'income'>('expense')
const amountStr = ref('')
const accountId = ref('')
const categoryId = ref('')
const note = ref('')
const dayOfMonth = ref('1')

const rows = computed(() =>
  recurring.items.map((row) => ({
    row,
    categoryName: categories.byId(row.categoryId)?.name ?? t('transaction.uncategorized'),
    lastPosted: row.lastPostedMonth
      ? t('recurring.lastPosted', { month: monthLabel(row.lastPostedMonth, settings.intlLocale) })
      : t('recurring.neverPosted'),
  })),
)

const accountOptions = computed(() =>
  accounts.active.map((a) => ({ value: a.id, label: a.name })),
)

const categoryOptions = computed(() => {
  const list = recType.value === 'income' ? categories.income : categories.expense
  return list.map((c) => ({ value: c.id, label: c.name }))
})

const dayOptions = computed(() =>
  Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
)

function openEdit(row: Recurring) {
  editing.value = row
  recType.value = row.type
  amountStr.value = (row.amount / 100).toFixed(2)
  accountId.value = row.accountId
  categoryId.value = row.categoryId
  note.value = row.note
  dayOfMonth.value = String(row.dayOfMonth)
  sheetOpen.value = true
}

async function save() {
  if (!editing.value) return
  const amount = parseMoneyToMinor(amountStr.value)
  if (amount <= 0 || !accountId.value || !categoryId.value) return
  await recurring.updateRecurring(editing.value.id, {
    type: recType.value,
    amount,
    accountId: accountId.value,
    categoryId: categoryId.value,
    note: note.value,
    dayOfMonth: Number(dayOfMonth.value),
  })
  sheetOpen.value = false
}

async function remove(id: string) {
  if (!window.confirm(t('recurring.deleteConfirm'))) return
  void warningFeedback()
  await recurring.removeRecurring(id)
}
</script>

<template>
  <EmptyState
    v-if="!rows.length"
    :title="t('recurring.emptyTitle')"
    :description="t('recurring.empty')"
  >
    <template #icon>
      <IconByName name="repeat" :size="28" />
    </template>
  </EmptyState>

  <section v-else class="panel" :aria-label="t('recurring.title')">
    <p class="lede">{{ t('recurring.lede') }}</p>
    <ul class="list">
      <li v-for="{ row, categoryName, lastPosted } in rows" :key="row.id">
        <button type="button" class="meta" @click="openEdit(row)">
          <strong>
            <MoneyText :amount="row.amount" :signed="row.type" />
          </strong>
          <span>
            {{ t(`txTypes.${row.type}`) }} · {{ categoryName }} ·
            {{ t('recurring.everyMonthOn', { day: row.dayOfMonth }) }}
          </span>
          <span>{{ lastPosted }}</span>
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('common.edit')"
          @click="openEdit(row)"
        >
          <Pencil :size="16" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('recurring.deleteAria')"
          @click="remove(row.id)"
        >
          <Trash2 :size="16" />
        </button>
      </li>
    </ul>
  </section>

  <BottomSheet :open="sheetOpen" :title="t('recurring.editTitle')" @close="sheetOpen = false">
    <div class="sheet">
      <label class="field">
        <span>{{ t('recurring.amount') }}</span>
        <input v-model="amountStr" type="text" inputmode="decimal" autocomplete="off" />
      </label>
      <label class="field">
        <span>{{ t('quickAdd.account') }}</span>
        <AppSelect v-model="accountId" :options="accountOptions" :aria-label="t('quickAdd.account')" />
      </label>
      <label class="field">
        <span>{{ t('quickAdd.category') }}</span>
        <AppSelect
          v-model="categoryId"
          :options="categoryOptions"
          :aria-label="t('quickAdd.category')"
        />
      </label>
      <label class="field">
        <span>{{ t('quickAdd.note') }}</span>
        <input v-model="note" type="text" maxlength="120" :placeholder="t('common.optional')" />
      </label>
      <label class="field">
        <span>{{ t('recurring.dayOfMonth') }}</span>
        <AppSelect
          v-model="dayOfMonth"
          :options="dayOptions"
          :aria-label="t('recurring.dayOfMonth')"
        />
      </label>
      <AppButton block size="lg" @click="save">{{ t('common.save') }}</AppButton>
    </div>
  </BottomSheet>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.lede {
  color: var(--color-muted);
  font-size: var(--text-body);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-1);
  align-items: center;
  min-height: 40px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-align: left;
  padding: var(--space-2) 0;
}

.meta span {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-muted);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field span {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.field input {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}
</style>
