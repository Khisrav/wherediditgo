import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

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
      parseISO(iso),
    )
  } catch {
    return iso
  }
}

export function isInMonth(isoDate: string, key: string): boolean {
  const d = parseISO(isoDate)
  const [y, m] = key.split('-').map(Number)
  const start = startOfMonth(new Date(y, m - 1, 1))
  const end = endOfMonth(start)
  return isWithinInterval(d, { start, end })
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function nowISO(): string {
  return new Date().toISOString()
}
