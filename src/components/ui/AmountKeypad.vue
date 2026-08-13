<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { tapFeedback } from '@/services/native/haptics'

const props = defineProps<{
  modelValue: string
  currencySymbol?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

function push(digit: string) {
  void tapFeedback()
  let next = props.modelValue
  if (digit === '.') {
    if (next.includes('.')) return
    next = next === '' ? '0.' : `${next}.`
  } else {
    if (next === '0' && digit !== '.') next = digit
    else {
      const [, dec] = next.split('.')
      if (dec && dec.length >= 2) return
      next = `${next}${digit}`
    }
  }
  emit('update:modelValue', next)
}

function backspace() {
  void tapFeedback()
  emit('update:modelValue', props.modelValue.slice(0, -1))
}

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const
</script>

<template>
  <div class="keypad">
    <div class="amount-display" aria-live="polite">
      <span class="currency">{{ currencySymbol ?? '$' }}</span>
      <span class="value">{{ modelValue || '0' }}</span>
    </div>
    <div class="keys" role="group" aria-label="Amount keypad">
      <button
        v-for="k in keys"
        :key="k"
        type="button"
        class="key"
        :aria-label="k === 'back' ? 'Backspace' : k === '.' ? 'Decimal' : k"
        @click="k === 'back' ? backspace() : push(k)"
      >
        <Delete v-if="k === 'back'" :size="22" />
        <template v-else>{{ k }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.keypad {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.amount-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-2);
  min-height: 64px;
  font-family: var(--font-display);
}

.currency {
  font-size: var(--text-title);
  color: var(--color-muted);
}

.value {
  font-size: clamp(2.5rem, 10vw, 3.25rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.keys {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.key {
  min-height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-container);
  font-size: 1.375rem;
  font-weight: 560;
  display: grid;
  place-items: center;
  transition: background var(--duration-fast) var(--ease-standard);
}

.key:active {
  background: var(--color-surface-container-high);
}
</style>
