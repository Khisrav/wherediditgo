<script setup lang="ts">
import MoneyText from '@/components/ui/MoneyText.vue'
import type { CategorySpend } from '@/services/stats'

defineProps<{
  title: string
  rows: CategorySpend[]
  otherId?: string
}>()

const emit = defineEmits<{
  select: [categoryId: string]
}>()

function rowLabel(row: CategorySpend) {
  return `${row.name} ${Math.round(row.percent)}%`
}
</script>

<template>
  <section class="panel" :aria-label="title">
    <h2>{{ title }}</h2>
    <div
      class="stack"
      role="img"
      :aria-label="rows.map(rowLabel).join(', ')"
    >
      <span
        v-for="row in rows"
        :key="row.categoryId"
        class="slice"
        :style="{ flexGrow: Math.max(row.percent, 0.4), background: row.color }"
        :title="rowLabel(row)"
      />
    </div>
    <ul>
      <li v-for="row in rows" :key="row.categoryId">
        <button
          v-if="row.categoryId !== otherId"
          type="button"
          class="row"
          @click="emit('select', row.categoryId)"
        >
          <span class="dot" :style="{ background: row.color }" />
          <span class="name">{{ row.name }}</span>
          <span class="bar" aria-hidden="true">
            <i :style="{ width: `${row.percent}%`, background: row.color }" />
          </span>
          <span class="pct"><MoneyText :text="`${row.percent.toFixed(0)}%`" /></span>
          <span class="amt"><MoneyText :amount="row.amount" /></span>
        </button>
        <div v-else class="row row--static">
          <span class="dot" :style="{ background: row.color }" />
          <span class="name">{{ row.name }}</span>
          <span class="bar" aria-hidden="true">
            <i :style="{ width: `${row.percent}%`, background: row.color }" />
          </span>
          <span class="pct"><MoneyText :text="`${row.percent.toFixed(0)}%`" /></span>
          <span class="amt"><MoneyText :amount="row.amount" /></span>
        </div>
      </li>
    </ul>
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

h2 {
  font-size: var(--text-title);
}

.stack {
  display: flex;
  height: 14px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  gap: 2px;
}

.slice {
  min-width: 4px;
  border-radius: 2px;
}

ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1.1fr) minmax(3.5rem, 1fr) 2.6rem auto;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  min-height: var(--touch-min);
  padding: 0 var(--space-1);
  text-align: left;
  border-radius: var(--radius-md);
}

.row:hover,
.row:focus-visible {
  background: var(--color-surface-container);
}

.row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.row--static {
  cursor: default;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.name {
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.pct {
  color: var(--color-muted);
  font-size: var(--text-label);
  text-align: right;
}

.amt {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-width: 4.8rem;
}

@media (prefers-reduced-motion: no-preference) {
  .bar i {
    transition: width var(--duration-slow) var(--ease-emphasized);
  }
}
</style>
