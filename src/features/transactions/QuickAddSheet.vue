<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AmountKeypad from '@/components/ui/AmountKeypad.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { parseMoneyToMinor } from '@/lib/money'
import { todayISO } from '@/lib/dates'
import { successFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import type { TransactionType } from '@/types/finance'

const ui = useUiStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const transactions = useTransactionsStore()
const settings = useSettingsStore()

const type = ref<TransactionType>('expense')
const amountStr = ref('')
const categoryId = ref<string>('')
const accountId = ref<string>('')
const toAccountId = ref<string>('')
const note = ref('')
const date = ref(todayISO())
const step = ref<'amount' | 'details'>('amount')
const saving = ref(false)
const error = ref('')

const title = computed(() => (ui.editingTx ? 'Edit transaction' : 'Add transaction'))

const categoryList = computed(() =>
  type.value === 'income' ? categories.income : categories.expense,
)

function resetForm() {
  type.value = 'expense'
  amountStr.value = ''
  categoryId.value = categories.expense[0]?.id ?? ''
  accountId.value = accounts.active[0]?.id ?? ''
  toAccountId.value = accounts.active[1]?.id ?? accounts.active[0]?.id ?? ''
  note.value = ''
  date.value = todayISO()
  step.value = 'amount'
  error.value = ''
  saving.value = false
}

watch(
  () => ui.addSheetOpen,
  (open) => {
    if (!open) return
    if (ui.editingTx) {
      const tx = ui.editingTx
      type.value = tx.type
      amountStr.value = (tx.amount / 100).toFixed(2)
      categoryId.value = tx.categoryId ?? ''
      accountId.value = tx.accountId
      toAccountId.value = tx.toAccountId ?? ''
      note.value = tx.note
      date.value = tx.date
      step.value = 'details'
    } else {
      resetForm()
    }
  },
)

watch(type, (t) => {
  if (t === 'transfer') {
    categoryId.value = ''
    return
  }
  const list = t === 'income' ? categories.income : categories.expense
  const stillValid = list.some((c) => c.id === categoryId.value)
  if (!stillValid) {
    categoryId.value = list[0]?.id ?? ''
  }
})

function continueToDetails() {
  const amount = parseMoneyToMinor(amountStr.value)
  if (amount <= 0) {
    error.value = 'Enter an amount greater than zero'
    return
  }
  error.value = ''
  step.value = 'details'
}

async function save() {
  const amount = parseMoneyToMinor(amountStr.value)
  if (amount <= 0) {
    error.value = 'Enter an amount greater than zero'
    step.value = 'amount'
    return
  }
  if (!accountId.value) {
    error.value = 'Choose an account'
    return
  }
  if (type.value !== 'transfer' && !categoryId.value) {
    error.value = 'Choose a category'
    return
  }
  if (type.value === 'transfer') {
    if (!toAccountId.value || toAccountId.value === accountId.value) {
      error.value = 'Choose a different destination account'
      return
    }
  }

  saving.value = true
  error.value = ''
  try {
    const payload = {
      type: type.value,
      amount,
      accountId: accountId.value,
      toAccountId: type.value === 'transfer' ? toAccountId.value : undefined,
      categoryId: type.value === 'transfer' ? undefined : categoryId.value,
      note: note.value,
      date: date.value,
    }
    if (ui.editingTx) {
      await transactions.updateTransaction(ui.editingTx.id, payload)
    } else {
      await transactions.addTransaction(payload)
    }
    await successFeedback()
    ui.closeAdd()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not save'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="ui.addSheetOpen" :title="title" tall @close="ui.closeAdd()">
    <div class="add">
      <div class="add-scroll">
        <div class="type-tabs" role="tablist" aria-label="Transaction type">
          <button
            v-for="t in (['expense', 'income', 'transfer'] as const)"
            :key="t"
            type="button"
            role="tab"
            class="type-tab"
            :class="{ 'type-tab--active': type === t }"
            :aria-selected="type === t"
            @click="type = t"
          >
            {{ t }}
          </button>
        </div>

        <template v-if="step === 'amount'">
          <AmountKeypad v-model="amountStr" :currency-symbol="settings.currencySymbol" />
        </template>

        <template v-else>
          <button type="button" class="amount-chip" @click="step = 'amount'">
            {{ settings.currencySymbol }}{{ amountStr || '0' }}
            <span>Edit</span>
          </button>

          <label class="field">
            <span>Date</span>
            <input v-model="date" type="date" />
          </label>

          <label class="field">
            <span>{{ type === 'transfer' ? 'From account' : 'Account' }}</span>
            <select v-model="accountId">
              <option v-for="a in accounts.active" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </label>

          <label v-if="type === 'transfer'" class="field">
            <span>To account</span>
            <select v-model="toAccountId">
              <option v-for="a in accounts.active" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </label>

          <div v-if="type !== 'transfer'" class="cats">
            <span class="field-label">Category</span>
            <div class="cat-grid">
              <button
                v-for="c in categoryList"
                :key="c.id"
                type="button"
                class="cat"
                :class="{ 'cat--active': categoryId === c.id }"
                :style="{ '--cat': c.color }"
                @click="categoryId = c.id"
              >
                <IconByName :name="c.icon" :size="18" />
                <span>{{ c.name }}</span>
              </button>
            </div>
          </div>

          <label class="field">
            <span>Note</span>
            <input v-model="note" type="text" maxlength="120" placeholder="Optional" />
          </label>
        </template>
      </div>

      <div class="add-footer">
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <AppButton v-if="step === 'amount'" block size="lg" @click="continueToDetails">
          Continue
        </AppButton>
        <AppButton v-else block size="lg" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : ui.editingTx ? 'Save changes' : 'Save' }}
        </AppButton>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.add {
  display: flex;
  flex-direction: column;
  min-height: min(70vh, 640px);
  margin: 0 calc(-1 * var(--space-5));
}

.add-scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-5) var(--space-4);
}

.add-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5) var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.type-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.type-tab {
  min-height: 40px;
  border-radius: var(--radius-full);
  text-transform: capitalize;
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
}

.type-tab--active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.amount-chip {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-family: var(--font-display);
  font-size: var(--text-headline);
  font-weight: 600;
}

.amount-chip span {
  font-family: var(--font-body);
  font-size: var(--text-label);
  font-weight: 600;
  opacity: 0.75;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field span,
.field-label {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.field input,
.field select {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.cat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-container);
  text-align: left;
  font-size: var(--text-label);
  font-weight: 550;
}

.cat--active {
  background: color-mix(in srgb, var(--cat) 22%, var(--color-surface));
  box-shadow: inset 0 0 0 2px var(--cat);
}

.error {
  color: var(--color-error);
  font-size: var(--text-label);
}
</style>
