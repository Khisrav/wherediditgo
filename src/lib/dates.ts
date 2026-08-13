import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM')
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return format(d, 'MMMM yyyy')
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
