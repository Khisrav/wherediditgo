<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { useDebtsStore } from '@/stores/debts'
import { useSettingsStore } from '@/stores/settings'
import { tickFeedback } from '@/services/native/haptics'
import DebtFormModal from './DebtFormModal.vue'
import type { Debt } from '@/types/finance'

const { t } = useI18n()
const debtsStore = useDebtsStore()
const settingsStore = useSettingsStore()

const showAddModal = ref(false)
const filter = ref<'active' | 'lent' | 'borrowed' | 'settled'>('active')
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | ''>('')
const showPaymentSheet = ref(false)

function setFilter(next: 'active' | 'lent' | 'borrowed' | 'settled') {
  if (filter.value === next) return
  filter.value = next
  void tickFeedback()
}

onMounted(() => {
  void debtsStore.load()
})

const filteredDebts = computed(() => {
  if (filter.value === 'lent') {
    return debtsStore.debts.filter((d) => d.type === 'lent' && d.status === 'active')
  }
  if (filter.value === 'borrowed') {
    return debtsStore.debts.filter((d) => d.type === 'borrowed' && d.status === 'active')
  }
  if (filter.value === 'settled') {
    return debtsStore.settledDebts
  }
  return debtsStore.activeDebts
})

function openPaymentModal(debt: Debt) {
  selectedDebt.value = debt
  paymentAmount.value = Math.max(0, debt.amount - debt.paidAmount)
  showPaymentSheet.value = true
}

async function handleRecordPayment() {
  if (!selectedDebt.value || !paymentAmount.value || paymentAmount.value <= 0) return
  await debtsStore.recordPayment(selectedDebt.value.id, Number(paymentAmount.value))
  showPaymentSheet.value = false
  selectedDebt.value = null
  void tickFeedback()
}

async function handleDelete(debt: Debt) {
  if (confirm(t('debts.deleteConfirm'))) {
    await debtsStore.deleteDebt(debt.id)
    void tickFeedback()
  }
}
</script>

