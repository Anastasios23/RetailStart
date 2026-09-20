import Medusa from "@medusajs/js-sdk"

const requiredEnvironmentVariables = [
  "MEDUSA_BACKEND_URL",
  "MEDUSA_PUBLISHABLE_KEY",
  "MEDUSA_REGION_ID",
  "MEDUSA_COUNTRY_CODE",
] as const

type StorefrontEnvironment = {
  backendUrl: string
  publishableKey: string
  regionId: string
  countryCode: string
}

export class StorefrontConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StorefrontConfigurationError"
  }
}

function readStorefrontEnvironment(): StorefrontEnvironment {
  const missing = requiredEnvironmentVariables.filter(
    (name) => !process.env[name]?.trim()
  )

  if (missing.length > 0) {
    const message = `Missing required storefront environment variables: ${missing.join(", ")}`
    console.error(message)
    throw new StorefrontConfigurationError(message)
  }

  const backendUrl = process.env.MEDUSA_BACKEND_URL!.trim()

  try {
    new URL(backendUrl)
  } catch {
    const message = "MEDUSA_BACKEND_URL must be a valid absolute URL"
    console.error(message)
    throw new StorefrontConfigurationError(message)
  }

  return {
    backendUrl,
    publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY!.trim(),
    regionId: process.env.MEDUSA_REGION_ID!.trim(),
    countryCode: process.env.MEDUSA_COUNTRY_CODE!.trim(),
  }
}

let medusaClient: Medusa | undefined

export function getMedusaClient(): Medusa {
  if (!medusaClient) {
    const environment = readStorefrontEnvironment()
    medusaClient = new Medusa({
      baseUrl: environment.backendUrl,
      publishableKey: environment.publishableKey,
    })
  }

  return medusaClient
}

export function getMedusaPricingContext() {
  const environment = readStorefrontEnvironment()

  return {
    region_id: environment.regionId,
    country_code: environment.countryCode,
  }
}
