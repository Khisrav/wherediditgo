<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Settings, Wallet, Eye, EyeOff } from '@lucide/vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import MonthNav from '@/components/ui/MonthNav.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { monthKey } from '@/lib/dates'
import { spendByCategory, summarizeMonth } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { toggleOffFeedback, toggleOnFeedback } from '@/services/native/haptics'
import type { HeroMetric } from '@/types/finance'

const { t } = useI18n()
const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const transactions = useTransactionsStore()
const ui = useUiStore()
const hideAmounts = computed(() => settings.hideAmounts)

const month = ref(monthKey())
const summary = computed(() =>
  summarizeMonth(transactions.transactions, budgets.budgets, month.value),
)
const tops = computed(() =>
  spendByCategory(transactions.transactions, categories.categories, month.value).slice(0, 4),
)
const recent = computed(() =>
  transactions.transactions.filter((tx) => tx.date.startsWith(month.value)).slice(0, 5),
)
const hasBudgets = computed(() => summary.value.budgetTotal > 0)
const showBudgetHero = computed(
  () => settings.heroMetric === 'budget' && hasBudgets.value,
)
const budgetPct = computed(() => {
  if (!hasBudgets.value) return 0
  return Math.min(100, (summary.value.budgetSpent / summary.value.budgetTotal) * 100)
})
const heroLabel = computed(() => {
  if (showBudgetHero.value) return t('home.budgetRemaining')
  if (settings.heroMetric === 'budget' && !hasBudgets.value) return t('home.netThisMonth')
  return t('home.availableBalance')
})
const heroAmount = computed(() => {
  if (showBudgetHero.value) return summary.value.leftToSpend
  if (settings.heroMetric === 'budget' && !hasBudgets.value) return summary.value.net
  return accounts.totalBalance
})
const heroNegative = computed(() => heroAmount.value < 0 && !hideAmounts.value)

function setMetric(metric: HeroMetric) {
  if (settings.heroMetric === metric) return
  void settings.setHeroMetric(metric)
  if (metric === 'budget') void toggleOnFeedback()
  else void toggleOffFeedback()
}

function toggleHide() {
  const next = !hideAmounts.value
  void settings.setHideAmounts(next)
  if (next) void toggleOffFeedback()
  else void toggleOnFeedback()
}
</script>

<template>
  <div class="home">
    <header class="top">
      <p class="brand">WhereDidItGo</p>
      <div class="actions">
        <RouterLink to="/accounts" class="icon-btn" :aria-label="t('home.accounts')">
          <Wallet :size="22" />
        </RouterLink>
        <RouterLink to="/settings" class="icon-btn" :aria-label="t('home.settings')">
          <Settings :size="22" />
        </RouterLink>
      </div>
    </header>

    <MonthNav v-model="month" label-as-heading />

    <section class="hero-card" :aria-label="t('home.monthOverview')">
      <div class="hero-seg" role="tablist" :aria-label="t('home.monthOverview')">
        <button
          type="button"
          role="tab"
          :class="{ active: settings.heroMetric === 'balance' }"
          :aria-selected="settings.heroMetric === 'balance'"
          @click="setMetric('balance')"
        >
          {{ t('home.metricBalance') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: settings.heroMetric === 'budget' }"
          :aria-selected="settings.heroMetric === 'budget'"
          @click="setMetric('budget')"
        >
          {{ t('home.metricBudget') }}
        </button>
      </div>

      <p class="eyebrow">{{ heroLabel }}</p>
      <div class="hero-amount-row">
        <p class="hero-amount" :class="{ negative: heroNegative }">
          <MoneyText :amount="heroAmount" size="hero" />
        </p>
        <button
          type="button"
          class="hide-btn"
          :aria-label="hideAmounts ? t('home.showAmounts') : t('home.hideAmounts')"
          :aria-pressed="hideAmounts"
          @click="toggleHide"
        >
          <EyeOff v-if="hideAmounts" :size="22" />
          <Eye v-else :size="22" />
        </button>
      </div>
      <ProgressBar
        v-if="showBudgetHero"
        :value="budgetPct"
        :color="budgetPct > 90 ? 'var(--color-expense)' : 'var(--color-primary)'"
      />
      <p v-if="showBudgetHero" class="hint">
        <MoneyText :amount="summary.budgetSpent" />
        {{ t('common.of') }}
        <MoneyText :amount="summary.budgetTotal" />
        {{ t('home.budgetedHintSuffix') }}
      </p>
      <p v-else-if="settings.heroMetric === 'budget'" class="hint">
        <RouterLink to="/budgets">{{ t('home.setBudgets') }}</RouterLink>
        {{ t('home.setBudgetsHint') }}
      </p>

      <div class="stats">
        <div>
          <span>{{ t('home.spent') }}</span>
          <strong class="expense"><MoneyText :amount="summary.expense" /></strong>
        </div>
        <div>
          <span>{{ t('home.income') }}</span>
          <strong class="income"><MoneyText :amount="summary.income" /></strong>
        </div>
        <div>
          <span>{{ t('home.netWorth') }}</span>
          <strong><MoneyText :amount="accounts.totalBalance" /></strong>
        </div>
      </div>
    </section>

    <section v-if="tops.length" class="section">
      <div class="section-head">
        <h2>{{ t('home.whereItWent') }}</h2>
        <RouterLink to="/insights">{{ t('home.seeAll') }}</RouterLink>
      </div>
      <div class="chips">
        <div v-for="c in tops" :key="c.categoryId" class="chip">
          <span class="dot" :style="{ background: c.color }" />
          <span class="chip-name">{{ c.name }}</span>
          <span class="chip-amt"><MoneyText :amount="c.amount" /></span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>{{ t('home.recent') }}</h2>
        <RouterLink to="/activity">{{ t('home.seeAll') }}</RouterLink>
      </div>

      <EmptyState
        v-if="!recent.length"
        :title="t('home.emptyTitle')"
        :description="t('home.emptyDesc')"
        :action-label="t('nav.addTransaction')"
        @action="ui.openAdd()"
      >
        <template #icon>
          <Wallet :size="28" />
        </template>
      </EmptyState>

      <div v-else class="list">
        <TransactionRow
          v-for="tx in recent"
          :key="tx.id"
          :transaction="tx"
          @select="ui.openAdd(tx)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-title);
  color: var(--color-primary);
}

.actions {
  display: flex;
  gap: var(--space-1);
}

.icon-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
}

.hero-card {
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.hero-seg button {
  min-height: 34px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
}

.hero-seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.eyebrow {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-amount-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.hero-amount {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 9vw, 3rem);
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1;
  min-width: 0;
}

.hide-btn {
  flex-shrink: 0;
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  margin-top: 2px;
  border-radius: var(--radius-full);
  color: var(--color-muted);
}

.hide-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.hero-amount.negative {
  color: var(--color-expense);
}

.hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.hint a {
  color: var(--color-primary);
  font-weight: 600;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-top: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-outline-variant);
}

.stats span {
  display: block;
  font-size: var(--text-caption);
  color: var(--color-muted);
  margin-bottom: 4px;
}

.stats strong {
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
}

.expense {
  color: var(--color-expense);
}

.income {
  color: var(--color-income);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.section-head h2 {
  font-size: var(--text-title);
}

.section-head a {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-primary);
}

.chips {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.chip-name {
  font-weight: 550;
}

.chip-amt {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.list {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-4);
}
</style>
