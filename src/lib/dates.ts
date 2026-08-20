import { format, getDaysInMonth, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM')
}

export function monthLabel(key: string, locale = 'en'): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  try {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d)
  } catch {
    return format(d, 'MMMM yyyy')
  }
}

export function shortMonthLabel(date: Date, locale = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)
  } catch {
    return format(date, 'MMM')
  }
}

export function shortDayLabel(iso: string, locale = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
      parseLocalDay(iso),
    )
  } catch {
    return iso
  }
}

/** Weekday + date for list section headings, with year when not the current year. */
export function weekdayDayLabel(iso: string, locale = 'en'): string {
  const d = parseLocalDay(iso)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d)
  } catch {
    return shortDayLabel(iso, locale)
  }
}

/** Parse a `yyyy-MM-dd` value as a local calendar day (avoids UTC shift). */
export function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayKey(date: Date | string = new Date()): string {
  if (typeof date === 'string') return date.slice(0, 10)
  return format(date, 'yyyy-MM-dd')
}

export function isInRange(isoDate: string, start: string | null, end: string | null): boolean {
  const d = isoDate.slice(0, 10)
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

/** Sunday-first weekday names for calendar side labels. */
export function weekdayLabels(locale = 'en', style: 'narrow' | 'short' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: style })
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)))
}

export function isInMonth(isoDate: string, key: string): boolean {
  const d = parseISO(isoDate)
  const [y, m] = key.split('-').map(Number)
  const start = startOfMonth(new Date(y, m - 1, 1))
  const end = endOfMonth(start)
  return isWithinInterval(d, { start, end })
}

export function previousMonthKey(month = monthKey()): string {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 2, 1))
}

export function dateInMonth(month: string, dayOfMonth: number): string {
  const [y, m] = month.split('-').map(Number)
  const dim = getDaysInMonth(new Date(y, m - 1, 1))
  const day = Math.min(Math.max(1, Math.round(dayOfMonth)), dim)
  return `${month}-${String(day).padStart(2, '0')}`
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return format(d, 'yyyy-MM-dd')
}

/** Recurring templates use 1–28 to avoid month-end edge cases. */
export function clampDayOfMonth(day: number): number {
  if (!Number.isFinite(day)) return 1
  return Math.min(28, Math.max(1, Math.round(day)))
}

export function todayDayOfMonth(): number {
  return clampDayOfMonth(new Date().getDate())
}

export function nowISO(): string {
  return new Date().toISOString()
}