<template>
  <div class="debts">
    <!-- Header with Serif Title -->
    <header class="debts-header">
      <h1>{{ t('debts.title') }}</h1>

      <!-- Segmented Pill Toggle matching Budgets picture -->
      <div class="seg" role="tablist" :aria-label="t('debts.title')">
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'active' }"
          :aria-selected="filter === 'active'"
          @click="setFilter('active')"
        >
          {{ t('debts.statusActive') }} ({{ debtsStore.activeDebts.length }})
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'lent' }"
          :aria-selected="filter === 'lent'"
          @click="setFilter('lent')"
        >
          {{ t('debts.lent') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'borrowed' }"
          :aria-selected="filter === 'borrowed'"
          @click="setFilter('borrowed')"
        >
          {{ t('debts.borrowed') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'settled' }"
          :aria-selected="filter === 'settled'"
          @click="setFilter('settled')"
        >
          {{ t('debts.statusSettled') }}
        </button>
      </div>
    </header>

    <!-- Summary Box -->
    <div class="summary">
      <div>
        <span>{{ t('debts.lent') }}</span>
        <strong class="lent-val">
          <MoneyText :amount="debtsStore.totalLent * 100" />
        </strong>
      </div>
      <div>
        <span>{{ t('debts.borrowed') }}</span>
        <strong class="borrowed-val">
          <MoneyText :amount="debtsStore.totalBorrowed * 100" />
        </strong>
      </div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-if="!filteredDebts.length"
      :title="t('debts.title')"
      :description="t('debts.empty')"
      :action-label="t('debts.addDebt')"
      @action="showAddModal = true"
    >
      <template #icon>
        <IconByName name="hand-coins" :size="28" />
      </template>
    </EmptyState>

    <!-- Debt Cards List -->
    <div v-else class="list">
      <div v-for="debt in filteredDebts" :key="debt.id" class="card">
        <div class="card-top">
          <!-- Person Avatar -->
          <span
            class="avatar-icon"
            :class="debt.type === 'lent' ? 'avatar-lent' : 'avatar-borrowed'"
          >
            {{ debt.personName.charAt(0).toUpperCase() }}
          </span>

          <div class="meta">
            <div class="meta-row">
              <strong class="person-name">{{ debt.personName }}</strong>
              <span
                class="type-pill"
                :class="debt.type === 'lent' ? 'pill-lent' : 'pill-borrowed'"
              >
                {{ debt.type === 'lent' ? t('debts.lent') : t('debts.borrowed') }}
              </span>
            </div>
            <span class="sub-meta">
              <span v-if="debt.dueDate" class="due-date">
                <IconByName name="calendar" :size="12" />
                {{ debt.dueDate }}
              </span>
              <span v-if="debt.note" class="note-text">{{ debt.note }}</span>
            </span>
          </div>

          <div class="amounts text-right">
            <span class="remaining" :class="debt.type === 'lent' ? 'lent-val' : 'borrowed-val'">
              <MoneyText :amount="(debt.amount - debt.paidAmount) * 100" />
            </span>
            <span class="total-orig">
              {{ t('debts.amount') }}:
              <MoneyText :amount="debt.amount * 100" />
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <ProgressBar
          v-if="debt.amount > 0"
          :value="Math.min(100, (debt.paidAmount / debt.amount) * 100)"
          :color="debt.type === 'lent' ? 'var(--color-income)' : 'var(--color-expense)'"
        />

        <!-- Action Row -->
        <div class="card-actions">
          <button
            v-if="debt.status === 'active'"
            type="button"
            class="action-btn pay-btn"
            @click="openPaymentModal(debt)"
          >
            <IconByName name="check-circle-2" :size="16" />
            <span>{{ t('debts.recordPayment') }}</span>
          </button>
          <span v-else class="settled-tag">
            <IconByName name="check-circle-2" :size="16" class="text-income" />
            <span>{{ t('debts.statusSettled') }}</span>
          </span>

          <button
            type="button"
            class="action-btn delete-btn"
            :title="t('debts.deleteConfirm')"
            @click="handleDelete(debt)"
          >
            <IconByName name="trash-2" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Add Chip when list is populated -->
    <section v-if="filteredDebts.length" class="section">
      <div class="chips">
        <button type="button" class="chip" @click="showAddModal = true">
          <IconByName name="plus" :size="16" />
          {{ t('debts.addDebt') }}
        </button>
      </div>
    </section>

    <!-- Add Debt Modal -->
    <DebtFormModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @saved="debtsStore.load()"
    />

    <!-- Record Payment BottomSheet -->
    <BottomSheet
      :open="showPaymentSheet"
      :title="`${t('debts.recordPayment')} — ${selectedDebt?.personName ?? ''}`"
      @close="showPaymentSheet = false"
    >
      <div v-if="selectedDebt" class="sheet-form">
        <label class="field">
          <span>{{ t('debts.enterPayment') }} ({{ settingsStore.currencySymbol }})</span>
          <input
            v-model.number="paymentAmount"
            type="number"
            inputmode="decimal"
            step="any"
            min="0.01"
            :max="selectedDebt.amount - selectedDebt.paidAmount"
            placeholder="0.00"
          />
        </label>
        <AppButton block size="lg" @click="handleRecordPayment">
          {{ t('common.save') }}
        </AppButton>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.debts {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-bottom: var(--space-6);
}

.debts-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

h1 {
  font-size: var(--text-headline);
  font-family: var(--font-display);
  font-weight: 600;
  line-height: var(--leading-tight);
  margin: 0;
  color: var(--color-on-surface);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-label);
  font-weight: 550;
  border: none;
  cursor: pointer;
}

/* Segmented Pill Navigation matching Budgets style */
.seg {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 36px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-caption);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

/* Summary Cards matching Budgets style */
.summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.summary span {
  display: block;
  font-size: var(--text-caption);
  color: var(--color-muted);
  margin-bottom: 4px;
}

.summary strong {
  font-family: var(--font-display);
  font-size: var(--text-title);
}

.lent-val {
  color: var(--color-income);
}

.borrowed-val {
  color: var(--color-expense);
}

/* List & Cards */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: left;
  width: 100%;
}

.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
}

.avatar-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: var(--text-body);
}

.avatar-lent {
  background: color-mix(in srgb, var(--color-income) 18%, transparent);
  color: var(--color-income);
}

.avatar-borrowed {
  background: color-mix(in srgb, var(--color-expense) 18%, transparent);
  color: var(--color-expense);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.person-name {
  font-weight: 600;
  font-size: var(--text-body);
  color: var(--color-on-surface);
}

.type-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  letter-spacing: 0.04em;
}

.pill-lent {
  background: color-mix(in srgb, var(--color-income) 14%, transparent);
  color: var(--color-income);
}

.pill-borrowed {
  background: color-mix(in srgb, var(--color-expense) 14%, transparent);
  color: var(--color-expense);
}

.sub-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.note-text {
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amounts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.remaining {
  font-size: var(--text-body);
  font-weight: 700;
}

.total-orig {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-outline-variant);
  padding-top: var(--space-2);
  margin-top: 2px;
}

.action-btn {
  background: transparent;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
  cursor: pointer;
  padding: 4px;
}

.pay-btn {
  color: var(--color-primary);
  font-weight: 600;
}

.settled-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
  color: var(--color-income);
  font-weight: 600;
}

.delete-btn {
  color: var(--color-muted);
}

.text-income {
  color: var(--color-income);
}

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0;
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
  color: var(--color-on-surface);
  font-size: var(--text-body);
}
</style>
