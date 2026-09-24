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
})
