import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { Budget, Category, Transaction } from '@/types/finance'
import { isInMonth, monthKey } from '@/lib/dates'

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

  // If no budgets set, "left to spend" is income - expense; else remaining budget pool
  const leftToSpend =
    budgetTotal > 0 ? Math.max(0, budgetTotal - budgetSpent) : Math.max(0, income - expense)

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
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.categoryId || !isInMonth(t.date, month)) continue
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
): Array<{ month: string; label: string; expense: number; income: number }> {
  const now = new Date()
  const result = []
  for (let i = count - 1; i >= 0; i--) {
    const d = subMonths(now, i)
    const key = monthKey(d)
    const monthTx = transactions.filter((t) => isInMonth(t.date, key))
    result.push({
      month: key,
      label: format(d, 'MMM'),
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

export function formatTxDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d')
  } catch {
    return iso
  }
}
