<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
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
import MoneyText from '@/components/ui/MoneyText.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import ActivityCalendar from '@/features/insights/ActivityCalendar.vue'
import { monthKey, shortDayLabel } from '@/lib/dates'
import {
  activityHeatmap,
  accountStatsInRange,
  budgetProgress,
  buildRangeInsights,
  formatTxDate,
  rangeForPeriod,
  recentMonthsTrend,
  spendByCategoryInRange,
  spendSeries,
  summarizeRange,
  type InsightsPeriod,
} from '@/services/stats'
import { tickFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useGoalsStore } from '@/stores/goals'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { ArrowDown, ArrowUp, ChartPie } from '@lucide/vue'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const PERIODS: InsightsPeriod[] = ['7d', '30d', '90d', 'all']
const periodLabelKey: Record<InsightsPeriod, 'period7d' | 'period30d' | 'period90d' | 'periodAll'> = {
  '7d': 'period7d',
  '30d': 'period30d',
  '90d': 'period90d',
  all: 'periodAll',
}

const { t } = useI18n()
const router = useRouter()
const transactions = useTransactionsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const goals = useGoalsStore()
const settings = useSettingsStore()
const ui = useUiStore()
const hideAmounts = computed(() => settings.hideAmounts)

const period = ref<InsightsPeriod>('30d')
const range = computed(() => rangeForPeriod(period.value))
const rangeLabel = computed(() => {
  if (period.value === 'all') return t('insights.allTime')
  if (!range.value.start) return t('insights.allTime')
  return `${shortDayLabel(range.value.start, settings.intlLocale)} – ${shortDayLabel(range.value.end, settings.intlLocale)}`
})

function setPeriod(next: InsightsPeriod) {
  if (period.value === next) return
  period.value = next
  void tickFeedback()
}

function openCategory(categoryId: string) {
  void router.push({ name: 'activity', query: { category: categoryId } })
}

const summary = computed(() => summarizeRange(transactions.transactions, range.value))
const byCat = computed(() =>
  spendByCategoryInRange(transactions.transactions, categories.categories, range.value),
)
const seriesBucket = computed(() => {
  if (period.value === 'all') return 'month' as const
  if (period.value === '90d' || period.value === '30d') return 'week' as const
  return 'day' as const
})
const seriesTitle = computed(() => {
  if (seriesBucket.value === 'month') return t('insights.byMonth')
  if (seriesBucket.value === 'week') return t('insights.byWeek')
  return t('insights.byDay')
})
const series = computed(() =>
  spendSeries(transactions.transactions, range.value, seriesBucket.value, settings.intlLocale),
)
const trend = computed(() =>
  recentMonthsTrend(transactions.transactions, 6, settings.intlLocale),
)
const accountRows = computed(() =>
  accountStatsInRange(transactions.transactions, accounts.active, range.value),
)
const extra = computed(() =>
  buildRangeInsights(transactions.transactions, categories.categories, range.value),
)
const heatmap = computed(() =>
  activityHeatmap(transactions.transactions, settings.intlLocale),
)
const budgetRows = computed(() =>
  budgetProgress(budgets.budgets, transactions.transactions, categories.categories, monthKey()),
)
const budgetOver = computed(() => budgetRows.value.filter((r) => r.remaining < 0).length)
const goalRows = computed(() =>
  goals.goals.map((goal) => ({
    goal,
    percent:
      goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0,
  })),
)
const weekdayPct = computed(() => {
  const total = extra.value.weekdayExpense + extra.value.weekendExpense
  if (!total) return 0
  return (extra.value.weekdayExpense / total) * 100
})
const weekendPct = computed(() => {
  const total = extra.value.weekdayExpense + extra.value.weekendExpense
  if (!total) return 0
  return (extra.value.weekendExpense / total) * 100
})
const hasActivity = computed(() => summary.value.expense > 0 || summary.value.income > 0)
const hasAnyTx = computed(() => transactions.transactions.length > 0)
const isEmpty = computed(() => !hasAnyTx.value && !accountRows.value.length)

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

