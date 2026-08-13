<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import EmptyState from '@/components/ui/EmptyState.vue'
import MonthNav from '@/components/ui/MonthNav.vue'
import { monthKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { dailySpendInMonth, recentMonthsTrend, spendByCategory, summarizeMonth } from '@/services/stats'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { ChartPie } from '@lucide/vue'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { t } = useI18n()
const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const settings = useSettingsStore()
const ui = useUiStore()

const month = ref(monthKey())
const summary = computed(() =>
  summarizeMonth(transactions.transactions, budgets.budgets, month.value),
)
const byCat = computed(() =>
  spendByCategory(transactions.transactions, categories.categories, month.value),
)
const daily = computed(() => dailySpendInMonth(transactions.transactions, month.value))
const trend = computed(() =>
  recentMonthsTrend(transactions.transactions, 6, settings.intlLocale),
)

function money(amount: number) {
  return formatMoney(
    amount,
    settings.currency,
    settings.intlLocale,
    settings.currencyPosition,
  )
}

const doughnutData = computed(() => ({
  labels: byCat.value.map((c) => c.name),
  datasets: [
    {
      data: byCat.value.map((c) => c.amount / 100),
      backgroundColor: byCat.value.map((c) => c.color),
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}))

const barData = computed(() => ({
  labels: trend.value.map((row) => row.label),
  datasets: [
    {
      label: t('insights.expense'),
      data: trend.value.map((row) => row.expense / 100),
      backgroundColor: '#c43c3c',
      borderRadius: 6,
    },
    {
      label: t('insights.income'),
      data: trend.value.map((row) => row.income / 100),
      backgroundColor: '#1f7a4c',
      borderRadius: 6,
    },
  ],
}))

const dailyData = computed(() => ({
  labels: daily.value.map((d) => d.label),
  datasets: [
    {
      label: t('insights.spend'),
      data: daily.value.map((d) => d.expense / 100),
      backgroundColor: 'color-mix(in srgb, #0b6e6a 70%, transparent)',
      borderRadius: 4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { boxWidth: 12, usePointStyle: true },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(128,128,128,0.15)' }, beginAtZero: true },
  },
}
</script>

<template>
  <div class="insights">
    <header>
      <h1>{{ t('insights.title') }}</h1>
      <MonthNav v-model="month" />
    </header>

    <EmptyState
      v-if="!summary.expense && !summary.income"
      :title="t('insights.emptyTitle')"
      :description="t('insights.emptyDesc')"
      :action-label="t('nav.addTransaction')"
      @action="ui.openAdd()"
    >
      <template #icon>
        <ChartPie :size="28" />
      </template>
    </EmptyState>

    <template v-else>
      <section class="pair">
        <div class="stat">
          <span>{{ t('insights.income') }}</span>
          <strong class="income">{{ money(summary.income) }}</strong>
        </div>
        <div class="stat">
          <span>{{ t('insights.expenses') }}</span>
          <strong class="expense">{{ money(summary.expense) }}</strong>
        </div>
      </section>

      <section v-if="byCat.length" class="panel">
        <h2>{{ t('insights.byCategory') }}</h2>
        <div class="chart chart--donut">
          <Doughnut :data="doughnutData" :options="chartOptions" />
        </div>
        <ul class="legend">
          <li v-for="c in byCat" :key="c.categoryId">
            <span class="dot" :style="{ background: c.color }" />
            <span class="name">{{ c.name }}</span>
            <span class="pct">{{ c.percent.toFixed(0) }}%</span>
            <span class="amt">{{ money(c.amount) }}</span>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2>{{ t('insights.byDay') }}</h2>
        <div class="chart">
          <Bar :data="dailyData" :options="{ ...barOptions, plugins: { legend: { display: false } } }" />
        </div>
      </section>

      <section class="panel">
        <h2>{{ t('insights.last6Months') }}</h2>
        <div class="chart">
          <Bar :data="barData" :options="barOptions" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.insights {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

h1 {
  font-size: var(--text-headline);
  margin-bottom: var(--space-3);
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.stat {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.stat span {
  display: block;
  font-size: var(--text-caption);
  color: var(--color-muted);
  margin-bottom: 4px;
}

.stat strong {
  font-family: var(--font-display);
  font-size: var(--text-title);
}

.income {
  color: var(--color-income);
}

.expense {
  color: var(--color-expense);
}

.panel {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel h2 {
  font-size: var(--text-title);
}

.chart {
  height: 220px;
}

.chart--donut {
  height: 200px;
  max-width: 240px;
  margin: 0 auto;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.legend li {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--text-label);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.name {
  font-weight: 550;
}

.pct {
  color: var(--color-muted);
}

.amt {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  min-width: 5.5rem;
  text-align: right;
}
</style>
