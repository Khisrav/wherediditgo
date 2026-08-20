<script setup lang="ts">
import MoneyText from '@/components/ui/MoneyText.vue'
import type { InsightTone } from '@/services/stats'

defineProps<{
  tone: InsightTone
  rangeLabel: string
  title: string
  sub: string
  support?: string
  income: number
  expense: number
  net: number
  incomeLabel: string
  expenseLabel: string
  netLabel: string
}>()
</script>

<template>
  <section class="hero" :class="`hero--${tone}`" :aria-label="title">
    <p class="range">{{ rangeLabel }}</p>
    <h2 class="title">{{ title }}</h2>
    <p v-if="$slots.figure" class="figure" aria-live="polite">
      <slot name="figure" />
    </p>
    <p v-if="sub" class="sub">{{ sub }}</p>
    <p v-if="support" class="support">{{ support }}</p>

    <div class="metrics">
      <div>
        <span>{{ incomeLabel }}</span>
        <strong class="in"><MoneyText :amount="income" /></strong>
      </div>
      <div>
        <span>{{ expenseLabel }}</span>
        <strong class="out"><MoneyText :amount="expense" /></strong>
      </div>
      <div>
        <span>{{ netLabel }}</span>
        <strong :class="net >= 0 ? 'in' : 'out'">
          <MoneyText :amount="Math.abs(net)" :signed="net >= 0 ? 'income' : 'expense'" />
        </strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.hero--good {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}

.hero--warn {
  background: var(--color-tertiary-container);
  color: var(--color-on-tertiary-container);
}

.hero--neutral {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

.range {
  font-size: var(--text-label);
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.78;
}

.title {
  font-size: clamp(1.45rem, 6vw, 1.85rem);
  font-weight: 650;
}

.figure {
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 12vw, 3.4rem);
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1;
  margin: var(--space-2) 0 var(--space-1);
}

.sub,
.support {
  font-size: var(--text-body);
  max-width: 32ch;
}

.sub {
  opacity: 0.86;
}

.support {
  font-weight: 600;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, currentColor 8%, transparent);
}

.metrics span {
  display: block;
  font-size: var(--text-caption);
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.72;
  margin-bottom: 4px;
}

.metrics strong {
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  font-weight: 650;
}

.hero--neutral .in {
  color: var(--color-income);
}

.hero--neutral .out {
  color: var(--color-expense);
}
</style>