const seriesData = computed(() => ({
  labels: series.value.map((d) => d.label),
  datasets: [
    {
      label: t('insights.spend'),
      data: series.value.map((d) => d.expense / 100),
      backgroundColor: 'color-mix(in srgb, #0b6e6a 70%, transparent)',
      borderRadius: 4,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: !hideAmounts.value },
  },
}))

const doughnutOptions = computed(() => ({
  ...chartOptions.value,
  onClick: (_event: unknown, elements: Array<{ index: number }>) => {
    const i = elements[0]?.index
    if (i == null) return
    const cat = byCat.value[i]
    if (cat) openCategory(cat.categoryId)
  },
}))

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { boxWidth: 12, usePointStyle: true },
    },
    tooltip: { enabled: !hideAmounts.value },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: 'rgba(128,128,128,0.15)' },
      beginAtZero: true,
      ticks: { display: !hideAmounts.value },
    },
  },
}))

const seriesBarOptions = computed(() => ({
  ...barOptions.value,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: !hideAmounts.value },
  },
  scales: {
    ...barOptions.value.scales,
    x: {
      grid: { display: false },
      ticks: { maxTicksLimit: period.value === '30d' ? 8 : 12, autoSkip: true },
    },
  },
}))
</script>

<template>
  <div class="insights">
    <header>
      <h1>{{ t('insights.title') }}</h1>
      <div class="seg" role="radiogroup" :aria-label="t('insights.periodAria')">
        <button
          v-for="p in PERIODS"
          :key="p"
          type="button"
          role="radio"
          :aria-checked="period === p"
          :class="{ active: period === p }"
          @click="setPeriod(p)"
        >
          {{ t(`insights.${periodLabelKey[p]}`) }}
        </button>
      </div>
      <p class="range-label">{{ rangeLabel }}</p>
    </header>

    <EmptyState
      v-if="isEmpty"
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
      <section class="quad">
        <div class="stat">
          <span>{{ t('insights.income') }}</span>
          <strong class="income"><MoneyText :amount="summary.income" /></strong>
        </div>
        <div class="stat">
          <span>{{ t('insights.expenses') }}</span>
          <strong class="expense"><MoneyText :amount="summary.expense" /></strong>
        </div>
        <div class="stat">
          <span>{{ t('insights.net') }}</span>
          <strong :class="summary.net >= 0 ? 'income' : 'expense'">
            <MoneyText
              :amount="Math.abs(summary.net)"
              :signed="summary.net >= 0 ? 'income' : 'expense'"
            />
          </strong>
        </div>
        <div class="stat">
          <span>{{ t('insights.savingsRate') }}</span>
          <strong :class="(extra.savingsRate ?? 0) >= 0 ? 'income' : 'expense'">
            <MoneyText
              :text="extra.savingsRate == null ? '—' : `${Math.round(extra.savingsRate)}%`"
            />
          </strong>
        </div>
      </section>

      <ActivityCalendar :heatmap="heatmap" />

      <section v-if="accountRows.length" class="panel">
        <h2>{{ t('insights.accounts') }}</h2>
        <ul class="accounts">
          <li v-for="row in accountRows" :key="row.account.id">
            <span class="dot" :style="{ background: row.account.color }" />
            <div class="acc-meta">
              <strong>{{ row.account.name }}</strong>
              <span class="acc-flow">
                <span class="income" :aria-label="t('insights.accountIn')">
                  <ArrowDown :size="14" :stroke-width="2.5" aria-hidden="true" />
                  <MoneyText :amount="row.income + row.transferIn" />
                </span>
                <span class="expense" :aria-label="t('insights.accountOut')">
                  <ArrowUp :size="14" :stroke-width="2.5" aria-hidden="true" />
                  <MoneyText :amount="row.expense + row.transferOut" />
                </span>
              </span>
            </div>
            <div class="acc-amt">
              <strong><MoneyText :amount="row.account.balance" /></strong>
              <span :class="row.net >= 0 ? 'income' : 'expense'">
                <MoneyText
                  :amount="Math.abs(row.net)"
                  :signed="row.net >= 0 ? 'income' : 'expense'"
                />
              </span>
            </div>
          </li>
        </ul>
      </section>

      <EmptyState
        v-if="!hasActivity"
        :title="t('insights.emptyPeriodTitle')"
        :description="t('insights.emptyPeriodDesc')"
        :action-label="t('nav.addTransaction')"
        @action="ui.openAdd()"
      >
        <template #icon>
          <ChartPie :size="28" />
        </template>
      </EmptyState>

      <template v-else>
        <section class="panel">
          <h2>{{ t('insights.pace') }}</h2>
          <p class="lede">
            {{ period === 'all' ? t('insights.allTime') : t('insights.paceRange', { days: extra.days }) }}
          </p>
          <div class="mini-pair">
            <div>
              <span>{{ t('insights.perDay') }}</span>
              <strong><MoneyText :amount="extra.avgDaily" /></strong>
            </div>
            <div>
              <span>{{ t('insights.avgTx') }}</span>
              <strong><MoneyText :amount="extra.avgExpense" /></strong>
            </div>
            <div>
              <span>{{ t('insights.txCount') }}</span>
              <strong>{{ extra.txCount }}</strong>
            </div>
          </div>
        </section>

        <section v-if="period !== 'all'" class="panel">
          <h2>{{ t('insights.vsPrevious') }}</h2>
          <p class="compare" :class="extra.delta <= 0 ? 'income' : 'expense'">
            <template v-if="extra.lastExpense <= 0">{{ t('insights.noPrevious') }}</template>
            <template v-else-if="Math.abs(extra.deltaPct ?? 0) < 0.5">{{ t('insights.sameAsPrev') }}</template>
            <template v-else-if="(extra.deltaPct ?? 0) > 0">
              {{ t('insights.moreThanPrev', { pct: Math.abs(extra.deltaPct ?? 0).toFixed(0) }) }}
            </template>
            <template v-else>
              {{ t('insights.lessThanPrev', { pct: Math.abs(extra.deltaPct ?? 0).toFixed(0) }) }}
            </template>
          </p>
          <p class="lede">
            {{ t('insights.previousSpend') }}
            <MoneyText :amount="extra.lastExpense" />
          </p>
        </section>

        <section v-if="extra.largest" class="panel">
          <h2>{{ t('insights.biggest') }}</h2>
          <div class="hit">
            <div class="hit-meta">
              <strong>{{ extra.largest.categoryName || t('transaction.uncategorized') }}</strong>
              <span>
                {{ formatTxDate(extra.largest.date, settings.intlLocale) }}
                <template v-if="extra.largest.note"> · {{ extra.largest.note }}</template>
              </span>
            </div>
            <strong class="expense"><MoneyText :amount="extra.largest.amount" signed="expense" /></strong>
          </div>
        </section>

        <section v-if="extra.weekdayExpense || extra.weekendExpense" class="panel">
          <h2>{{ t('insights.weekSplit') }}</h2>
          <div class="split">
            <div>
              <div class="split-head">
                <span>{{ t('insights.weekdays') }}</span>
                <MoneyText :amount="extra.weekdayExpense" />
              </div>
              <ProgressBar :value="weekdayPct" />
            </div>
            <div>
              <div class="split-head">
                <span>{{ t('insights.weekends') }}</span>
                <MoneyText :amount="extra.weekendExpense" />
              </div>
              <ProgressBar :value="weekendPct" color="var(--color-tertiary)" />
            </div>
          </div>
        </section>

        <section v-if="budgetRows.length" class="panel">
          <h2>{{ t('insights.budgetHealth') }}</h2>
          <p class="lede" :class="{ expense: budgetOver > 0 }">
            {{ t('insights.overBudget', { count: budgetOver }) }}
          </p>
          <ul class="budget-list">
            <li v-for="row in budgetRows.slice(0, 4)" :key="row.budget.id">
              <span>{{ row.category.name }}</span>
              <ProgressBar
                :value="row.percent"
                :color="row.percent > 100 ? 'var(--color-expense)' : row.category.color"
              />
              <MoneyText :amount="Math.abs(row.remaining)" />
            </li>
          </ul>
        </section>

        <section v-if="goalRows.length" class="panel">
          <h2>{{ t('insights.goals') }}</h2>
          <ul class="budget-list">
            <li v-for="row in goalRows" :key="row.goal.id">
              <span>{{ row.goal.name }}</span>
              <ProgressBar :value="row.percent" :color="row.goal.color" />
              <MoneyText :text="`${Math.round(row.percent)}%`" />
            </li>
          </ul>
        </section>

        <section v-if="byCat.length" class="panel">
          <h2>{{ t('insights.byCategory') }}</h2>
          <div class="chart chart--donut">
            <Doughnut :data="doughnutData" :options="doughnutOptions" />
          </div>
          <ul class="legend">
            <li v-for="c in byCat" :key="c.categoryId">
              <button type="button" class="legend-btn" @click="openCategory(c.categoryId)">
                <span class="dot" :style="{ background: c.color }" />
                <span class="name">{{ c.name }}</span>
                <span class="pct"><MoneyText :text="`${c.percent.toFixed(0)}%`" /></span>
                <span class="amt"><MoneyText :amount="c.amount" /></span>
              </button>
            </li>
          </ul>
        </section>

        <section class="panel">
          <h2>{{ seriesTitle }}</h2>
          <div class="chart">
            <Bar :data="seriesData" :options="seriesBarOptions" />
          </div>
        </section>

        <section v-if="period !== 'all'" class="panel">
          <h2>{{ t('insights.last6Months') }}</h2>
          <div class="chart">
            <Bar :data="barData" :options="barOptions" />
          </div>
        </section>
      </template>
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

