import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  checkedAt,
  checkDatabase,
  type CapabilityCheck,
} from "../health"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const database: CapabilityCheck = {
    status: "available",
    required: true,
  }

  try {
    await checkDatabase(req)
  } catch {
    database.status = "unavailable"
  }

  const status = database.status === "available" ? "available" : "degraded"

  res.status(database.status === "available" ? 200 : 503).json({
    status,
    capabilities: {
      database,
    },
    checkedAt: checkedAt(),
  })
}

export const CORS = false
