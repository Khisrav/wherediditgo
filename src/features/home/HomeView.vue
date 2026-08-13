<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Settings, Wallet } from '@lucide/vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MonthNav from '@/components/ui/MonthNav.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { monthKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { spendByCategory, summarizeMonth } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'

const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const transactions = useTransactionsStore()
const ui = useUiStore()

const month = ref(monthKey())
const summary = computed(() =>
  summarizeMonth(transactions.transactions, budgets.budgets, month.value),
)
const tops = computed(() =>
  spendByCategory(transactions.transactions, categories.categories, month.value).slice(0, 4),
)
const recent = computed(() =>
  transactions.transactions.filter((t) => t.date.startsWith(month.value)).slice(0, 5),
)
const hasBudgets = computed(() => summary.value.budgetTotal > 0)
const budgetPct = computed(() => {
  if (!hasBudgets.value) return 0
  return Math.min(100, (summary.value.budgetSpent / summary.value.budgetTotal) * 100)
})
const heroLabel = computed(() => (hasBudgets.value ? 'Left to spend' : 'Net this month'))
const heroAmount = computed(() =>
  hasBudgets.value ? summary.value.leftToSpend : summary.value.net,
)
</script>

<template>
  <div class="home">
    <header class="top">
      <p class="brand">WhereDidItGo</p>
      <div class="actions">
        <RouterLink to="/accounts" class="icon-btn" aria-label="Accounts">
          <Wallet :size="22" />
        </RouterLink>
        <RouterLink to="/settings" class="icon-btn" aria-label="Settings">
          <Settings :size="22" />
        </RouterLink>
      </div>
    </header>

    <MonthNav v-model="month" label-as-heading />

    <section class="hero-card" aria-label="Month overview">
      <p class="eyebrow">{{ heroLabel }}</p>
      <p class="hero-amount" :class="{ negative: !hasBudgets && summary.net < 0 }">
        {{ formatMoney(heroAmount, settings.currency) }}
      </p>
      <ProgressBar
        v-if="hasBudgets"
        :value="budgetPct"
        :color="budgetPct > 90 ? 'var(--color-expense)' : 'var(--color-primary)'"
      />
      <p v-if="hasBudgets" class="hint">
        {{ formatMoney(summary.budgetSpent, settings.currency) }} of
        {{ formatMoney(summary.budgetTotal, settings.currency) }} budgeted
      </p>
      <p v-else class="hint">
        <RouterLink to="/budgets">Set budgets</RouterLink>
        to unlock a clear “left to spend” number
      </p>

      <div class="stats">
        <div>
          <span>Spent</span>
          <strong class="expense">{{ formatMoney(summary.expense, settings.currency) }}</strong>
        </div>
        <div>
          <span>Income</span>
          <strong class="income">{{ formatMoney(summary.income, settings.currency) }}</strong>
        </div>
        <div>
          <span>Net worth</span>
          <strong>{{ formatMoney(accounts.totalBalance, settings.currency) }}</strong>
        </div>
      </div>
    </section>

    <section v-if="tops.length" class="section">
      <div class="section-head">
        <h2>Where it went</h2>
        <RouterLink to="/insights">See all</RouterLink>
      </div>
      <div class="chips">
        <div v-for="c in tops" :key="c.categoryId" class="chip">
          <span class="dot" :style="{ background: c.color }" />
          <span class="chip-name">{{ c.name }}</span>
          <span class="chip-amt">{{ formatMoney(c.amount, settings.currency) }}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Recent</h2>
        <RouterLink to="/activity">See all</RouterLink>
      </div>

      <EmptyState
        v-if="!recent.length"
        title="Nothing logged yet"
        description="Tap + to add your first expense or income."
        action-label="Add transaction"
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

.eyebrow {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-amount {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 9vw, 3rem);
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1;
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
