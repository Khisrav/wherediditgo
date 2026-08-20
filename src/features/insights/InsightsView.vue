<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  ArrowUpRight,
  CalendarDays,
  PieChart,
  PiggyBank,
  Sparkles,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from '@lucide/vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ActivityCalendar from '@/features/insights/ActivityCalendar.vue'
import CategoryShare from '@/features/insights/CategoryShare.vue'
import InsightHero from '@/features/insights/InsightHero.vue'
import SpendRhythm from '@/features/insights/SpendRhythm.vue'
import { monthKey, shortDayLabel } from '@/lib/dates'
import {
  activityHeatmap,
  buildInsightCards,
  buildRangeInsights,
  formatTxDate,
  rangeForPeriod,
  selectHeroCard,
  spendByCategoryInRange,
  spendSeries,
  summarizeRange,
  type InsightCard,
  type InsightsPeriod,
} from '@/services/stats'
import { tickFeedback } from '@/services/native/haptics'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'

const PERIODS: InsightsPeriod[] = ['7d', '30d', '90d', 'all']
const periodLabelKey: Record<InsightsPeriod, 'period7d' | 'period30d' | 'period90d' | 'periodAll'> = {
  '7d': 'period7d',
  '30d': 'period30d',
  '90d': 'period90d',
  all: 'periodAll',
}

const OTHER_ID = '__other__'

const { t } = useI18n()
const router = useRouter()
const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const settings = useSettingsStore()
const ui = useUiStore()

const period = ref<InsightsPeriod>('30d')
const range = computed(() => rangeForPeriod(period.value))
const rangeLabel = computed(() => {
  if (period.value === 'all' || !range.value.start) return t('insights.allTime')
  return `${shortDayLabel(range.value.start, settings.intlLocale)} – ${shortDayLabel(range.value.end, settings.intlLocale)}`
})

function setPeriod(next: InsightsPeriod) {
  if (period.value === next) return
  period.value = next
  void tickFeedback()
}

function openCategory(categoryId: string) {
  void router.push({
    name: 'activity',
    query: { month: range.value.end.slice(0, 7), category: categoryId },
  })
}

const summary = computed(() => summarizeRange(transactions.transactions, range.value))
const extra = computed(() =>
  buildRangeInsights(transactions.transactions, categories.categories, range.value),
)
const byCat = computed(() =>
  spendByCategoryInRange(transactions.transactions, categories.categories, range.value),
)
const seriesBucket = computed(() => {
  if (period.value === 'all') return 'month' as const
  if (period.value === '90d') return 'week' as const
  return 'day' as const
})
const series = computed(() =>
  spendSeries(transactions.transactions, range.value, seriesBucket.value, settings.intlLocale),
)
const heatmap = computed(() => activityHeatmap(transactions.transactions, settings.intlLocale))
const cards = computed(() =>
  buildInsightCards(
    transactions.transactions,
    categories.categories,
    budgets.budgets,
    range.value,
    series.value,
    monthKey(),
  ),
)
const heroCard = computed(() => selectHeroCard(cards.value))
const supportCard = computed(
  () => cards.value.find((card) => card.kind === 'categoryDrop' || card.kind === 'categoryRise') ?? null,
)

const hasAnyTx = computed(() => transactions.transactions.length > 0)
const hasActivity = computed(() => summary.value.expense > 0 || summary.value.income > 0)
const isEmpty = computed(() => !hasAnyTx.value)

const heroTone = computed(() => heroCard.value?.tone ?? 'neutral')
const heroTitle = computed(() => titleForHero(heroCard.value))
const heroSub = computed(() => subForHero(heroCard.value))
const heroSupport = computed(() => {
  const support = supportCard.value
  if (!support?.categoryName) return ''
  if (heroCard.value?.kind === 'firstStretch') return ''
  if (support.kind === 'categoryDrop') {
    return t('insights.heroSupportDrop', { category: support.categoryName })
  }
  return t('insights.heroSupportRise', { category: support.categoryName })
})
const heroFigure = computed(() => {
  const card = heroCard.value
  if (!card || !hasActivity.value) return null
  if (card.kind === 'spentLess' || card.kind === 'spentMore' || card.kind === 'keptIncome' || card.kind === 'topShare') {
    return { type: 'pct' as const, value: Math.round(card.pct ?? 0) }
  }
  if (card.kind === 'spentSame' || card.kind === 'firstStretch' || card.kind === 'outspentIncome') {
    return { type: 'amount' as const, value: card.amount ?? 0, signed: card.kind === 'outspentIncome' ? 'expense' as const : null }
  }
  return null
})

