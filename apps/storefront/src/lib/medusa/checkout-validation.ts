export const checkoutFieldNames = [
  "email",
  "first_name",
  "last_name",
  "address_1",
  "city",
  "postal_code",
  "country_code",
] as const

export type CheckoutFieldName = (typeof checkoutFieldNames)[number]

export type CheckoutFieldErrors = Partial<Record<CheckoutFieldName, string>>

export type CheckoutAddress = {
  first_name: string
  last_name: string
  address_1: string
  city: string
  postal_code: string
  country_code: string
}

export type ValidatedCheckoutContact = {
  email: string
  address: CheckoutAddress
}

export type CheckoutValidationResult =
  | { ok: true; value: ValidatedCheckoutContact }
  | { ok: false; fieldErrors: CheckoutFieldErrors }

const fieldLimits: Record<CheckoutFieldName, number> = {
  email: 254,
  first_name: 100,
  last_name: 100,
  address_1: 200,
  city: 100,
  postal_code: 40,
  country_code: 2,
}

function readString(formData: FormData, name: CheckoutFieldName): string {
  const value = formData.get(name)

  return typeof value === "string" ? value.trim() : ""
}

function validateText(
  value: string,
  field: CheckoutFieldName,
  label: string,
  errors: CheckoutFieldErrors
) {
  if (!value) {
    errors[field] = `${label} is required.`
    return
  }

  if (value.length > fieldLimits[field]) {
    errors[field] = `${label} is too long.`
  }
}

export function validateCheckoutContact(
  formData: FormData,
  allowedCountryCodes: readonly string[]
): CheckoutValidationResult {
  const email = readString(formData, "email")
  const firstName = readString(formData, "first_name")
  const lastName = readString(formData, "last_name")
  const address1 = readString(formData, "address_1")
  const city = readString(formData, "city")
  const postalCode = readString(formData, "postal_code")
  const countryCode = readString(formData, "country_code").toUpperCase()
  const errors: CheckoutFieldErrors = {}

  validateText(email, "email", "Email", errors)
  if (email && (email.length > fieldLimits.email || !/^\S+@\S+\.\S+$/.test(email))) {
    errors.email = "Enter a valid email address."
  }

  validateText(firstName, "first_name", "First name", errors)
  validateText(lastName, "last_name", "Last name", errors)
  validateText(address1, "address_1", "Address line 1", errors)
  validateText(city, "city", "City", errors)
  validateText(postalCode, "postal_code", "Postal code", errors)
  validateText(countryCode, "country_code", "Country", errors)

  const allowedCountries = new Set(
    allowedCountryCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)
  )

  if (countryCode && !allowedCountries.has(countryCode)) {
    errors.country_code = "Choose a country supported by this cart's region."
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors }
  }

  return {
    ok: true,
    value: {
      email,
      address: {
        first_name: firstName,
        last_name: lastName,
        address_1: address1,
        city,
        postal_code: postalCode,
        country_code: countryCode.toLowerCase(),
      },
    },
  }
}

export function hasStoredCheckoutContact(
  email: string | undefined,
  address:
    | {
        first_name?: string | null
        last_name?: string | null
        address_1?: string | null
        city?: string | null
        postal_code?: string | null
        country_code?: string | null
      }
    | undefined
): boolean {
  return Boolean(
    email?.trim() &&
      address?.first_name?.trim() &&
      address.last_name?.trim() &&
      address.address_1?.trim() &&
      address.city?.trim() &&
      address.postal_code?.trim() &&
      address.country_code?.trim()
  )
}
