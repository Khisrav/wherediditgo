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
    <span v-if="hidden" class="spoiler" aria-hidden="true">
      <span class="spoiler-dust spoiler-dust--a" />
      <span class="spoiler-dust spoiler-dust--b" />
      <span class="spoiler-dust spoiler-dust--c" />
    </span>
  </span>
</template>

<style scoped>
.money {
  --spoiler-dot: color-mix(in srgb, var(--color-on-surface) 82%, transparent);
  position: relative;
  display: inline-block;
  font-variant-numeric: tabular-nums;
  vertical-align: baseline;
  color: inherit;
}

.money-value {
  position: relative;
  z-index: 0;
}

.money--hidden {
  user-select: none;
}

.money--hidden .money-value {
  color: transparent;
}

.spoiler {
  position: absolute;
  inset: 0.14em -0.22em;
  border-radius: 0.4em;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
  background: color-mix(in srgb, var(--color-on-surface) 6%, transparent);
}

.money--hero .spoiler {
  inset: 0.08em -0.18em;
  border-radius: 0.28em;
}

.spoiler-dust {
  position: absolute;
  inset: -60%;
  background-image: radial-gradient(circle closest-side, var(--spoiler-dot) 54%, transparent 55%);
  background-size: 5px 5px;
  opacity: 0.55;
  will-change: transform, opacity;
}

.spoiler-dust--a {
  animation: spoiler-drift 0.34s steps(4) infinite;
}

.spoiler-dust--b {
  background-size: 7px 6px;
  opacity: 0.42;
  animation: spoiler-drift 0.46s steps(3) infinite reverse;
}

.spoiler-dust--c {
  background-size: 4px 8px;
  opacity: 0.32;
  animation: spoiler-drift 0.4s steps(5) infinite;
  animation-delay: -0.12s;
}

@keyframes spoiler-drift {
  0% {
    transform: translate(0, 0);
    opacity: 0.28;
  }
  25% {
    transform: translate(3px, -2px);
    opacity: 0.5;
  }
  50% {
    transform: translate(-2px, 3px);
    opacity: 0.34;
  }
  75% {
    transform: translate(2px, 1px);
    opacity: 0.46;
  }
  100% {
    transform: translate(0, 0);
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spoiler-dust {
    animation: none;
    opacity: 0.42;
  }
}
</style>