const shareRows = computed(() => {
  const rows = byCat.value
  if (rows.length <= 5) return rows
  const head = rows.slice(0, 5)
  const rest = rows.slice(5)
  const amount = rest.reduce((sum, row) => sum + row.amount, 0)
  const total = rows.reduce((sum, row) => sum + row.amount, 0) || 1
  return [
    ...head,
    {
      categoryId: OTHER_ID,
      name: t('insights.other'),
      color: 'var(--color-outline)',
      amount,
      percent: (amount / total) * 100,
    },
  ]
})

const peakRow = computed(() => {
  if (!series.value.length) return null
  return series.value.reduce((best, row) => (row.expense > best.expense ? row : best))
})
const rhythmLede = computed(() => {
  const peak = peakRow.value
  if (!peak || peak.expense <= 0) return t('insights.rhythmEven')
  const avg = series.value.reduce((sum, row) => sum + row.expense, 0) / series.value.length
  if (peak.expense <= avg * 1.45) return t('insights.rhythmEven')
  const bucketKey =
    seriesBucket.value === 'month'
      ? 'bucketMonth'
      : seriesBucket.value === 'week'
        ? 'bucketWeek'
        : 'bucketDay'
  return t('insights.rhythmPeak', { bucket: t(`insights.${bucketKey}`), when: peak.label })
})

const stories = computed(() => {
  const heroKind = heroCard.value?.kind
  const supportKind = supportCard.value?.kind
  return cards.value
    .filter((card) => {
      if (card.kind === heroKind) return false
      if (card.kind === supportKind) return false
      if (card.kind === 'firstStretch' || card.kind === 'spentSame') return false
      if (card.kind === 'spentLess' || card.kind === 'spentMore') return false
      return true
    })
    .slice(0, 4)
    .map(toStory)
})

interface StoryView {
  id: string
  tone: InsightCard['tone']
  title: string
  sub: string
  amount?: number
  categoryId?: string
  categoryName?: string
  icon: Component
}

function categoryLabel(card: InsightCard) {
  return card.categoryName || t('insights.uncategorizedHit')
}

function titleForHero(card: InsightCard | null) {
  if (!hasActivity.value) return t('insights.heroQuiet')
  if (!card) return t('insights.heroQuiet')
  switch (card.kind) {
    case 'spentLess':
      return t('insights.heroSpentLess')
    case 'spentMore':
      return t('insights.heroSpentMore')
    case 'spentSame':
      return t('insights.heroSpentSame')
    case 'firstStretch':
      return t('insights.heroFirst')
    case 'keptIncome':
      return t('insights.heroKept')
    case 'outspentIncome':
      return t('insights.heroOverspent')
    case 'topShare':
      return t('insights.heroTop', { category: categoryLabel(card) })
    default:
      return t('insights.heroQuiet')
  }
}

function subForHero(card: InsightCard | null) {
  if (!hasActivity.value || !card) return ''
  switch (card.kind) {
    case 'spentLess':
    case 'spentMore':
      return t('insights.heroVsPrev')
    case 'spentSame':
      return t('insights.heroVsPrevSame')
    case 'firstStretch':
      return t('insights.heroFirstSub')
    case 'keptIncome':
      return t('insights.heroOfIncome')
    case 'outspentIncome':
      return t('insights.heroOverIncome')
    case 'topShare':
      return t('insights.heroTopSub')
    default:
      return ''
  }
}

function toStory(card: InsightCard): StoryView {
  const pct = Math.round(card.pct ?? 0)
  const category = categoryLabel(card)
  const title = (() => {
    switch (card.kind) {
      case 'keptIncome':
        return t('insights.storyKept', { pct })
      case 'outspentIncome':
        return t('insights.storyOverspent')
      case 'topShare':
        return t('insights.storyTopShare', { category, pct })
      case 'weekendSkew':
        return t('insights.storyWeekend', { pct })
      case 'weekdaySkew':
        return t('insights.storyWeekday', { pct })
      case 'largest':
        return t('insights.storyLargest', { category })
      case 'budgetOver':
        return t('insights.storyBudgetOver', { category })
      case 'peakBucket':
        return t('insights.storyPeak', { when: card.label ?? '' })
      case 'categoryRise':
        return t('insights.storyCategoryRise', { category })
      case 'categoryDrop':
        return t('insights.storyCategoryDrop', { category })
      default:
        return category
    }
  })()

  const sub = (() => {
    if (card.kind === 'largest') {
      const date = card.date ? formatTxDate(card.date, settings.intlLocale) : ''
      return [date, card.note].filter(Boolean).join(' · ')
    }
    return ''
  })()

  return {
    id: card.kind,
    tone: card.tone,
    title,
    sub,
    amount: card.amount,
    categoryId: card.categoryId,
    categoryName: card.categoryName,
    icon: iconFor(card.kind),
  }
}

