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
}

describe("parseRuntimeEnvironment", () => {
  it("accepts the isolated local PostgreSQL connection", () => {
    expect(parseRuntimeEnvironment(validEnvironment).DATABASE_URL).toContain(
      "localhost:5433/retail_starter_dev"
    )
  })

  it("rejects a missing database URL", () => {
    const invalidEnvironment = { ...validEnvironment, DATABASE_URL: "" }

    expect(() => parseRuntimeEnvironment(invalidEnvironment)).toThrow()
  })
})
