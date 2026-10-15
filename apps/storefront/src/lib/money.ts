export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: string
): string {
  if (!Number.isFinite(amount)) {
    throw new Error("Money amount must be a finite number")
  }

  const normalizedCurrency = currencyCode.trim().toUpperCase()

  if (!normalizedCurrency) {
    throw new Error("Money currency code is required")
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amount)
  } catch (error) {
    if (error instanceof RangeError) {
      return `${amount} ${normalizedCurrency}`
    }
    throw error
  }
}