function iconFor(kind: InsightCard['kind']): Component {
  switch (kind) {
    case 'spentLess':
    case 'categoryDrop':
      return TrendingDown
    case 'spentMore':
    case 'categoryRise':
    case 'peakBucket':
      return TrendingUp
    case 'keptIncome':
      return PiggyBank
    case 'outspentIncome':
    case 'budgetOver':
      return TriangleAlert
    case 'topShare':
      return PieChart
    case 'weekendSkew':
    case 'weekdaySkew':
      return CalendarDays
    case 'largest':
      return ArrowUpRight
    default:
      return Sparkles
  }
}

function onStory(story: StoryView) {
  if (story.categoryId) openCategory(story.categoryId)
}
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
    </header>

    <EmptyState
      v-if="isEmpty"
      :title="t('insights.emptyTitle')"
      :description="t('insights.emptyDesc')"
      :action-label="t('nav.addTransaction')"
      @action="ui.openAdd()"
    >
      <template #icon>
        <Sparkles :size="28" />
      </template>
    </EmptyState>

    <template v-else>
      <template v-if="hasActivity">
        <InsightHero
          :tone="heroTone"
          :range-label="rangeLabel"
          :title="heroTitle"
          :sub="heroSub"
          :support="heroSupport"
          :income="summary.income"
          :expense="summary.expense"
          :net="summary.net"
          :income-label="t('insights.income')"
          :expense-label="t('insights.expenses')"
          :net-label="t('insights.net')"
        >
          <template v-if="heroFigure" #figure>
            <template v-if="heroFigure.type === 'pct'">{{ heroFigure.value }}%</template>
            <MoneyText
              v-else
              :amount="heroFigure.value"
              :signed="heroFigure.signed"
            />
          </template>
        </InsightHero>

        <ul v-if="stories.length" class="stories">
          <li v-for="story in stories" :key="story.id">
            <button
              v-if="story.categoryId"
              type="button"
              class="story"
              :class="`story--${story.tone}`"
              :aria-label="t('insights.seeCategory', { category: story.categoryName || story.title })"
              @click="onStory(story)"
            >
              <span class="story-icon" aria-hidden="true">
                <component :is="story.icon" :size="18" />
              </span>
              <div class="story-copy">
                <p>{{ story.title }}</p>
                <p v-if="story.sub" class="story-sub">{{ story.sub }}</p>
              </div>
              <strong v-if="story.amount != null" class="story-amt">
                <MoneyText :amount="story.amount" />
              </strong>
            </button>
            <div v-else class="story" :class="`story--${story.tone}`">
              <span class="story-icon" aria-hidden="true">
                <component :is="story.icon" :size="18" />
              </span>
              <div class="story-copy">
                <p>{{ story.title }}</p>
                <p v-if="story.sub" class="story-sub">{{ story.sub }}</p>
              </div>
              <strong v-if="story.amount != null" class="story-amt">
                <MoneyText :amount="story.amount" />
              </strong>
            </div>
          </li>
        </ul>

        <CategoryShare
          v-if="shareRows.length"
          :title="t('insights.whereItWent')"
          :rows="shareRows"
          :other-id="OTHER_ID"
          @select="openCategory"
        />

        <SpendRhythm
          v-if="series.some((row) => row.expense > 0)"
          :title="t('insights.rhythm')"
          :lede="rhythmLede"
          :series="series"
          :avg-daily="extra.avgDaily"
          :per-day-suffix="t('insights.perDaySuffix')"
        />
      </template>

      <EmptyState
        v-else
        :title="t('insights.emptyPeriodTitle')"
        :description="t('insights.emptyPeriodDesc')"
        :action-label="t('nav.addTransaction')"
        @action="ui.openAdd()"
      >
        <template #icon>
          <Sparkles :size="28" />
        </template>
      </EmptyState>

      <ActivityCalendar :heatmap="heatmap" />
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

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.seg button:focus-visible,
button.story:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 360px) {
  .seg button {
    font-size: 0.75rem;
  }
}

.stories {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.story {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  min-height: var(--touch-min);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: left;
}

button.story:hover,
button.story:focus-visible {
  background: var(--color-surface-container);
}

.story-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background: var(--color-surface-container);
  color: var(--color-on-surface-variant);
}

.story--good .story-icon {
  background: color-mix(in srgb, var(--color-income) 18%, transparent);
  color: var(--color-income);
}

.story--warn .story-icon {
  background: color-mix(in srgb, var(--color-tertiary) 22%, transparent);
  color: var(--color-tertiary);
}

.story-copy {
  min-width: 0;
}

.story-copy p {
  font-weight: 600;
}

.story-sub {
  margin-top: 2px;
  font-size: var(--text-label);
  font-weight: 450;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-amt {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  color: var(--color-muted);
}
</style>
