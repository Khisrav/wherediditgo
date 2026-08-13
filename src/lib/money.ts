/** Format minor units (cents) as currency string */
export function formatMoney(
  minorUnits: number,
  currency = 'USD',
  locale = navigator.language,
): string {
  const value = minorUnits / 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
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
