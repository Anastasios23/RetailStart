import { parseRuntimeEnvironment } from "../environment"

const validEnvironment = {
  STORE_CORS: "http://localhost:8000",
  ADMIN_CORS: "http://localhost:9000",
  AUTH_CORS: "http://localhost:9000",
  JWT_SECRET: "local-jwt-secret",
  COOKIE_SECRET: "local-cookie-secret",
  DATABASE_URL:
    "postgres://retail_starter:retail_starter_local@localhost:5433/retail_starter_dev",
  DB_NAME: "retail_starter_dev",
  STRIPE_API_KEY: "stripe-api-key-placeholder",
  STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret-placeholder",
  STRIPE_PAYMENT_METHOD_CONFIGURATION: "pmc_testconfiguration",
}

describe("parseRuntimeEnvironment", () => {
  it("rejects a missing database URL", () => {
    const invalidEnvironment = { ...validEnvironment, DATABASE_URL: "" }

    expect(() => parseRuntimeEnvironment(invalidEnvironment)).toThrow()
  })

  it("applies default media storage configuration per ADR-0008", () => {
    const parsed = parseRuntimeEnvironment(validEnvironment)

    expect(parsed.MEDIA_STORAGE_DRIVER).toBe("local")
    expect(parsed.MEDIA_PUBLIC_URL_PREFIX).toBe("/static/media")
    expect(parsed.MEDIA_UPLOAD_MAX_SIZE_BYTES).toBe(20971520)
  })

  it("accepts custom media configuration overrides", () => {
    const customEnvironment = {
      ...validEnvironment,
      MEDIA_STORAGE_DRIVER: "s3" as const,
      MEDIA_PUBLIC_URL_PREFIX: "https://cdn.retail-starter.internal/media",
      MEDIA_SIGNING_SECRET: "custom-media-secret",
      MEDIA_UPLOAD_MAX_SIZE_BYTES: "10485760", // 10 MB as string in env
    }

    const parsed = parseRuntimeEnvironment(customEnvironment)

    expect(parsed.MEDIA_STORAGE_DRIVER).toBe("s3")
    expect(parsed.MEDIA_PUBLIC_URL_PREFIX).toBe(
      "https://cdn.retail-starter.internal/media"
    )
    expect(parsed.MEDIA_SIGNING_SECRET).toBe("custom-media-secret")
    expect(parsed.MEDIA_UPLOAD_MAX_SIZE_BYTES).toBe(10485760)
  })
})
