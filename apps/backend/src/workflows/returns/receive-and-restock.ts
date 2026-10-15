import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { adjustInventoryLevelsStep } from "@medusajs/medusa/core-flows"
import { randomUUID } from "node:crypto"

export type ReturnInspectionItemInput = {
  item_id: string
  inventory_item_id?: string
  quantity: number
  is_sellable: boolean
  damage_reason?: string
  note?: string
}

export type ReceiveAndRestockInput = {
  order_id: string
  return_id: string
  location_id: string
  operator_id: string
  idempotency_key: string
  items: ReturnInspectionItemInput[]
}

export type InventoryLevelAdjustment = {
  inventory_item_id: string
  location_id: string
  adjustment: number
}

export type ReturnReceiptRecord = {
  id: string
  order_id: string
  return_id: string
  location_id: string
  operator_id: string
  idempotency_key: string
  status: "completed" | "failed"
  restocked_items: Array<{
    item_id: string
    inventory_item_id: string
    quantity: number
  }>
  quarantined_items: Array<{
    item_id: string
    inventory_item_id?: string
    quantity: number
    damage_reason?: string
    note?: string
  }>
  created_at: string
  updated_at: string
}

export type ProcessReturnInspectionResult = {
  sellableItems: Array<{
    item_id: string
    inventory_item_id: string
    quantity: number
  }>
  quarantinedItems: Array<{
    item_id: string
    inventory_item_id?: string
    quantity: number
    damage_reason?: string
    note?: string
  }>
  inventoryAdjustments: InventoryLevelAdjustment[]
}

export function processReturnInspection(
  input: ReceiveAndRestockInput
): ProcessReturnInspectionResult {
  const sellableItems: ProcessReturnInspectionResult["sellableItems"] = []
  const quarantinedItems: ProcessReturnInspectionResult["quarantinedItems"] = []
  const inventoryAdjustments: InventoryLevelAdjustment[] = []

  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Returned item ${item.item_id} must have a positive quantity. Received: ${item.quantity}`
      )
    }

    if (item.is_sellable) {
      if (!item.inventory_item_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `inventory_item_id is required when item ${item.item_id} is marked sellable`
        )
      }

      sellableItems.push({
        item_id: item.item_id,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
      })

      inventoryAdjustments.push({
        inventory_item_id: item.inventory_item_id,
        location_id: input.location_id,
        adjustment: item.quantity,
      })
    } else {
      // Per ADR-0130: Damaged or unsellable items NEVER re-enter inventory
      quarantinedItems.push({
        item_id: item.item_id,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
        damage_reason: item.damage_reason,
        note: item.note,
      })
    }
  }

  return {
    sellableItems,
    quarantinedItems,
    inventoryAdjustments,
  }
}

export type ExecuteReceiveAndRestockDependencies = {
  input: ReceiveAndRestockInput
  existingReceipt?: ReturnReceiptRecord | null
  adjustInventoryFn?: (
    adjustments: InventoryLevelAdjustment[]
  ) => Promise<any>
  receiveReturnFn?: (args: {
    return_id: string
    items: Array<{ id: string; quantity: number }>
  }) => Promise<any>
}

export type ExecuteReceiveAndRestockResult = {
  status: "completed" | "failed"
  reused?: boolean
  receipt: ReturnReceiptRecord
}

export async function executeReceiveAndRestock({
  input,
  existingReceipt,
  adjustInventoryFn,
  receiveReturnFn,
}: ExecuteReceiveAndRestockDependencies): Promise<ExecuteReceiveAndRestockResult> {
  // Idempotency check against prior receipt state
  if (existingReceipt && existingReceipt.status === "completed") {
    return {
      status: "completed",
      reused: true,
      receipt: existingReceipt,
    }
  }

  const { sellableItems, quarantinedItems, inventoryAdjustments } =
    processReturnInspection(input)

  // 1. If physical goods return order receive function is provided, mark received in order module
  if (receiveReturnFn) {
    await receiveReturnFn({
      return_id: input.return_id,
      items: input.items.map((i) => ({
        id: i.item_id,
        quantity: i.quantity,
      })),
    })
  }

  // 2. Adjust inventory only for sellable goods per ADR-0130
  if (inventoryAdjustments.length > 0 && adjustInventoryFn) {
    await adjustInventoryFn(inventoryAdjustments)
  }

  const receiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`
  const now = new Date().toISOString()

  const receipt: ReturnReceiptRecord = {
    id: receiptId,
    order_id: input.order_id,
    return_id: input.return_id,
    location_id: input.location_id,
    operator_id: input.operator_id,
    idempotency_key: input.idempotency_key,
    status: "completed",
    restocked_items: sellableItems,
    quarantined_items: quarantinedItems,
    created_at: now,
    updated_at: now,
  }

  return {
    status: "completed",
    receipt,
  }
}

export type ReceiveAndRestockStepInput = ReceiveAndRestockInput

export const receiveAndRestockStep = createStep(
  "receive-and-restock",
  async (
    input: ReceiveAndRestockStepInput,
    { container }
  ): Promise<StepResponse<ExecuteReceiveAndRestockResult>> => {
    const orderService = container.resolve(Modules.ORDER)
    const inventoryService = container.resolve(Modules.INVENTORY)

    const result = await executeReceiveAndRestock({
      input,
      receiveReturnFn: async (args) => {
        return await orderService.receiveReturn(args)
      },
      adjustInventoryFn: async (adjustments) => {
        return await inventoryService.adjustInventory(
          adjustments.map((adj) => ({
            inventoryItemId: adj.inventory_item_id,
            locationId: adj.location_id,
            adjustment: adj.adjustment,
          }))
        )
      },
    })

    return new StepResponse<ExecuteReceiveAndRestockResult>(result)
  }
)

export const receiveAndRestockWorkflow = createWorkflow(
  "receive-and-restock",
  (input: ReceiveAndRestockStepInput) => {
    const result = receiveAndRestockStep(input)
    return new WorkflowResponse(result)
  }
)
