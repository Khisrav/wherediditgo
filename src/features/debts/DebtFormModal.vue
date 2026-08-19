<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import { useDebtsStore } from '@/stores/debts'
import { useSettingsStore } from '@/stores/settings'
import type { DebtType } from '@/types/finance'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { t } = useI18n()
const debtsStore = useDebtsStore()
const settingsStore = useSettingsStore()

const type = ref<DebtType>('lent')
const personName = ref('')
const amount = ref<number | ''>('')
const dueDate = ref('')
const note = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!personName.value.trim() || !amount.value || amount.value <= 0) return
  isSubmitting.value = true
  try {
    await debtsStore.addDebt({
      type: type.value,
      personName: personName.value,
      amount: Number(amount.value),
      dueDate: dueDate.value || undefined,
      note: note.value || undefined,
    })
    emit('saved')
    emit('close')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">{{ t('debts.addDebt') }}</h3>
        <button type="button" class="icon-btn" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Type Switcher -->
        <div class="segmented-control">
          <button
            type="button"
            class="segment-btn"
            :class="{ active: type === 'lent' }"
            @click="type = 'lent'"
          >
            {{ t('debts.lent') }}
          </button>
          <button
            type="button"
            class="segment-btn"
            :class="{ active: type === 'borrowed' }"
            @click="type = 'borrowed'"
          >
            {{ t('debts.borrowed') }}
          </button>
        </div>

        <!-- Person Name -->
        <div class="form-group">
          <label class="form-label">{{ t('debts.personName') }}</label>
          <input
            v-model="personName"
            type="text"
            required
            class="form-input"
            placeholder="e.g. Farrukh, Alex"
          />
        </div>

        <!-- Amount -->
        <div class="form-group">
          <label class="form-label"
            >{{ t('debts.amount') }} ({{ settingsStore.currencySymbol }})</label
          >
          <input
            v-model.number="amount"
            type="number"
            step="any"
            required
            min="0.01"
            class="form-input"
            placeholder="0.00"
          />
        </div>

        <!-- Due Date -->
        <div class="form-group">
          <label class="form-label">{{ t('debts.dueDate') }} ({{ t('common.optional') }})</label>
          <input v-model="dueDate" type="date" class="form-input" />
        </div>

        <!-- Note -->
        <div class="form-group">
          <label class="form-label">{{ t('common.optional') }} Note</label>
          <input v-model="note" type="text" class="form-input" placeholder="e.g. Lunch money" />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isSubmitting || !personName.trim() || !amount"
          >
            {{ t('common.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
  max-width: 440px;
  background: var(--bg-surface, #1e293b);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.segmented-control {
  display: flex;
  background: var(--bg-card, #0f172a);
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
}

.segment-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.segment-btn.active {
  background: var(--primary, #3b82f6);
  color: #ffffff;
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
  margin-top: 0.5rem;
}

.btn {
  padding: 10px 16px;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
