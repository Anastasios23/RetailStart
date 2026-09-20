export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: string
): string {
  if (!Number.isFinite(amount)) {
    throw new Error("Money amount must be a finite number")
  }

  if (!currencyCode.trim()) {
    throw new Error("Money currency code is required")
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}
