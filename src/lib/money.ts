export type CurrencyPosition = 'before' | 'after'

/** Format minor units (cents) as currency string */
export function formatMoney(
  minorUnits: number,
  currency = 'USD',
  locale = typeof navigator !== 'undefined' ? navigator.language : 'en',
  position: CurrencyPosition = 'before',
): string {
  const value = minorUnits / 100
  const negative = value < 0
  const abs = Math.abs(value)
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).formatToParts(abs)

    const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency
    const number = parts
      .filter((p) => p.type !== 'currency' && p.type !== 'literal' && p.type !== 'minusSign')
      .map((p) => p.value)
      .join('')

    const body = position === 'after' ? `${number} ${symbol}` : `${symbol}${number}`
    return negative ? `−${body}` : body
  } catch {
    const fallback = abs.toFixed(2)
    const body = position === 'after' ? `${fallback} ${currency}` : `${currency}${fallback}`
    return negative ? `−${body}` : body
  }
}

export function getCurrencySymbol(
  currency = 'USD',
  locale = typeof navigator !== 'undefined' ? navigator.language : 'en',
): string {
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

/** Parse a decimal money string or number into minor units */
export function parseMoneyToMinor(input: string | number | null | undefined): number {
  if (input == null || input === '') return 0
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return 0
    return Math.round(input * 100)
  }
  const cleaned = String(input).replace(/[^\d.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0
  const num = Number.parseFloat(cleaned)
  if (Number.isNaN(num)) return 0
  return Math.round(num * 100)
}

export function minorToDisplay(minorUnits: number): string {
  return (Math.abs(minorUnits) / 100).toFixed(2)
}

export function signedAmount(type: 'expense' | 'income' | 'transfer', amount: number): number {
  if (type === 'expense') return -Math.abs(amount)
  if (type === 'income') return Math.abs(amount)
  return amount
}
