<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { tapFeedback } from '@/services/native/haptics'
import type { CurrencyPosition } from '@/types/finance'

const props = withDefaults(
  defineProps<{
    modelValue: string
    currencySymbol?: string
    currencyPosition?: CurrencyPosition
  }>(),
  {
    currencySymbol: '$',
    currencyPosition: 'before',
  },
)

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
      <span v-if="currencyPosition === 'before'" class="currency">{{ currencySymbol }}</span>
      <span class="value">{{ modelValue || '0' }}</span>
      <span v-if="currencyPosition === 'after'" class="currency">{{ currencySymbol }}</span>
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
        <Delete v-if="k === 'back'" :size="18" />
        <template v-else>{{ k }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.keypad {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.amount-display {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-family: var(--font-display);
}

.currency {
  font-size: 1rem;
  color: var(--color-muted);
}

.value {
  font-size: clamp(1.75rem, 7vw, 2.25rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.keys {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.key {
  min-height: 0;
  border-radius: var(--radius-md);
  background: var(--color-surface-container);
  font-size: 1.125rem;
  font-weight: 560;
  display: grid;
  place-items: center;
  transition: background var(--duration-fast) var(--ease-standard);
}

.key:active {
  background: var(--color-surface-container-high);
}
</style>
