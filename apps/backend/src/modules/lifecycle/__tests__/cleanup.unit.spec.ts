import {
  executeCartSessionCleanup,
  executeCustomerDataMinimization,
} from "../cleanup"
import { DataClassRetentionRule } from "../types"

describe("Data Minimization and Cleanup Workflows (ADR-0042, ADR-0146)", () => {
  const now = new Date("2026-10-18T12:00:00.000Z")

  const cartRule: DataClassRetentionRule = {
    data_class: "cart_session",
    owner: "medusa_backend",
    retention_period_days: 30,
    trigger: "duration_after_finalization",
    action: "hard_delete",
    backup_implications: "Ephemeral carts purged",
  }

  const customerRule: DataClassRetentionRule = {
    data_class: "customer_account",
    owner: "medusa_backend",
    retention_period_days: 730,
    trigger: "explicit_client_request",
    action: "anonymize",
    backup_implications: "Customer PII anonymized in primary DB",
  }

  describe("executeCartSessionCleanup", () => {
    it("purges stale abandoned carts older than retention threshold while preserving active and completed ones", () => {
      const carts = [
        {
          id: "cart_recent",
          created_at: new Date("2026-10-10T12:00:00.000Z").toISOString(), // 8 days old
          completed_at: null,
        },
        {
          id: "cart_stale_abandoned",
          created_at: new Date("2026-08-01T12:00:00.000Z").toISOString(), // > 70 days old
          completed_at: null,
        },
        {
          id: "cart_old_completed",
          created_at: new Date("2026-08-01T12:00:00.000Z").toISOString(),
          completed_at: new Date("2026-08-01T12:30:00.000Z").toISOString(), // Completed order cart!
        },
      ]

      const result = executeCartSessionCleanup(carts, cartRule, now)

      expect(result.purged_cart_ids).toEqual(["cart_stale_abandoned"])
      expect(result.retained_carts.map((c) => c.id).sort()).toEqual([
        "cart_old_completed",
        "cart_recent",
      ])
    })
  })

  describe("executeCustomerDataMinimization", () => {
    it("anonymizes PII fields while preserving customer ID and order associations", () => {
      const customers = [
        {
          id: "cus_123",
          email: "jane.doe@example.com",
          first_name: "Jane",
          last_name: "Doe",
          phone: "+15551234567",
          orders_count: 5,
        },
      ]

      const minimized = executeCustomerDataMinimization(customers, customerRule)

      expect(minimized[0].id).toBe("cus_123")
      expect(minimized[0].first_name).toBe("[REDACTED]")
      expect(minimized[0].last_name).toBe("[REDACTED]")
      expect(minimized[0].phone).toBeNull()
      expect(minimized[0].email).toBe("anonymized_cus_123@redacted.invalid")
      expect(minimized[0].orders_count).toBe(5) // Accounting linkage preserved
    })
  })
})
