<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Trash2, DollarSign, Calendar } from '@lucide/vue'
import { useDebtsStore } from '@/stores/debts'
import { useSettingsStore } from '@/stores/settings'
import { formatMoney } from '@/lib/money'
import DebtFormModal from './DebtFormModal.vue'
import type { Debt } from '@/types/finance'

const { t } = useI18n()
const debtsStore = useDebtsStore()
const settingsStore = useSettingsStore()

const showAddModal = ref(false)
const filter = ref<'active' | 'lent' | 'borrowed' | 'settled'>('active')
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | ''>('')
const showPaymentModal = ref(false)

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
  showPaymentModal.value = true
}

async function handleRecordPayment() {
  if (!selectedDebt.value || !paymentAmount.value || paymentAmount.value <= 0) return
  await debtsStore.recordPayment(selectedDebt.value.id, Number(paymentAmount.value))
  showPaymentModal.value = false
  selectedDebt.value = null
}

async function handleDelete(debt: Debt) {
  if (confirm(t('debts.deleteConfirm'))) {
    await debtsStore.deleteDebt(debt.id)
  }
}
</script>

<template>
  <div class="debts-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">{{ t('debts.title') }}</h1>
        <p class="view-subtitle">{{ t('debts.subtitle') }}</p>
      </div>
      <button type="button" class="add-btn" @click="showAddModal = true">
        <Plus class="w-5 h-5 mr-1" />
        {{ t('debts.addDebt') }}
      </button>
    </div>

    <!-- Summary Hero -->
    <div class="hero-grid">
      <div class="hero-card lent-card">
        <div class="hero-card-header">
          <div class="hero-icon lent-icon">
            <ArrowUpRight class="w-5 h-5 text-emerald-500" />
          </div>
          <span class="hero-label">{{ t('debts.lent') }}</span>
        </div>
        <div class="hero-amount text-emerald-400">
          {{ formatMoney(debtsStore.totalLent * 100, settingsStore.currency, settingsStore.intlLocale, settingsStore.currencyPosition) }}
        </div>
      </div>

      <div class="hero-card borrowed-card">
        <div class="hero-card-header">
          <div class="hero-icon borrowed-icon">
            <ArrowDownLeft class="w-5 h-5 text-amber-500" />
          </div>
          <span class="hero-label">{{ t('debts.borrowed') }}</span>
        </div>
        <div class="hero-amount text-amber-400">
          {{ formatMoney(debtsStore.totalBorrowed * 100, settingsStore.currency, settingsStore.intlLocale, settingsStore.currencyPosition) }}
        </div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-bar">
      <button
        type="button"
        class="filter-tab"
        :class="{ active: filter === 'active' }"
        @click="filter = 'active'"
      >
        {{ t('debts.statusActive') }} ({{ debtsStore.activeDebts.length }})
      </button>
      <button
        type="button"
        class="filter-tab"
        :class="{ active: filter === 'lent' }"
        @click="filter = 'lent'"
      >
        {{ t('debts.lent') }}
      </button>
      <button
        type="button"
        class="filter-tab"
        :class="{ active: filter === 'borrowed' }"
        @click="filter = 'borrowed'"
      >
        {{ t('debts.borrowed') }}
      </button>
      <button
        type="button"
        class="filter-tab"
        :class="{ active: filter === 'settled' }"
        @click="filter = 'settled'"
      >
        {{ t('debts.statusSettled') }}
      </button>
    </div>

    <!-- Debts List -->
    <div v-if="filteredDebts.length === 0" class="empty-state">
      <DollarSign class="w-12 h-12 text-slate-600 mb-2" />
      <p class="empty-text">{{ t('debts.empty') }}</p>
    </div>

    <div v-else class="debts-list">
      <div v-for="debt in filteredDebts" :key="debt.id" class="debt-card">
        <div class="debt-card-top">
          <div class="debt-person">
            <div
              class="person-avatar"
              :class="debt.type === 'lent' ? 'avatar-lent' : 'avatar-borrowed'"
            >
              {{ debt.personName.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="person-name">{{ debt.personName }}</h3>
              <div class="debt-badges">
                <span
                  class="type-badge"
                  :class="debt.type === 'lent' ? 'badge-lent' : 'badge-borrowed'"
                >
                  {{ debt.type === 'lent' ? t('debts.lent') : t('debts.borrowed') }}
                </span>
                <span v-if="debt.dueDate" class="date-badge">
                  <Calendar class="w-3 h-3 mr-1" />
                  {{ debt.dueDate }}
                </span>
              </div>
            </div>
          </div>

          <div class="debt-amounts text-right">
            <div class="remaining-val">
              {{
                formatMoney(
                  (debt.amount - debt.paidAmount) * 100,
                  settingsStore.currency,
                  settingsStore.intlLocale,
                  settingsStore.currencyPosition
                )
              }}
            </div>
            <div class="total-val">
              {{ t('debts.amount') }}:
              {{ formatMoney(debt.amount * 100, settingsStore.currency, settingsStore.intlLocale, settingsStore.currencyPosition) }}
            </div>
          </div>
        </div>

        <!-- Progress Bar for Partial Settlement -->
        <div v-if="debt.amount > 0" class="progress-bar-track">
          <div
            class="progress-bar-fill"
            :style="{ width: Math.min(100, (debt.paidAmount / debt.amount) * 100) + '%' }"
          ></div>
        </div>

        <div v-if="debt.note" class="debt-note">
          "{{ debt.note }}"
        </div>

        <!-- Action Row -->
        <div class="debt-actions">
          <button
            v-if="debt.status === 'active'"
            type="button"
            class="action-btn pay-btn"
            @click="openPaymentModal(debt)"
          >
            <CheckCircle2 class="w-4 h-4 mr-1" />
            {{ t('debts.recordPayment') }}
          </button>
          <span v-else class="settled-tag">
            <CheckCircle2 class="w-4 h-4 mr-1 text-emerald-400" />
            {{ t('debts.statusSettled') }}
          </span>

          <button
            type="button"
            class="action-btn delete-btn"
            @click="handleDelete(debt)"
          >
            <Trash2 class="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add Debt Modal -->
    <DebtFormModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @saved="debtsStore.load()"
    />

    <!-- Record Payment Modal -->
    <div v-if="showPaymentModal && selectedDebt" class="modal-backdrop" @click.self="showPaymentModal = false">
      <div class="modal-card">
        <h3 class="modal-title mb-3">{{ t('debts.recordPayment') }} - {{ selectedDebt.personName }}</h3>
        <div class="form-group mb-4">
          <label class="form-label">{{ t('debts.enterPayment') }}</label>
          <input
            v-model.number="paymentAmount"
            type="number"
            step="any"
            min="0.01"
            :max="selectedDebt.amount - selectedDebt.paidAmount"
            class="form-input"
          />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="showPaymentModal = false">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="btn btn-primary" @click="handleRecordPayment">
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debts-view {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
}

.view-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted, #94a3b8);
}

.add-btn {
  display: flex;
  align-items: center;
  background: var(--primary, #3b82f6);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 8px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.hero-card {
  background: var(--bg-card, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 14px;
  padding: 1rem;
}

.hero-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hero-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lent-icon {
  background: rgba(16, 185, 129, 0.15);
}

.borrowed-icon {
  background: rgba(245, 158, 11, 0.15);
}

.hero-label {
  font-size: 0.8125rem;
  color: var(--text-muted, #94a3b8);
}

.hero-amount {
  font-size: 1.25rem;
  font-weight: 700;
}

.filter-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 1rem;
  padding-bottom: 4px;
}

.filter-tab {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border-color, #334155);
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
  cursor: pointer;
  white-space: nowrap;
}

.filter-tab.active {
  background: var(--primary, #3b82f6);
  border-color: var(--primary, #3b82f6);
  color: #ffffff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-text {
  color: var(--text-muted, #64748b);
  font-size: 0.9375rem;
}

.debts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.debt-card {
  background: var(--bg-card, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 14px;
  padding: 1rem;
}

.debt-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.debt-person {
  display: flex;
  align-items: center;
  gap: 10px;
}

.person-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-lent {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.avatar-borrowed {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.person-name {
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  font-size: 0.9375rem;
}

.debt-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.type-badge {
  font-size: 0.6875rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-lent {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge-borrowed {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.date-badge {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  display: flex;
  align-items: center;
}

.remaining-val {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
}

.total-val {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
}

.progress-bar-track {
  width: 100%;
  height: 6px;
  background: var(--bg-card-hover, #334155);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar-fill {
  height: 100%;
  background: #10b981;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.debt-note {
  font-size: 0.8125rem;
  color: var(--text-muted, #94a3b8);
  font-style: italic;
  margin-bottom: 10px;
}

.debt-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color, #334155);
  padding-top: 10px;
  margin-top: 4px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
}

.pay-btn {
  color: var(--primary, #3b82f6);
  font-weight: 600;
}

.settled-tag {
  font-size: 0.8125rem;
  color: #10b981;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.delete-btn {
  padding: 4px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  width: 100%;
  max-width: 360px;
  background: var(--bg-surface, #1e293b);
  border-radius: 16px;
  padding: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-card, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 10px;
  color: var(--text-primary, #ffffff);
  font-size: 0.9375rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary, #94a3b8);
}

.btn-primary {
  background: var(--primary, #3b82f6);
  color: #ffffff;
}
</style>
