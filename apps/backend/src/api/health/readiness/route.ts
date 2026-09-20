import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { checkedAt, checkDatabase } from "../health"
import { isDraining } from "../shutdown"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (isDraining()) {
    res.status(503).json({
      status: "draining",
      checks: {
        configuration: { status: "available", required: true },
        database: { status: "available", required: true },
      },
      checkedAt: checkedAt(),
    })
    return
  }

  try {
    await checkDatabase(req)

    res.status(200).json({
      status: "ready",
      checks: {
        configuration: { status: "available", required: true },
        database: { status: "available", required: true },
      },
      checkedAt: checkedAt(),
    })
  } catch {
    res.status(503).json({
      status: "not_ready",
      checks: {
        configuration: { status: "available", required: true },
        database: { status: "unavailable", required: true },
      },
      checkedAt: checkedAt(),
    })
  }
}

export const CORS = false