.seg {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: var(--touch-min);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-muted);
  white-space: nowrap;
  padding: 0 var(--space-1);
}

@media (max-width: 360px) {
  .seg button {
    font-size: 0.75rem;
  }
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.range-label {
  margin-top: var(--space-3);
  text-align: center;
  font-size: var(--text-body);
  font-weight: 550;
  color: var(--color-muted);
}

.quad {
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
  font-size: var(--text-label);
  font-weight: 550;
  color: var(--color-muted);
  margin-bottom: 6px;
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
  gap: var(--space-3);
}

.legend li {
  display: block;
}

.legend-btn {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  text-align: left;
  font-size: var(--text-body);
  min-height: 40px;
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

.accounts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.accounts li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
}

.acc-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.acc-meta strong {
  font-weight: 550;
  font-size: var(--text-body);
}

.acc-flow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-label);
}

.acc-flow > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.acc-amt {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.acc-amt strong {
  font-weight: 650;
  font-size: var(--text-body);
}

.acc-amt span {
  font-size: var(--text-label);
  font-weight: 600;
}

.lede {
  font-size: var(--text-body);
  color: var(--color-muted);
}

.mini-pair {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.mini-pair span {
  display: block;
  font-size: var(--text-label);
  font-weight: 550;
  color: var(--color-muted);
  margin-bottom: 4px;
}

.mini-pair strong {
  font-variant-numeric: tabular-nums;
  font-size: var(--text-body);
  font-weight: 650;
}

.compare {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 650;
}

.hit {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.hit-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.hit-meta strong {
  font-size: var(--text-body);
}

.hit-meta span {
  font-size: var(--text-label);
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.split {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.split-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
  font-size: var(--text-body);
  font-weight: 600;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.budget-list li {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--text-body);
}

.budget-list li span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 550;
}
</style>
