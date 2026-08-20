import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import type { Account, Budget, Category, Transaction } from '@/types/finance'
import {
  dayKey,
  isInMonth,
  isInRange,
  monthKey,
  parseLocalDay,
  shortDayLabel,
  shortMonthLabel,
} from '@/lib/dates'

export type InsightsPeriod = '7d' | '30d' | '90d' | 'all'

export interface StatsRange {
  start: string | null
  end: string
}

export function rangeForPeriod(period: InsightsPeriod, now = new Date()): StatsRange {
  const end = dayKey(now)
  if (period === 'all') return { start: null, end }
  const span = period === '7d' ? 6 : period === '30d' ? 29 : 89
  return { start: dayKey(subDays(now, span)), end }
}

export function previousEquivalentRange(range: StatsRange): StatsRange | null {
  if (!range.start) return null
  const start = parseLocalDay(range.start)
  const end = parseLocalDay(range.end)
  const days = differenceInCalendarDays(end, start) + 1
  const prevEnd = subDays(start, 1)
  const prevStart = subDays(prevEnd, days - 1)
  return { start: dayKey(prevStart), end: dayKey(prevEnd) }
}

function monthToRange(month: string): StatsRange {
  const [y, m] = month.split('-').map(Number)
  const start = startOfMonth(new Date(y, m - 1, 1))
  return { start: dayKey(start), end: dayKey(endOfMonth(start)) }
}

function inStatsRange(isoDate: string, range: StatsRange): boolean {
  return isInRange(isoDate, range.start, range.end)
}

function earliestDay(transactions: Transaction[], fallback = new Date()): Date {
  let min: string | null = null
  for (const t of transactions) {
    const d = t.date.slice(0, 10)
    if (!min || d < min) min = d
  }
  return min ? parseLocalDay(min) : fallback
}

export interface MonthSummary {
  month: string
  income: number
  expense: number
  net: number
  budgetTotal: number
  budgetSpent: number
  leftToSpend: number
}

export function summarizeMonth(
  transactions: Transaction[],
  budgets: Budget[],
  month = monthKey(),
): MonthSummary {
  const monthTx = transactions.filter((t) => isInMonth(t.date, month))
  let income = 0
  let expense = 0
  for (const t of monthTx) {
    if (t.type === 'income') income += t.amount
    if (t.type === 'expense') expense += t.amount
  }
  const monthBudgets = budgets.filter((b) => b.month === month)
  const budgetTotal = monthBudgets.reduce((s, b) => s + b.limitAmount, 0)
  const budgetCategoryIds = new Set(monthBudgets.map((b) => b.categoryId))
  const budgetSpent = monthTx
    .filter((t) => t.type === 'expense' && t.categoryId && budgetCategoryIds.has(t.categoryId))
    .reduce((s, t) => s + t.amount, 0)

  // Remaining can go negative (overspend). Do not clamp to 0.
  const leftToSpend = budgetTotal > 0 ? budgetTotal - budgetSpent : income - expense

  return {
    month,
    income,
    expense,
    net: income - expense,
    budgetTotal,
    budgetSpent,
    leftToSpend,
  }
}

export interface CategorySpend {
  categoryId: string
  name: string
  color: string
  amount: number
  percent: number
}

export function spendByCategory(
  transactions: Transaction[],
  categories: Category[],
  month = monthKey(),
): CategorySpend[] {
  return spendByCategoryInRange(transactions, categories, monthToRange(month))
}

