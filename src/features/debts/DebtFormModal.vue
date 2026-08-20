<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { useDebtsStore } from '@/stores/debts'
import { useSettingsStore } from '@/stores/settings'
import { tickFeedback } from '@/services/native/haptics'
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
      personName: personName.value.trim(),
      amount: Number(amount.value),
      dueDate: dueDate.value || undefined,
      note: note.value.trim() || undefined,
    })
    void tickFeedback()
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
          <IconByName name="x" :size="20" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Segmented Type Switcher -->
        <div class="seg" role="tablist">
          <button
            type="button"
            role="tab"
            :class="{ active: type === 'lent' }"
            @click="type = 'lent'"
          >
            {{ t('debts.lent') }}
          </button>
          <button
            type="button"
            role="tab"
            :class="{ active: type === 'borrowed' }"
            @click="type = 'borrowed'"
          >
            {{ t('debts.borrowed') }}
          </button>
        </div>

        <!-- Person Name -->
        <label class="field">
          <span>{{ t('debts.personName') }}</span>
          <input
            v-model="personName"
            type="text"
            required
            autocomplete="off"
            placeholder="e.g. Farrukh, Alex"
          />
        </label>

        <!-- Amount -->
        <label class="field">
          <span>{{ t('debts.amount') }} ({{ settingsStore.currencySymbol }})</span>
          <input
            v-model.number="amount"
            type="number"
            inputmode="decimal"
            step="any"
            required
            min="0.01"
            placeholder="0.00"
          />
        </label>

        <!-- Due Date -->
        <label class="field">
          <span>{{ t('debts.dueDate') }} ({{ t('common.optional') }})</span>
          <input v-model="dueDate" type="date" />
        </label>

        <!-- Note -->
        <label class="field">
          <span>{{ t('common.optional') }} Note</span>
          <input v-model="note" type="text" placeholder="e.g. Lunch money" />
        </label>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <AppButton
            type="submit"
            :disabled="isSubmitting || !personName.trim() || !amount"
          >
            {{ t('common.save') }}
          </AppButton>
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  margin: 0;
  color: var(--color-on-surface);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 36px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field span {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
}

.field input {
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-body);
}

.field input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.cancel-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-weight: 600;
  font-size: var(--text-label);
  cursor: pointer;
  padding: 8px 12px;
}
</style>
