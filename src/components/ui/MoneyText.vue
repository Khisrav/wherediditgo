<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMoney } from '@/lib/money'
import { useSettingsStore } from '@/stores/settings'
import type { TransactionType } from '@/types/finance'

const props = withDefaults(
  defineProps<{
    amount?: number
    /** Preformatted string (e.g. a percent) instead of a money value. */
    text?: string
    signed?: TransactionType | null
    size?: 'sm' | 'md' | 'hero'
  }>(),
  {
    amount: 0,
    text: '',
    signed: null,
    size: 'md',
  },
)

const { t } = useI18n()
const settings = useSettingsStore()
const hidden = computed(() => settings.hideAmounts)

const display = computed(() => {
  if (props.text) return props.text
  const formatted = formatMoney(
    props.amount,
    settings.currency,
    settings.intlLocale,
    settings.currencyPosition,
  )
  if (props.signed === 'income') return `+${formatted}`
  if (props.signed === 'expense') return `−${formatted}`
  return formatted
})
</script>

<template>
  <span
    class="money"
    :class="[`money--${size}`, { 'money--hidden': hidden }]"
    :aria-label="hidden ? t('home.hiddenAmount') : undefined"
  >
    <span class="money-value" :aria-hidden="hidden">{{ display }}</span>
  </span>
</template>

<style scoped>
.money {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  vertical-align: baseline;
  color: inherit;
}

.money--hidden {
  filter: blur(max(10px, 0.42em));
  user-select: none;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .money {
    transition: filter 180ms var(--ease-standard);
  }
}
</style>
