import { DataClassRetentionRule } from "./types"

export interface CartSessionRecord {
  id: string
  created_at: string
  completed_at?: string | null
  [key: string]: any
}

export interface CustomerAccountRecord {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  [key: string]: any
}

/**
 * Executes retention cleanup for ephemeral cart sessions (ADR-0042, ADR-0146).
 * Purges abandoned carts older than retention threshold while preserving completed order carts.
 */
export function executeCartSessionCleanup(
  carts: CartSessionRecord[],
  rule: DataClassRetentionRule,
  referenceTime: Date = new Date()
): { purged_cart_ids: string[]; retained_carts: CartSessionRecord[] } {
  const retentionMs = rule.retention_period_days * 24 * 60 * 60 * 1000
  const thresholdTime = referenceTime.getTime() - retentionMs

  const purged_cart_ids: string[] = []
  const retained_carts: CartSessionRecord[] = []

  for (const cart of carts) {
    const createdAtTime = Date.parse(cart.created_at)
    const isCompleted = !!cart.completed_at
    const isStale = !isNaN(createdAtTime) && createdAtTime < thresholdTime

    // Only purge incomplete/abandoned carts that have exceeded the retention window
    if (isStale && !isCompleted) {
      purged_cart_ids.push(cart.id)
    } else {
      retained_carts.push(cart)
    }
  }

  return {
    purged_cart_ids,
    retained_carts,
  }
}

/**
 * Anonymizes customer PII upon client request while preserving accounting and order continuity (ADR-0042, ADR-0146).
 */
export function executeCustomerDataMinimization(
  customers: CustomerAccountRecord[],
  rule: DataClassRetentionRule
): CustomerAccountRecord[] {
  return customers.map((customer) => {
    return {
      ...customer,
      first_name: "[REDACTED]",
      last_name: "[REDACTED]",
      phone: null,
      email: `anonymized_${customer.id}@redacted.invalid`,
    }
  })
}
