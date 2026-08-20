<script setup lang="ts">
import { computed } from 'vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import type { DaySpend } from '@/services/stats'

const props = defineProps<{
  title: string
  lede: string
  series: DaySpend[]
  avgDaily: number
  perDaySuffix: string
}>()

const max = computed(() => Math.max(...props.series.map((row) => row.expense), 1))
const peakDate = computed(() => {
  let best = props.series[0]
  for (const row of props.series) {
    if (row.expense > (best?.expense ?? 0)) best = row
  }
  return best?.date
})

function height(row: DaySpend) {
  return `${Math.max(6, (row.expense / max.value) * 100)}%`
}

function showTick(index: number) {
  const n = props.series.length
  if (n <= 8) return true
  if (n <= 14) return index === 0 || index === n - 1 || index % 2 === 0
  return index === 0 || index === n - 1 || index === Math.floor((n - 1) / 2)
}

function tickLabel(row: DaySpend) {
  if (row.date.length >= 10 && props.series.length > 12) {
    return String(Number.parseInt(row.date.slice(8, 10), 10))
  }
  return row.label
}
</script>

<template>
  <section class="panel" :aria-label="title">
    <div class="head">
      <h2>{{ title }}</h2>
      <p class="lede">{{ lede }}</p>
    </div>
    <div class="spark" role="img" :aria-label="lede">
      <div
        v-for="(row, index) in series"
        :key="row.date"
        class="col"
      >
        <span
          class="bar"
          :class="{ peak: row.date === peakDate && row.expense > 0 }"
          :style="{ height: height(row) }"
        />
        <span class="tick" :class="{ ghost: !showTick(index) }">{{ tickLabel(row) }}</span>
      </div>
    </div>
    <p v-if="avgDaily > 0" class="pace">
      <MoneyText :amount="avgDaily" />
      {{ perDaySuffix }}
    </p>
  </section>
</template>

<style scoped>
.panel {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

h2 {
  font-size: var(--text-title);
}

.lede {
  font-size: var(--text-body);
  color: var(--color-muted);
}

.spark {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  align-items: end;
  gap: 4px;
  height: 108px;
}

.col {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 18px;
  border-radius: 6px 6px 3px 3px;
  background: color-mix(in srgb, var(--color-primary) 42%, var(--color-surface-container));
}

.bar.peak {
  background: var(--color-primary);
}

.tick {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  text-overflow: clip;
}

.tick.ghost {
  visibility: hidden;
}

.pace {
  font-size: var(--text-label);
  font-weight: 650;
  color: var(--color-muted);
}

@media (prefers-reduced-motion: no-preference) {
  .bar {
    transition: height var(--duration-slow) var(--ease-emphasized);
  }
}
</style>
