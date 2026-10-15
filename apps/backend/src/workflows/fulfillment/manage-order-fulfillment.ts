import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows"
import { randomUUID } from "node:crypto"

export type FulfillmentType = "shipping" | "pickup"

export type FulfillmentStatus = "fulfilled" | "delivered" | "failed"

export type FulfillmentItemInput = {
  id: string
  quantity: number
}

export type ManageOrderFulfillmentInput = {
  order_id: string
  fulfillment_type: FulfillmentType
  items: FulfillmentItemInput[]
  location_id?: string
  operator_id?: string
  idempotency_key: string
  mark_as_delivered?: boolean
  metadata?: Record<string, any>
}

export type ManagedFulfillmentRecord = {
  id: string
  medusa_fulfillment_id?: string
  order_id: string
  fulfillment_type: FulfillmentType
  status: FulfillmentStatus
  items: FulfillmentItemInput[]
  delivered_at?: string
  operator_id?: string
  idempotency_key: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export type ValidateFulfillmentRequestInput = {
  order: {
    id: string
    status?: string
    items?: Array<{
      id: string
      quantity: number
      fulfilled_quantity?: number
    }>
  }
  items: FulfillmentItemInput[]
}

export function validateFulfillmentRequest({
  order,
  items,
}: ValidateFulfillmentRequestInput): { isValid: true } {
  if (order.status === "canceled") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot fulfill canceled order ${order.id}. Order lifecycle is terminated.`
    )
  }

  if (!items || items.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Fulfillment request must contain at least one item"
    )
  }

  const orderItemsMap = new Map(order.items?.map((i) => [i.id, i]) ?? [])

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Requested fulfillment quantity for item ${item.id} must be a positive quantity. Received: ${item.quantity}`
      )
    }

    const orderItem = orderItemsMap.get(item.id)
    if (!orderItem) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Item ${item.id} not found in order ${order.id}`
      )
    }

    const unfulfilled = orderItem.quantity - (orderItem.fulfilled_quantity ?? 0)
    if (item.quantity > unfulfilled) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Requested quantity ${item.quantity} for item ${item.id} exceeds unfulfilled quantity ${unfulfilled}`
      )
    }
  }

  return { isValid: true }
}

export type ExecuteOrderFulfillmentDependencies = {
  order: any
  input: ManageOrderFulfillmentInput
  existingFulfillment?: ManagedFulfillmentRecord | null
  createFulfillmentFn?: (args: {
    order_id: string
    items: FulfillmentItemInput[]
    metadata?: Record<string, any>
  }) => Promise<any>
  markDeliveredFn?: (args: {
    orderId: string
    fulfillmentId: string
  }) => Promise<any>
}

export type ExecuteOrderFulfillmentResult = {
  status: FulfillmentStatus
  fulfillment: ManagedFulfillmentRecord
  reused?: boolean
}

export async function executeOrderFulfillment({
  order,
  input,
  existingFulfillment,
  createFulfillmentFn,
  markDeliveredFn,
}: ExecuteOrderFulfillmentDependencies): Promise<ExecuteOrderFulfillmentResult> {
  // Idempotency check: Reuse existing record if already fulfilled or delivered
  if (
    existingFulfillment &&
    (existingFulfillment.status === "fulfilled" ||
      existingFulfillment.status === "delivered")
  ) {
    return {
      status: existingFulfillment.status,
      reused: true,
      fulfillment: existingFulfillment,
    }
  }

  validateFulfillmentRequest({ order, items: input.items })

  if (!createFulfillmentFn) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "createFulfillmentFn is required to execute fulfillment"
    )
  }

  const fulfillmentResult = await createFulfillmentFn({
    order_id: input.order_id,
    items: input.items,
    metadata: input.metadata,
  })

  const medusaFulfillmentId = fulfillmentResult?.id
  const now = new Date().toISOString()
  let finalStatus: FulfillmentStatus = "fulfilled"
  let deliveredAt: string | undefined = undefined

  // For Local Pickup or immediately confirmed handover: mark as delivered per ADR-0081/0131
  if (input.mark_as_delivered) {
    if (markDeliveredFn && medusaFulfillmentId) {
      await markDeliveredFn({
        orderId: input.order_id,
        fulfillmentId: medusaFulfillmentId,
      })
    }
    finalStatus = "delivered"
    deliveredAt = now
  }

  const record: ManagedFulfillmentRecord = {
    id: `rec_ful_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    medusa_fulfillment_id: medusaFulfillmentId,
    order_id: input.order_id,
    fulfillment_type: input.fulfillment_type,
    status: finalStatus,
    items: input.items,
    delivered_at: deliveredAt,
    operator_id: input.operator_id,
    idempotency_key: input.idempotency_key,
    metadata: input.metadata,
    created_at: now,
    updated_at: now,
  }

  return {
    status: finalStatus,
    fulfillment: record,
  }
}

export type ManageOrderFulfillmentStepInput = ManageOrderFulfillmentInput

export const manageOrderFulfillmentStep = createStep(
  "manage-order-fulfillment",
  async (
    input: ManageOrderFulfillmentStepInput,
    { container }
  ): Promise<StepResponse<ExecuteOrderFulfillmentResult>> => {
    const orderService = container.resolve(Modules.ORDER)

    const order = await orderService.retrieveOrder(input.order_id, {
      relations: ["items"],
    })

    const result = await executeOrderFulfillment({
      order,
      input,
      createFulfillmentFn: async (args) => {
        const { result: fulResult } = await createOrderFulfillmentWorkflow(
          container
        ).run({
          input: {
            order_id: args.order_id,
            items: args.items,
          },
        })
        return fulResult
      },
      markDeliveredFn: async (args) => {
        const { result: delResult } =
          await markOrderFulfillmentAsDeliveredWorkflow(container).run({
            input: {
              orderId: args.orderId,
              fulfillmentId: args.fulfillmentId,
            },
          })
        return delResult
      },
    })

    return new StepResponse<ExecuteOrderFulfillmentResult>(result)
  }
)

export const manageOrderFulfillmentWorkflow = createWorkflow(
  "manage-order-fulfillment",
  (input: ManageOrderFulfillmentStepInput) => {
    const result = manageOrderFulfillmentStep(input)
    return new WorkflowResponse(result)
  }
)