export function spendByCategoryInRange(
  transactions: Transaction[],
  categories: Category[],
  range: StatsRange,
): CategorySpend[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.categoryId || !inStatsRange(t.date, range)) continue
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  return [...map.entries()]
    .map(([categoryId, amount]) => {
      const cat = catMap[categoryId]
      return {
        categoryId,
        name: cat?.name ?? 'Unknown',
        color: cat?.color ?? '#6c757d',
        amount,
        percent: (amount / total) * 100,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export interface DaySpend {
  date: string
  label: string
  expense: number
  income: number
}

export function dailySpendInMonth(transactions: Transaction[], month = monthKey()): DaySpend[] {
  const [y, m] = month.split('-').map(Number)
  const start = startOfMonth(new Date(y, m - 1, 1))
  const end = endOfMonth(start)
  const days = eachDayOfInterval({ start, end })
  const byDay = new Map<string, { expense: number; income: number }>()
  for (const t of transactions) {
    if (!isInMonth(t.date, month)) continue
    const key = t.date.slice(0, 10)
    const cur = byDay.get(key) ?? { expense: 0, income: 0 }
    if (t.type === 'expense') cur.expense += t.amount
    if (t.type === 'income') cur.income += t.amount
    byDay.set(key, cur)
  }
  return days.map((d) => {
    const key = format(d, 'yyyy-MM-dd')
    const v = byDay.get(key) ?? { expense: 0, income: 0 }
    return {
      date: key,
      label: format(d, 'd'),
      expense: v.expense,
      income: v.income,
    }
  })
}

export function recentMonthsTrend(
  transactions: Transaction[],
  count = 6,
  locale = 'en',
): Array<{ month: string; label: string; expense: number; income: number }> {
  const now = new Date()
  const result = []
  for (let i = count - 1; i >= 0; i--) {
    const d = subMonths(now, i)
    const key = monthKey(d)
    const monthTx = transactions.filter((t) => isInMonth(t.date, key))
    result.push({
      month: key,
      label: shortMonthLabel(d, locale),
      expense: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    })
  }
  return result
}

export function budgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  month = monthKey(),
): Array<{
  budget: Budget
  category: Category
  spent: number
  remaining: number
  percent: number
}> {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  return budgets
    .filter((b) => b.month === month)
    .map((budget) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.categoryId === budget.categoryId &&
            isInMonth(t.date, month),
        )
        .reduce((s, t) => s + t.amount, 0)
      const category = catMap[budget.categoryId]
      if (!category) return null
      return {
        budget,
        category,
        spent,
        remaining: budget.limitAmount - spent,
        percent: budget.limitAmount > 0 ? Math.min(100, (spent / budget.limitAmount) * 100) : 0,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.percent - a.percent)
}

export interface AccountMonthStat {
  account: Account
  income: number
  expense: number
  transferIn: number
  transferOut: number
  net: number
}

export function accountStatsInMonth(
  transactions: Transaction[],
  accounts: Account[],
  month = monthKey(),
): AccountMonthStat[] {
  return accountStatsInRange(transactions, accounts, monthToRange(month))
}

export function accountStatsInRange(
  transactions: Transaction[],
  accounts: Account[],
  range: StatsRange,
): AccountMonthStat[] {
  return accounts
    .filter((a) => !a.archived)
    .map((account) => {
      let income = 0
      let expense = 0
      let transferIn = 0
      let transferOut = 0
      for (const t of transactions) {
        if (!inStatsRange(t.date, range)) continue
        if (t.type === 'income' && t.accountId === account.id) income += t.amount
        if (t.type === 'expense' && t.accountId === account.id) expense += t.amount
        if (t.type === 'transfer') {
          if (t.accountId === account.id) transferOut += t.amount
          if (t.toAccountId === account.id) transferIn += t.amount
        }
      }
      return {
        account,
        income,
        expense,
        transferIn,
        transferOut,
        net: income - expense + transferIn - transferOut,
      }
    })
}

export interface MonthInsights {
  txCount: number
  expenseCount: number
  avgExpense: number
  avgDaily: number
  projected: number
  day: number
  daysInMonth: number
  daysLeft: number
  savingsRate: number | null
  lastExpense: number
  delta: number
  deltaPct: number | null
  largest: {
    amount: number
    categoryName: string
    categoryId?: string
    date: string
    note: string
  } | null
  weekdayExpense: number
  weekendExpense: number
}

export function buildMonthInsights(
  transactions: Transaction[],
  categories: Category[],
  month = monthKey(),
  now = new Date(),
): MonthInsights {
  const monthTx = transactions.filter((t) => isInMonth(t.date, month))
  const expenses = monthTx.filter((t) => t.type === 'expense')
  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const expense = expenses.reduce((s, t) => s + t.amount, 0)

  const [y, m] = month.split('-').map(Number)
  const monthDate = new Date(y, m - 1, 1)
  const daysInMonth = getDaysInMonth(monthDate)
  const isCurrent = monthKey(now) === month
  const day = isCurrent ? Math.min(getDate(now), daysInMonth) : daysInMonth
  const daysLeft = Math.max(0, daysInMonth - day)
  const avgDaily = day > 0 ? Math.round(expense / day) : 0
  const projected = avgDaily * daysInMonth
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null

  const prevKey = monthKey(subMonths(monthDate, 1))
  const lastExpense = transactions
    .filter((t) => t.type === 'expense' && isInMonth(t.date, prevKey))
    .reduce((s, t) => s + t.amount, 0)
  const delta = expense - lastExpense
  const deltaPct = lastExpense > 0 ? (delta / lastExpense) * 100 : null

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  let largest: MonthInsights['largest'] = null
  for (const t of expenses) {
    if (!largest || t.amount > largest.amount) {
      largest = {
        amount: t.amount,
        categoryName: (t.categoryId && catMap[t.categoryId]?.name) || '',
        categoryId: t.categoryId,
        date: t.date,
        note: t.note,
      }
    }
  }

  let weekdayExpense = 0
  let weekendExpense = 0
  for (const t of expenses) {
    const dow = getDay(parseLocalDay(t.date))
    if (dow === 0 || dow === 6) weekendExpense += t.amount
    else weekdayExpense += t.amount
  }

  return {
    txCount: monthTx.length,
    expenseCount: expenses.length,
    avgExpense: expenses.length ? Math.round(expense / expenses.length) : 0,
    avgDaily,
    projected,
    day,
    daysInMonth,
    daysLeft,
    savingsRate,
    lastExpense,
    delta,
    deltaPct,
    largest,
    weekdayExpense,
    weekendExpense,
  }
}

export function formatTxDate(iso: string, locale = 'en'): string {
  try {
    return shortDayLabel(iso, locale)
  } catch {
    return iso
  }
}

export interface RangeSummary {
  income: number
  expense: number
  net: number
}

export function summarizeRange(transactions: Transaction[], range: StatsRange): RangeSummary {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (!inStatsRange(t.date, range)) continue
    if (t.type === 'income') income += t.amount
    if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, net: income - expense }
}

export type SeriesBucket = 'day' | 'week' | 'month'

export function spendSeries(
  transactions: Transaction[],
  range: StatsRange,
  bucket: SeriesBucket,
  locale = 'en',
): DaySpend[] {
  const start = range.start ? parseLocalDay(range.start) : earliestDay(transactions)
  const end = parseLocalDay(range.end)
  if (end < start) return []

  const byKey = new Map<string, { expense: number; income: number }>()
  for (const t of transactions) {
    if (!inStatsRange(t.date, range)) continue
    const key =
      bucket === 'month'
        ? t.date.slice(0, 7)
        : bucket === 'week'
          ? dayKey(startOfWeek(parseLocalDay(t.date), { weekStartsOn: 0 }))
          : t.date.slice(0, 10)
    const cur = byKey.get(key) ?? { expense: 0, income: 0 }
    if (t.type === 'expense') cur.expense += t.amount
    if (t.type === 'income') cur.income += t.amount
    byKey.set(key, cur)
  }

  if (bucket === 'month') {
    return eachMonthOfInterval({ start, end }).map((d) => {
      const key = monthKey(d)
      const v = byKey.get(key) ?? { expense: 0, income: 0 }
      return { date: key, label: shortMonthLabel(d, locale), expense: v.expense, income: v.income }
    })
  }

  if (bucket === 'week') {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 0 }).map((d) => {
      const key = dayKey(d)
      const v = byKey.get(key) ?? { expense: 0, income: 0 }
      return {
        date: key,
        label: shortDayLabel(key, locale),
        expense: v.expense,
        income: v.income,
      }
    })
  }

  return eachDayOfInterval({ start, end }).map((d) => {
    const key = dayKey(d)
    const v = byKey.get(key) ?? { expense: 0, income: 0 }
    return {
      date: key,
      label: shortDayLabel(key, locale),
      expense: v.expense,
      income: v.income,
    }
  })
}

