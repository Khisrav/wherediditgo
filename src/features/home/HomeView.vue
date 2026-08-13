<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()
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
  transactions.transactions.filter((tx) => tx.date.startsWith(month.value)).slice(0, 5),
)
const hasBudgets = computed(() => summary.value.budgetTotal > 0)
const budgetPct = computed(() => {
  if (!hasBudgets.value) return 0
  return Math.min(100, (summary.value.budgetSpent / summary.value.budgetTotal) * 100)
})
const heroLabel = computed(() =>
  hasBudgets.value ? t('home.leftToSpend') : t('home.netThisMonth'),
)
const heroAmount = computed(() =>
  hasBudgets.value ? summary.value.leftToSpend : summary.value.net,
)

function money(amount: number) {
  return formatMoney(
    amount,
    settings.currency,
    settings.intlLocale,
    settings.currencyPosition,
  )
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
      <p class="eyebrow">{{ heroLabel }}</p>
      <p class="hero-amount" :class="{ negative: !hasBudgets && summary.net < 0 }">
        {{ money(heroAmount) }}
      </p>
      <ProgressBar
        v-if="hasBudgets"
        :value="budgetPct"
        :color="budgetPct > 90 ? 'var(--color-expense)' : 'var(--color-primary)'"
      />
      <p v-if="hasBudgets" class="hint">
        {{
          t('home.budgetedHint', {
            spent: money(summary.budgetSpent),
            total: money(summary.budgetTotal),
          })
        }}
      </p>
      <p v-else class="hint">
        <RouterLink to="/budgets">{{ t('home.setBudgets') }}</RouterLink>
        {{ t('home.setBudgetsHint') }}
      </p>

      <div class="stats">
        <div>
          <span>{{ t('home.spent') }}</span>
          <strong class="expense">{{ money(summary.expense) }}</strong>
        </div>
        <div>
          <span>{{ t('home.income') }}</span>
          <strong class="income">{{ money(summary.income) }}</strong>
        </div>
        <div>
          <span>{{ t('home.netWorth') }}</span>
          <strong>{{ money(accounts.totalBalance) }}</strong>
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
          <span class="chip-amt">{{ money(c.amount) }}</span>
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
