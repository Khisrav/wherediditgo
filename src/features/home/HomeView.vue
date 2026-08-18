<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Settings, Wallet, Eye, EyeOff } from '@lucide/vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import MonthNav from '@/components/ui/MonthNav.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import Snackbar from '@/components/ui/Snackbar.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { monthKey } from '@/lib/dates'
import { buildMonthInsights, spendByCategory, summarizeMonth } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { toggleOffFeedback, toggleOnFeedback } from '@/services/native/haptics'
import type { HeroMetric, PrivacyMode } from '@/types/finance'

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const transactions = useTransactionsStore()
const ui = useUiStore()
const blurHero = computed(() => settings.blurHero)
const privacyOn = computed(() => settings.privacyMode !== 'none')
const onBalance = computed(() => settings.heroMetric === 'balance')

const month = ref(monthKey())
const thisMonth = computed(() => monthKey())
const summary = computed(() =>
  summarizeMonth(transactions.transactions, budgets.budgets, month.value),
)
const tops = computed(() =>
  spendByCategory(transactions.transactions, categories.categories, month.value).slice(0, 4),
)
const recent = computed(() => {
  const rows = onBalance.value
    ? transactions.transactions
    : transactions.transactions.filter((tx) => tx.date.startsWith(month.value))
  return rows.slice(0, 5)
})
const hasBudgets = computed(() => summary.value.budgetTotal > 0)
const showBudgetHero = computed(() => !onBalance.value && hasBudgets.value)
const budgetPct = computed(() => {
  if (!hasBudgets.value) return 0
  return Math.min(100, (summary.value.budgetSpent / summary.value.budgetTotal) * 100)
})
const heroLabel = computed(() => {
  if (onBalance.value) return t('home.availableBalance')
  if (showBudgetHero.value) {
    return summary.value.leftToSpend < 0 ? t('home.budgetOver') : t('home.budgetRemaining')
  }
  return t('home.netThisMonth')
})
const heroAmount = computed(() => {
  if (onBalance.value) return accounts.totalBalance
  if (showBudgetHero.value) return summary.value.leftToSpend
  return summary.value.net
})
const heroNegative = computed(() => heroAmount.value < 0 && !privacyOn.value)

const storyMonth = computed(() =>
  buildMonthInsights(transactions.transactions, categories.categories, thisMonth.value),
)
const storyTop = computed(
  () => spendByCategory(transactions.transactions, categories.categories, thisMonth.value)[0],
)
const storyText = computed(() => {
  const top = storyTop.value
  if (!top) return ''
  const extra = storyMonth.value
  if (extra.lastExpense <= 0) return t('home.storyFirst', { category: top.name })
  if (Math.abs(extra.deltaPct ?? 0) < 0.5) return t('home.storySame', { category: top.name })
  if ((extra.deltaPct ?? 0) > 0) {
    return t('home.storyMore', { pct: Math.abs(extra.deltaPct ?? 0).toFixed(0), category: top.name })
  }
  return t('home.storyLess', { pct: Math.abs(extra.deltaPct ?? 0).toFixed(0), category: top.name })
})

function openCategory(categoryId: string) {
  void router.push({
    name: 'activity',
    query: { month: month.value, category: categoryId },
  })
}

const backupDue = computed(() => {
  const txs = transactions.transactions
  if (!txs.length) return false
  const oldest = txs.reduce((min, tx) => (tx.createdAt < min ? tx.createdAt : min), txs[0]!.createdAt)
  const start = settings.lastBackupAt || oldest
  try {
    return differenceInCalendarDays(new Date(), parseISO(start)) >= 30
  } catch {
    return false
  }
})

const copySnackOpen = computed({
  get: () => Boolean(ui.budgetCopiedMonth),
  set: (open) => {
    if (!open) ui.clearBudgetCopied()
  },
})

async function undoBudgetCopy() {
  const copied = ui.budgetCopiedMonth
  if (!copied) return
  await budgets.clearMonth(copied)
  await budgets.skipCarry(copied)
  ui.clearBudgetCopied()
}

function setMetric(metric: HeroMetric) {
  if (settings.heroMetric === metric) return
  void settings.setHeroMetric(metric)
  if (metric === 'budget') void toggleOnFeedback()
  else void toggleOffFeedback()
}

const HOLD_MS = 450
let holdTimer: ReturnType<typeof setTimeout> | undefined
let didHold = false
let holdCancelled = false

function clearHold() {
  if (holdTimer !== undefined) {
    clearTimeout(holdTimer)
    holdTimer = undefined
  }
}

function applyPrivacy(mode: PrivacyMode) {
  if (settings.privacyMode === mode) return
  void settings.setPrivacyMode(mode)
  if (mode === 'none') void toggleOnFeedback()
  else void toggleOffFeedback()
}

function onHidePointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  didHold = false
  holdCancelled = false
  ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
  holdTimer = setTimeout(() => {
    didHold = true
    applyPrivacy(settings.privacyMode === 'all' ? 'none' : 'all')
  }, HOLD_MS)
}

