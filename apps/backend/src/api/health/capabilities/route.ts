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

  const payment_gateway: CapabilityCheck = {
    status: process.env.STRIPE_API_KEY ? "available" : "unavailable",
    required: false,
  }

  const media: CapabilityCheck = {
    status: "available",
    required: false,
  }

  const notifications: CapabilityCheck = {
    status: "available",
    required: false,
  }

  try {
    await checkDatabase(req)
  } catch {
    database.status = "unavailable"
  }

  let status: "available" | "degraded" | "unavailable" = "available"
  let statusCode = 200

  if (database.status === "unavailable") {
    status = "unavailable"
    statusCode = 503
  } else if (
    payment_gateway.status === "unavailable" ||
    media.status === "unavailable" ||
    notifications.status === "unavailable"
  ) {
    status = "degraded"
    statusCode = 200
  }

  res.status(statusCode).json({
    status,
    capabilities: {
      database,
      payment_gateway,
      media,
      notifications,
    },
    checkedAt: checkedAt(),
  })
}

export const CORS = false
