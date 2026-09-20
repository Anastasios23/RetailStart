import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = (_req: MedusaRequest, res: MedusaResponse) => {
  res.status(200).json({
    status: "ok",
    checkedAt: new Date().toISOString(),
  })
}

export const CORS = false
