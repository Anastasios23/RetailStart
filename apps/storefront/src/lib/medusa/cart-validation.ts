export function getIdentifier(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalizedValue = value.trim()

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(normalizedValue)) {
    return null
  }

  return normalizedValue
}

export function getPositiveSafeInteger(
  value: FormDataEntryValue | null
): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null
  }

  const quantity = Number(value.trim())

  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null
}
