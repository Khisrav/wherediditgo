<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AmountKeypad from '@/components/ui/AmountKeypad.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { parseMoneyToMinor } from '@/lib/money'
import { monthKey, todayDayOfMonth, todayISO } from '@/lib/dates'
import { confirmFeedback, errorFeedback, successFeedback, tickFeedback, warningFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import type { TransactionType } from '@/types/finance'

const { t } = useI18n()
const ui = useUiStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const transactions = useTransactionsStore()
const recurring = useRecurringStore()
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
const repeatMonthly = ref(false)
const dayOfMonth = ref(String(todayDayOfMonth()))

const title = computed(() =>
  ui.editingTx ? t('quickAdd.editTitle') : t('quickAdd.addTitle'),
)

const categoryList = computed(() =>
  type.value === 'income' ? categories.income : categories.expense,
)

const accountOptions = computed(() =>
  accounts.active.map((a) => ({ value: a.id, label: a.name })),
)

const dayOptions = computed(() =>
  Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
)

const showRepeat = computed(() => !ui.editingTx && type.value !== 'transfer')
const isGoalMove = computed(
  () => Boolean(ui.editingTx && ui.editingTx.type === 'transfer' && !ui.editingTx.toAccountId),
)

function pickActiveAccount(preferred: string, fallbackIndex = 0) {
  const list = accounts.active
  if (preferred && list.some((a) => a.id === preferred)) return preferred
  return list[fallbackIndex]?.id ?? list[0]?.id ?? ''
}

function pickCategory(kind: 'expense' | 'income') {
  const list = kind === 'income' ? categories.income : categories.expense
  const preferred = kind === 'income' ? settings.lastIncomeCategoryId : settings.lastExpenseCategoryId
  if (preferred && list.some((c) => c.id === preferred)) return preferred
  return list[0]?.id ?? ''
}

function resetForm() {
  type.value = 'expense'
  amountStr.value = ''
  categoryId.value = pickCategory('expense')
  accountId.value = pickActiveAccount(settings.lastAccountId)
  const lastTo = pickActiveAccount(settings.lastToAccountId, 1)
  toAccountId.value =
    lastTo && lastTo !== accountId.value
      ? lastTo
      : (accounts.active.find((a) => a.id !== accountId.value)?.id ?? accountId.value)
  note.value = ''
  date.value = todayISO()
  step.value = 'amount'
  error.value = ''
  saving.value = false
  repeatMonthly.value = false
  dayOfMonth.value = String(todayDayOfMonth())
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

watch(type, (txType) => {
  if (txType === 'transfer') {
    categoryId.value = ''
    return
  }
  const list = txType === 'income' ? categories.income : categories.expense
  const stillValid = list.some((c) => c.id === categoryId.value)
  if (!stillValid) {
    categoryId.value = pickCategory(txType)
  }
})

function continueToDetails() {
  const amount = parseMoneyToMinor(amountStr.value)
  if (amount <= 0) {
    error.value = t('quickAdd.amountRequired')
    void errorFeedback()
    return
  }
  amountStr.value = (amount / 100).toFixed(2)
  error.value = ''
  step.value = 'details'
  void confirmFeedback()
}

async function save() {
  const amount = parseMoneyToMinor(amountStr.value)
  if (amount <= 0) {
    error.value = t('quickAdd.amountRequired')
    step.value = 'amount'
    void errorFeedback()
    return
  }
  if (!accountId.value) {
    error.value = t('quickAdd.accountRequired')
    void errorFeedback()
    return
  }
  if (type.value !== 'transfer' && !categoryId.value) {
    error.value = t('quickAdd.categoryRequired')
    void errorFeedback()
    return
  }
  if (type.value === 'transfer' && !isGoalMove.value) {
    if (!toAccountId.value || toAccountId.value === accountId.value) {
      error.value = t('quickAdd.destinationRequired')
      void errorFeedback()
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
      toAccountId:
        type.value === 'transfer' && toAccountId.value && toAccountId.value !== accountId.value
          ? toAccountId.value
          : undefined,
      categoryId: type.value === 'transfer' ? undefined : categoryId.value,
      note: note.value,
      date: date.value,
    }
    if (ui.editingTx) {
      await transactions.updateTransaction(ui.editingTx.id, payload)
    } else {
      await transactions.addTransaction(payload)
      await settings.rememberLastUsed({
        accountId: payload.accountId,
        toAccountId: payload.toAccountId,
        expenseCategoryId: payload.type === 'expense' ? payload.categoryId : undefined,
        incomeCategoryId: payload.type === 'income' ? payload.categoryId : undefined,
      })
      if (repeatMonthly.value && payload.type !== 'transfer' && payload.categoryId) {
        await recurring.addRecurring({
          type: payload.type,
          amount: payload.amount,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          note: payload.note,
          dayOfMonth: Number(dayOfMonth.value),
          lastPostedMonth: monthKey(),
        })
      }
    }
    await successFeedback()
    ui.closeAdd()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('quickAdd.saveFail')
    void errorFeedback()
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!ui.editingTx) return
  if (!window.confirm(t('activity.deleteConfirm'))) return
  saving.value = true
  try {
    await transactions.deleteTransaction(ui.editingTx.id)
    void warningFeedback()
    ui.closeAdd()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('quickAdd.saveFail')
    void errorFeedback()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet contain :open="ui.addSheetOpen" :title="title" @close="ui.closeAdd()">
    <div class="add" :class="{ 'add--amount': step === 'amount' }">
      <div class="type-tabs" role="tablist" :aria-label="t('quickAdd.typeLabel')">
        <button
          v-for="txType in (['expense', 'income', 'transfer'] as const)"
          :key="txType"
          type="button"
          role="tab"
          class="type-tab"
          :class="{ 'type-tab--active': type === txType }"
          :aria-selected="type === txType"
          @click="type = txType; tickFeedback()"
        >
          {{ t(`txTypes.${txType}`) }}
        </button>
      </div>

      <div class="add-body">
        <template v-if="step === 'amount'">
          <AmountKeypad
            v-model="amountStr"
            :currency-symbol="settings.currencySymbol"
            :currency-position="settings.currencyPosition"
          />
        </template>

        <template v-else>
          <button type="button" class="amount-chip" @click="step = 'amount'">
            <template v-if="settings.currencyPosition === 'before'">
              {{ settings.currencySymbol }}{{ amountStr || '0' }}
            </template>
            <template v-else>
              {{ amountStr || '0' }} {{ settings.currencySymbol }}
            </template>
            <span>{{ t('common.edit') }}</span>
          </button>

          <label class="field">
            <span>{{ t('quickAdd.date') }}</span>
            <input v-model="date" type="date" />
          </label>

          <label class="field">
            <span>{{ type === 'transfer' ? t('quickAdd.fromAccount') : t('quickAdd.account') }}</span>
            <AppSelect
              v-model="accountId"
              :options="accountOptions"
              :aria-label="type === 'transfer' ? t('quickAdd.fromAccount') : t('quickAdd.account')"
            />
          </label>

          <label v-if="type === 'transfer' && !isGoalMove" class="field">
            <span>{{ t('quickAdd.toAccount') }}</span>
            <AppSelect
              v-model="toAccountId"
              :options="accountOptions"
              :aria-label="t('quickAdd.toAccount')"
            />
          </label>

          <p v-else-if="type === 'transfer' && isGoalMove" class="goal-dest">
            {{ t('quickAdd.toGoal') }} · {{ note || t('goals.title') }}
          </p>

          <div v-if="type !== 'transfer'" class="cats">
            <span class="field-label">{{ t('quickAdd.category') }}</span>
            <div class="cat-grid">
              <button
                v-for="c in categoryList"
                :key="c.id"
                type="button"
                class="cat"
                :class="{ 'cat--active': categoryId === c.id }"
                :style="{ '--cat': c.color }"
                @click="categoryId = c.id; tickFeedback()"
              >
                <IconByName :name="c.icon" :size="16" />
                <span>{{ c.name }}</span>
              </button>
            </div>
          </div>

          <label class="field">
            <span>{{ t('quickAdd.note') }}</span>
            <input
              v-model="note"
              type="text"
              maxlength="120"
              :placeholder="t('common.optional')"
            />
          </label>

          <template v-if="showRepeat">
            <div class="repeat">
              <span id="repeat-label">{{ t('recurring.repeatMonthly') }}</span>
              <button
                type="button"
                class="switch"
                :class="{ 'switch--on': repeatMonthly }"
                role="switch"
                :aria-checked="repeatMonthly"
                aria-labelledby="repeat-label"
                @click="repeatMonthly = !repeatMonthly; tickFeedback()"
              />
            </div>
            <label v-if="repeatMonthly" class="field">
              <span>{{ t('recurring.dayOfMonth') }}</span>
              <AppSelect
                v-model="dayOfMonth"
                :options="dayOptions"
                :aria-label="t('recurring.dayOfMonth')"
              />
            </label>
          </template>
        </template>
      </div>

      <div class="add-footer">
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <AppButton v-if="step === 'amount'" block @click="continueToDetails">
          {{ t('quickAdd.continue') }}
        </AppButton>
        <AppButton v-else block :disabled="saving" @click="save">
          {{
            saving
              ? t('quickAdd.saving')
              : ui.editingTx
                ? t('quickAdd.saveChanges')
                : t('common.save')
          }}
        </AppButton>
        <AppButton
          v-if="step === 'details' && ui.editingTx"
          variant="ghost"
          block
          :disabled="saving"
          @click="remove"
        >
          {{ t('common.delete') }}
        </AppButton>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.add {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0 calc(-1 * var(--space-4));
  padding: 0 var(--space-4);
}

.add-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.add--amount .add-body {
  overflow: hidden;
}

.add-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
}

.type-tabs {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.type-tab {
  min-height: 34px;
  border-radius: var(--radius-full);
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
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-family: var(--font-display);
  font-size: var(--text-title);
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

.field input {
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.cat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
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

.goal-dest {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-container);
  font-size: var(--text-label);
  font-weight: 550;
  color: var(--color-on-surface-variant);
}

.repeat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: var(--touch-min);
}

.repeat span {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.switch {
  width: 48px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
  position: relative;
  transition: background var(--duration-fast) var(--ease-standard);
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-standard);
}

.switch--on {
  background: var(--color-primary);
}

.switch--on::after {
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch::after {
    transition: none;
  }
}
</style>
