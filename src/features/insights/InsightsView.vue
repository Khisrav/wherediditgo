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
import MoneyText from '@/components/ui/MoneyText.vue'
import MonthNav from '@/components/ui/MonthNav.vue'
import { monthKey } from '@/lib/dates'
import { dailySpendInMonth, recentMonthsTrend, spendByCategory, summarizeMonth, accountStatsInMonth, buildMonthInsights, budgetProgress, formatTxDate } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useGoalsStore } from '@/stores/goals'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { ArrowDown, ArrowUp, ChartPie } from '@lucide/vue'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { t } = useI18n()
const transactions = useTransactionsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const goals = useGoalsStore()
const settings = useSettingsStore()
const ui = useUiStore()
const hideAmounts = computed(() => settings.hideAmounts)

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
const accountRows = computed(() =>
  accountStatsInMonth(transactions.transactions, accounts.active, month.value),
)
const extra = computed(() =>
  buildMonthInsights(transactions.transactions, categories.categories, month.value),
)
const budgetRows = computed(() =>
  budgetProgress(budgets.budgets, transactions.transactions, categories.categories, month.value),
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
const pacePct = computed(() =>
  extra.value.daysInMonth > 0 ? (extra.value.day / extra.value.daysInMonth) * 100 : 0,
)
const hasActivity = computed(() => summary.value.expense > 0 || summary.value.income > 0)

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

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: !hideAmounts.value },
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

const dailyBarOptions = computed(() => ({
  ...barOptions.value,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: !hideAmounts.value },
  },
}))
</script>

<template>
  <div class="insights">
    <header>
      <h1>{{ t('insights.title') }}</h1>
      <MonthNav v-model="month" />
    </header>

    <EmptyState
      v-if="!hasActivity && !accountRows.length"
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
      <section v-if="hasActivity" class="quad">
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

      <section v-if="accountRows.length" class="panel">
        <h2>{{ t('insights.accounts') }}</h2>
        <ul class="accounts">
          <li v-for="row in accountRows" :key="row.account.id">
            <span class="dot" :style="{ background: row.account.color }" />
            <div class="acc-meta">
              <strong>{{ row.account.name }}</strong>
              <span class="acc-flow">
                <span class="income" :aria-label="t('insights.accountIn')">
                  <ArrowDown :size="12" :stroke-width="2.5" aria-hidden="true" />
                  <MoneyText :amount="row.income + row.transferIn" />
                </span>
                <span class="expense" :aria-label="t('insights.accountOut')">
                  <ArrowUp :size="12" :stroke-width="2.5" aria-hidden="true" />
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

      <section class="panel">
        <h2>{{ t('insights.pace') }}</h2>
        <p class="lede">
          {{ t('insights.paceDay', { day: extra.day, days: extra.daysInMonth }) }}
          · {{ t('insights.daysLeft', { count: extra.daysLeft }) }}
        </p>
        <ProgressBar :value="pacePct" />
        <div class="mini-pair">
          <div>
            <span>{{ t('insights.perDay') }}</span>
            <strong><MoneyText :amount="extra.avgDaily" /></strong>
          </div>
          <div>
            <span>{{ t('insights.projected') }}</span>
            <strong><MoneyText :amount="extra.projected" /></strong>
          </div>
          <div>
            <span>{{ t('insights.avgTx') }}</span>
            <strong><MoneyText :amount="extra.avgExpense" /></strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>{{ t('insights.vsLastMonth') }}</h2>
        <p
          class="compare"
          :class="extra.delta <= 0 ? 'income' : 'expense'"
        >
          <template v-if="extra.lastExpense <= 0">{{ t('insights.noLastMonth') }}</template>
          <template v-else-if="Math.abs(extra.deltaPct ?? 0) < 0.5">{{ t('insights.sameAsLast') }}</template>
          <template v-else-if="(extra.deltaPct ?? 0) > 0">
            {{ t('insights.moreThanLast', { pct: Math.abs(extra.deltaPct ?? 0).toFixed(0) }) }}
          </template>
          <template v-else>
            {{ t('insights.lessThanLast', { pct: Math.abs(extra.deltaPct ?? 0).toFixed(0) }) }}
          </template>
        </p>
        <p class="lede">
          {{ t('insights.lastMonthSpend') }}
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
          <Doughnut :data="doughnutData" :options="chartOptions" />
        </div>
        <ul class="legend">
          <li v-for="c in byCat" :key="c.categoryId">
            <span class="dot" :style="{ background: c.color }" />
            <span class="name">{{ c.name }}</span>
            <span class="pct"><MoneyText :text="`${c.percent.toFixed(0)}%`" /></span>
            <span class="amt"><MoneyText :amount="c.amount" /></span>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2>{{ t('insights.byDay') }}</h2>
        <div class="chart">
          <Bar :data="dailyData" :options="dailyBarOptions" />
        </div>
      </section>

      <section class="panel">
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

.pair,
.quad {
  display: grid;
  gap: var(--space-3);
}

.pair {
  grid-template-columns: 1fr 1fr;
}

.quad {
  grid-template-columns: 1fr 1fr;
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
  gap: 2px;
  min-width: 0;
}

.acc-meta strong {
  font-weight: 550;
}

.acc-flow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--text-caption);
}

.acc-flow > span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.acc-amt {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}

.acc-amt strong {
  font-weight: 650;
}

.acc-amt span {
  font-size: var(--text-caption);
  font-weight: 600;
}

.lede {
  font-size: var(--text-label);
  color: var(--color-muted);
}

.mini-pair {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.mini-pair span {
  display: block;
  font-size: var(--text-caption);
  color: var(--color-muted);
  margin-bottom: 4px;
}

.mini-pair strong {
  font-variant-numeric: tabular-nums;
  font-size: var(--text-label);
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
  gap: 2px;
  min-width: 0;
}

.hit-meta span {
  font-size: var(--text-caption);
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
  font-size: var(--text-label);
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
  font-size: var(--text-label);
}

.budget-list li span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 550;
}
</style>
