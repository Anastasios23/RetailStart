import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type CheckStatus = "available" | "unavailable"

export type CapabilityCheck = {
  status: CheckStatus
  required: boolean
}

export async function checkDatabase(req: MedusaRequest): Promise<void> {
  const connection = req.scope.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  )

  await connection.raw("select 1")
}

export function checkedAt(): string {
  return new Date().toISOString()
}