function onHidePointerUp(e: PointerEvent) {
  clearHold()
  const btn = e.currentTarget as HTMLButtonElement
  if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId)
  if (holdCancelled || didHold) {
    didHold = false
    return
  }
  applyPrivacy(settings.privacyMode === 'none' ? 'hero' : 'none')
}

function onHidePointerCancel() {
  holdCancelled = true
  clearHold()
}

function onHideKeyDown(e: KeyboardEvent) {
  if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return
  e.preventDefault()
  didHold = false
  holdCancelled = false
  holdTimer = setTimeout(() => {
    didHold = true
    applyPrivacy(settings.privacyMode === 'all' ? 'none' : 'all')
  }, HOLD_MS)
}

function onHideKeyUp(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  clearHold()
  if (holdCancelled || didHold) {
    didHold = false
    return
  }
  applyPrivacy(settings.privacyMode === 'none' ? 'hero' : 'none')
}

const hideAria = computed(() => {
  if (settings.privacyMode === 'all') return t('home.showAmounts')
  if (settings.privacyMode === 'hero') return t('home.showBalance')
  return t('home.blurBalance')
})

onUnmounted(() => {
  clearHold()
})
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

    <RouterLink v-if="backupDue" to="/settings" class="backup-nudge">
      {{ t('home.backupReminder') }}
    </RouterLink>

    <p v-if="storyText" class="story">{{ storyText }}</p>

    <MonthNav v-if="!onBalance" v-model="month" label-as-heading />

    <section class="hero-card" :aria-label="onBalance ? t('home.availableBalance') : t('home.monthOverview')">
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
        <p
          class="hero-amount"
          :class="{ negative: heroNegative, 'is-blurred': blurHero }"
          :aria-label="blurHero ? t('home.hiddenAmount') : undefined"
        >
          <MoneyText :amount="heroAmount" size="hero" :aria-hidden="blurHero" />
        </p>
        <button
          type="button"
          class="hide-btn"
          :aria-label="hideAria"
          :aria-pressed="privacyOn"
          :aria-description="t('home.hideAllHint')"
          @pointerdown="onHidePointerDown"
          @pointerup="onHidePointerUp"
          @pointercancel="onHidePointerCancel"
          @keydown="onHideKeyDown"
          @keyup="onHideKeyUp"
          @click.prevent
          @contextmenu.prevent
        >
          <EyeOff v-if="privacyOn" :size="22" />
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
      <p v-else-if="!onBalance" class="hint">
        <RouterLink to="/budgets">{{ t('home.setBudgets') }}</RouterLink>
        {{ t('home.setBudgetsHint') }}
      </p>

      <div v-if="onBalance" class="wallets">
        <p class="wallets-label">{{ t('home.wallets') }}</p>
        <button
          v-for="acc in accounts.active"
          :key="acc.id"
          type="button"
          class="wallet"
          @click="router.push('/accounts')"
        >
          <span class="dot" :style="{ background: acc.color }" />
          <span class="chip-name">
            {{ acc.name }}
            <template v-if="acc.type === 'credit'"> · {{ t('home.owed') }}</template>
          </span>
          <span class="chip-amt"><MoneyText :amount="acc.balance" /></span>
        </button>
      </div>

      <div v-else class="stats stats--two">
        <div>
          <span>{{ t('home.spent') }}</span>
          <strong class="expense"><MoneyText :amount="summary.expense" /></strong>
        </div>
        <div>
          <span>{{ t('home.income') }}</span>
          <strong class="income"><MoneyText :amount="summary.income" /></strong>
        </div>
      </div>
    </section>

    <section v-if="!onBalance && tops.length" class="section">
      <div class="section-head">
        <h2>{{ t('home.whereItWent') }}</h2>
        <RouterLink to="/insights">{{ t('home.seeAll') }}</RouterLink>
      </div>
      <div class="chips">
        <button
          v-for="c in tops"
          :key="c.categoryId"
          type="button"
          class="chip"
          @click="openCategory(c.categoryId)"
        >
          <span class="dot" :style="{ background: c.color }" />
          <span class="chip-name">{{ c.name }}</span>
          <span class="chip-amt"><MoneyText :amount="c.amount" /></span>
        </button>
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

    <Snackbar
      :open="copySnackOpen"
      :message="t('home.copiedBudgets')"
      :action-label="t('common.undo')"
      :nonce="ui.budgetCopiedMonth"
      @update:open="copySnackOpen = $event"
      @action="undoBudgetCopy"
    />
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

.hero-amount.is-blurred {
  filter: blur(max(12px, 0.35em));
  user-select: none;
  pointer-events: none;
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
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
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

.stats--two {
  grid-template-columns: 1fr 1fr;
}

.wallets {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-outline-variant);
}

.wallets-label {
  font-size: var(--text-body);
  font-weight: 400;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.wallet {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  text-align: left;
}

.backup-nudge {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-label);
  font-weight: 550;
  line-height: 1.4;
  background: var(--color-surface-container);
  color: var(--color-on-surface-variant);
}

.story {
  font-size: var(--text-caption);
  font-weight: 450;
  line-height: 1.4;
  color: var(--color-muted);
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
  width: 100%;
  text-align: left;
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
  font-weight: 500;
  color: var(--color-on-surface-variant);
}

.chip-amt {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.list {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-4);
}
</style>
