export type CurrencyPosition = 'before' | 'after'

/** Locale-independent symbols when Intl’s default is a 3-letter code. */
const CUSTOM_CURRENCY_SYMBOLS: Record<string, string> = {
  TJS: 'с.',
}

function resolveSymbol(currency: string, intlSymbol: string): string {
  return CUSTOM_CURRENCY_SYMBOLS[currency] ?? intlSymbol
}

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

    const symbol = resolveSymbol(
      currency,
      parts.find((p) => p.type === 'currency')?.value ?? currency,
    )
    const number = parts
      .filter((p) => p.type !== 'currency' && p.type !== 'literal' && p.type !== 'minusSign')
      .map((p) => p.value)
      .join('')

    const body =
      position === 'after'
        ? `${number} ${symbol}`
        : symbol.endsWith('.')
          ? `${symbol} ${number}`
          : `${symbol}${number}`
    return negative ? `−${body}` : body
  } catch {
    const symbol = resolveSymbol(currency, currency)
    const fallback = abs.toFixed(2)
    const body =
      position === 'after'
        ? `${fallback} ${symbol}`
        : symbol.endsWith('.')
          ? `${symbol} ${fallback}`
          : `${symbol}${fallback}`
    return negative ? `−${body}` : body
  }
}

export function getCurrencySymbol(
  currency = 'USD',
  locale = typeof navigator !== 'undefined' ? navigator.language : 'en',
): string {
  if (CUSTOM_CURRENCY_SYMBOLS[currency]) return CUSTOM_CURRENCY_SYMBOLS[currency]
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

/**
 * Parse a decimal money string, number, or simple +/− expression
 * (e.g. "13+24+50") into minor units.
 */
export function parseMoneyToMinor(input: string | number | null | undefined): number {
  if (input == null || input === '') return 0
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return 0
    return Math.round(input * 100)
  }
  return evaluateAmountExpression(String(input))
}

/** True when the amount field is a running calculation, not a single number. */
export function amountHasExpression(input: string): boolean {
  const expr = input.replace(/[−–—]/g, '-').replace(/\s/g, '')
  return /[+]/.test(expr) || /[0-9.]-/.test(expr)
}

export function evaluateAmountExpression(input: string): number {
  const expr = input
    .trim()
    .replace(/,/g, '.')
    .replace(/[−–—]/g, '-')
    .replace(/\s/g, '')
  if (!expr || expr === '-' || expr === '+' || expr === '.') return 0

  const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+-])/g)
  if (!tokens) return 0

  let total = 0
  let sign = 1
  let hasNumber = false
  let expectingNumber = true

  for (const tok of tokens) {
    if (tok === '+' || tok === '-') {
      if (expectingNumber) {
        if (tok === '-') sign *= -1
        continue
      }
      sign = tok === '-' ? -1 : 1
      expectingNumber = true
      continue
    }
    const n = Number.parseFloat(tok)
    if (!Number.isFinite(n)) continue
    total += sign * n
    hasNumber = true
    expectingNumber = false
    sign = 1
  }

  if (!hasNumber) return 0
  return Math.round(total * 100)
}

export function minorToDisplay(minorUnits: number): string {
  return (Math.abs(minorUnits) / 100).toFixed(2)
}

export function signedAmount(type: 'expense' | 'income' | 'transfer', amount: number): number {
  if (type === 'expense') return -Math.abs(amount)
  if (type === 'income') return Math.abs(amount)
  return amount
}