export interface RangeInsights {
  txCount: number
  expenseCount: number
  avgExpense: number
  avgDaily: number
  days: number
  savingsRate: number | null
  lastExpense: number
  delta: number
  deltaPct: number | null
  largest: MonthInsights['largest']
  weekdayExpense: number
  weekendExpense: number
}

export function buildRangeInsights(
  transactions: Transaction[],
  categories: Category[],
  range: StatsRange,
): RangeInsights {
  const inRangeTx = transactions.filter((t) => inStatsRange(t.date, range))
  const expenses = inRangeTx.filter((t) => t.type === 'expense')
  const income = inRangeTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = expenses.reduce((s, t) => s + t.amount, 0)

  const end = parseLocalDay(range.end)
  const start = range.start ? parseLocalDay(range.start) : earliestDay(inRangeTx, end)
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const avgDaily = Math.round(expense / days)
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null

  const prev = previousEquivalentRange(range)
  const lastExpense = prev
    ? transactions
        .filter((t) => t.type === 'expense' && inStatsRange(t.date, prev))
        .reduce((s, t) => s + t.amount, 0)
    : 0
  const delta = expense - lastExpense
  const deltaPct = lastExpense > 0 ? (delta / lastExpense) * 100 : null

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  let largest: RangeInsights['largest'] = null
  for (const t of expenses) {
    if (!largest || t.amount > largest.amount) {
      largest = {
        amount: t.amount,
        categoryName: (t.categoryId && catMap[t.categoryId]?.name) || '',
        categoryId: t.categoryId,
        date: t.date,
        note: t.note,
      }
    }
  }

  let weekdayExpense = 0
  let weekendExpense = 0
  for (const t of expenses) {
    const dow = getDay(parseLocalDay(t.date))
    if (dow === 0 || dow === 6) weekendExpense += t.amount
    else weekdayExpense += t.amount
  }

  return {
    txCount: inRangeTx.length,
    expenseCount: expenses.length,
    avgExpense: expenses.length ? Math.round(expense / expenses.length) : 0,
    avgDaily,
    days,
    savingsRate,
    lastExpense,
    delta,
    deltaPct,
    largest,
    weekdayExpense,
    weekendExpense,
  }
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface CalendarDay {
  date: string
  count: number
  expense: number
  income: number
  level: HeatLevel
  future: boolean
}

export interface CalendarMonthLabel {
  weekIndex: number
  label: string
}

export interface ActivityHeatmap {
  days: CalendarDay[]
  weeks: number
  activeDays: number
  maxCount: number
  monthLabels: CalendarMonthLabel[]
  start: string
  end: string
}

function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

export function activityHeatmap(
  transactions: Transaction[],
  locale = 'en',
  now = new Date(),
  weekCount = 53,
): ActivityHeatmap {
  const today = startOfDay(now)
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(today, { weekStartsOn: 0 })
  const calendarStart = startOfWeek(subWeeks(thisWeekStart, weekCount - 1), { weekStartsOn: 0 })
  const interval = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const byDay = new Map<string, { count: number; expense: number; income: number }>()
  for (const t of transactions) {
    const key = t.date.slice(0, 10)
    const cur = byDay.get(key) ?? { count: 0, expense: 0, income: 0 }
    cur.count += 1
    if (t.type === 'expense') cur.expense += t.amount
    if (t.type === 'income') cur.income += t.amount
    byDay.set(key, cur)
  }

  let maxCount = 0
  for (const v of byDay.values()) maxCount = Math.max(maxCount, v.count)

  const days: CalendarDay[] = interval.map((d) => {
    const key = dayKey(d)
    const v = byDay.get(key) ?? { count: 0, expense: 0, income: 0 }
    return {
      date: key,
      count: v.count,
      expense: v.expense,
      income: v.income,
      level: heatLevel(v.count),
      future: d > today,
    }
  })

  const weeks = Math.ceil(days.length / 7)
  const monthLabels: CalendarMonthLabel[] = []
  for (let i = 0; i < weeks; i++) {
    const slice = days.slice(i * 7, i * 7 + 7)
    const firstOfMonth = slice.find((d) => d.date.endsWith('-01'))
    if (i === 0 || firstOfMonth) {
      const anchor = firstOfMonth ?? slice[0]
      if (!anchor) continue
      const prev = monthLabels[monthLabels.length - 1]
      if (prev && i - prev.weekIndex < 2) continue
      monthLabels.push({
        weekIndex: i,
        label: shortMonthLabel(parseLocalDay(anchor.date), locale),
      })
    }
  }

  return {
    days,
    weeks,
    activeDays: days.filter((d) => d.count > 0).length,
    maxCount,
    monthLabels,
    start: dayKey(calendarStart),
    end: dayKey(today),
  }
}

export interface CategoryDelta {
  categoryId: string
  name: string
  color: string
  current: number
  previous: number
  delta: number
}

export function categorySpendDeltas(
  transactions: Transaction[],
  categories: Category[],
  range: StatsRange,
): CategoryDelta[] {
  const prev = previousEquivalentRange(range)
  const currentRows = spendByCategoryInRange(transactions, categories, range)
  const prevRows = prev ? spendByCategoryInRange(transactions, categories, prev) : []
  const prevMap = new Map(prevRows.map((row) => [row.categoryId, row]))
  const seen = new Set<string>()
  const out: CategoryDelta[] = []

  for (const row of currentRows) {
    seen.add(row.categoryId)
    const previous = prevMap.get(row.categoryId)?.amount ?? 0
    out.push({
      categoryId: row.categoryId,
      name: row.name,
      color: row.color,
      current: row.amount,
      previous,
      delta: row.amount - previous,
    })
  }
  for (const row of prevRows) {
    if (seen.has(row.categoryId)) continue
    out.push({
      categoryId: row.categoryId,
      name: row.name,
      color: row.color,
      current: 0,
      previous: row.amount,
      delta: -row.amount,
    })
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export type InsightTone = 'good' | 'warn' | 'neutral'
export type InsightKind =
  | 'spentLess'
  | 'spentMore'
  | 'spentSame'
  | 'firstStretch'
  | 'keptIncome'
  | 'outspentIncome'
  | 'topShare'
  | 'weekendSkew'
  | 'weekdaySkew'
  | 'largest'
  | 'budgetOver'
  | 'peakBucket'
  | 'categoryRise'
  | 'categoryDrop'

export interface InsightCard {
  kind: InsightKind
  tone: InsightTone
  score: number
  pct?: number
  amount?: number
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  note?: string
  date?: string
  label?: string
}

const HERO_ORDER: InsightKind[] = [
  'spentLess',
  'spentMore',
  'spentSame',
  'outspentIncome',
  'keptIncome',
  'topShare',
  'firstStretch',
]

export function selectHeroCard(cards: InsightCard[]): InsightCard | null {
  for (const kind of HERO_ORDER) {
    const found = cards.find((card) => card.kind === kind)
    if (found) return found
  }
  return cards[0] ?? null
}

export function buildInsightCards(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  range: StatsRange,
  series: DaySpend[],
  month = monthKey(),
): InsightCard[] {
  const extra = buildRangeInsights(transactions, categories, range)
  const summary = summarizeRange(transactions, range)
  const byCat = spendByCategoryInRange(transactions, categories, range)
  const cards: InsightCard[] = []

  if (extra.lastExpense <= 0 && summary.expense > 0) {
    cards.push({ kind: 'firstStretch', tone: 'neutral', score: 60, amount: summary.expense })
  } else if (extra.lastExpense > 0) {
    const pct = extra.deltaPct ?? 0
    if (Math.abs(pct) < 0.8) {
      cards.push({ kind: 'spentSame', tone: 'neutral', score: 58, pct: 0, amount: summary.expense })
    } else if (pct > 0) {
      cards.push({
        kind: 'spentMore',
        tone: 'warn',
        score: 72 + Math.min(28, Math.abs(pct)),
        pct: Math.abs(pct),
        amount: summary.expense,
      })
    } else {
      cards.push({
        kind: 'spentLess',
        tone: 'good',
        score: 72 + Math.min(28, Math.abs(pct)),
        pct: Math.abs(pct),
        amount: summary.expense,
      })
    }
  }

  if (extra.savingsRate != null) {
    if (extra.savingsRate >= 0) {
      cards.push({
        kind: 'keptIncome',
        tone: extra.savingsRate >= 10 ? 'good' : 'neutral',
        score: 52 + Math.min(28, extra.savingsRate),
        pct: extra.savingsRate,
      })
    } else {
      cards.push({
        kind: 'outspentIncome',
        tone: 'warn',
        score: 88,
        pct: Math.abs(extra.savingsRate),
        amount: Math.abs(summary.net),
      })
    }
  }

  const top = byCat[0]
  if (top && top.percent >= 28) {
    cards.push({
      kind: 'topShare',
      tone: top.percent >= 55 ? 'warn' : 'neutral',
      score: Math.round(top.percent),
      pct: top.percent,
      amount: top.amount,
      categoryId: top.categoryId,
      categoryName: top.name,
      categoryColor: top.color,
    })
  }

  const weekTotal = extra.weekdayExpense + extra.weekendExpense
  if (weekTotal > 0) {
    const weekendPct = (extra.weekendExpense / weekTotal) * 100
    const weekdayPct = 100 - weekendPct
    if (weekendPct >= 58) {
      cards.push({
        kind: 'weekendSkew',
        tone: 'neutral',
        score: Math.round(weekendPct),
        pct: weekendPct,
        amount: extra.weekendExpense,
      })
    } else if (weekdayPct >= 72) {
      cards.push({
        kind: 'weekdaySkew',
        tone: 'neutral',
        score: Math.round(weekdayPct),
        pct: weekdayPct,
        amount: extra.weekdayExpense,
      })
    }
  }

  if (extra.largest) {
    cards.push({
      kind: 'largest',
      tone: 'neutral',
      score: 44,
      amount: extra.largest.amount,
      categoryId: extra.largest.categoryId,
      categoryName: extra.largest.categoryName,
      date: extra.largest.date,
      note: extra.largest.note,
    })
  }

  const worstBudget = budgetProgress(budgets, transactions, categories, month).find(
    (row) => row.remaining < 0,
  )
  if (worstBudget) {
    cards.push({
      kind: 'budgetOver',
      tone: 'warn',
      score: 86,
      pct: worstBudget.percent,
      amount: Math.abs(worstBudget.remaining),
      categoryId: worstBudget.category.id,
      categoryName: worstBudget.category.name,
      categoryColor: worstBudget.category.color,
    })
  }

  if (series.length >= 3) {
    const peak = series.reduce((best, row) => (row.expense > best.expense ? row : best))
    const avg = series.reduce((sum, row) => sum + row.expense, 0) / series.length
    if (peak.expense > 0 && peak.expense > avg * 1.45) {
      cards.push({
        kind: 'peakBucket',
        tone: 'neutral',
        score: 36,
        amount: peak.expense,
        date: peak.date,
        label: peak.label,
      })
    }
  }

  const move = categorySpendDeltas(transactions, categories, range)[0]
  if (move && extra.lastExpense > 0 && Math.abs(move.delta) >= summary.expense * 0.08) {
    cards.push({
      kind: move.delta > 0 ? 'categoryRise' : 'categoryDrop',
      tone: move.delta > 0 ? 'warn' : 'good',
      score: Math.min(82, Math.round((Math.abs(move.delta) / Math.max(summary.expense, 1)) * 100) + 40),
      amount: Math.abs(move.delta),
      categoryId: move.categoryId,
      categoryName: move.name,
      categoryColor: move.color,
    })
  }

  return cards.sort((a, b) => b.score - a.score)
}

