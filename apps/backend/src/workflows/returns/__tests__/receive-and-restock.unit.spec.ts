import {
  processReturnInspection,
  executeReceiveAndRestock,
  type ReceiveAndRestockInput,
  type ReturnReceiptRecord,
} from "../receive-and-restock"

describe("receive-and-restock workflow & domain (ADR-0130)", () => {
  const mockInput: ReceiveAndRestockInput = {
    order_id: "order_test_123",
    return_id: "ret_test_123",
    location_id: "sloc_main_warehouse",
    operator_id: "usr_warehouse_operator",
    idempotency_key: "idem_ret_001",
    items: [
      {
        item_id: "line_item_1",
        inventory_item_id: "iitem_tee_white_m",
        quantity: 2,
        is_sellable: true,
        note: "Unopened original packaging, verified mint condition",
      },
      {
        item_id: "line_item_2",
        inventory_item_id: "iitem_tee_black_l",
        quantity: 1,
        is_sellable: false,
        damage_reason: "Torn seam, stained fabric",
        note: "Customer worn and damaged, cannot resell",
      },
    ],
  }

  describe("processReturnInspection", () => {
    it("partitions items into sellable (restocked) and non-sellable (quarantined) per ADR-0130", () => {
      const inspection = processReturnInspection(mockInput)

      expect(inspection.sellableItems).toHaveLength(1)
      expect(inspection.sellableItems[0].inventory_item_id).toBe("iitem_tee_white_m")
      expect(inspection.sellableItems[0].quantity).toBe(2)

      expect(inspection.quarantinedItems).toHaveLength(1)
      expect(inspection.quarantinedItems[0].inventory_item_id).toBe("iitem_tee_black_l")
      expect(inspection.quarantinedItems[0].quantity).toBe(1)
      expect(inspection.quarantinedItems[0].damage_reason).toBe("Torn seam, stained fabric")

      expect(inspection.inventoryAdjustments).toEqual([
        {
          inventory_item_id: "iitem_tee_white_m",
          location_id: "sloc_main_warehouse",
          adjustment: 2,
        },
      ])
    })

    it("rejects invalid non-positive quantities", () => {
      const invalidInput: ReceiveAndRestockInput = {
        ...mockInput,
        items: [
          {
            item_id: "line_item_1",
            inventory_item_id: "iitem_1",
            quantity: 0,
            is_sellable: true,
          },
        ],
      }

      expect(() => processReturnInspection(invalidInput)).toThrow(
        /positive quantity/i
      )
    })

    it("requires inventory_item_id when item is marked sellable", () => {
      const missingInventoryIdInput: ReceiveAndRestockInput = {
        ...mockInput,
        items: [
          {
            item_id: "line_item_1",
            quantity: 1,
            is_sellable: true,
          },
        ],
      }

      expect(() => processReturnInspection(missingInventoryIdInput)).toThrow(
        /inventory_item_id is required/i
      )
    })

    it("produces zero inventory adjustments if all returned items are damaged/unsellable", () => {
      const allDamagedInput: ReceiveAndRestockInput = {
        ...mockInput,
        items: [
          {
            item_id: "line_item_2",
            inventory_item_id: "iitem_tee_black_l",
            quantity: 3,
            is_sellable: false,
            damage_reason: "Water damage in transit",
          },
        ],
      }

      const inspection = processReturnInspection(allDamagedInput)

      expect(inspection.sellableItems).toHaveLength(0)
      expect(inspection.quarantinedItems).toHaveLength(1)
      expect(inspection.quarantinedItems[0].quantity).toBe(3)
      expect(inspection.inventoryAdjustments).toHaveLength(0)
    })
  })

  describe("executeReceiveAndRestock", () => {
    it("executes receipt and applies inventory adjustments only for sellable items", async () => {
      const mockAdjustInventory = jest.fn().mockResolvedValue([
        {
          inventory_item_id: "iitem_tee_white_m",
          location_id: "sloc_main_warehouse",
          stocked_quantity: 12,
        },
      ])
      const mockReceiveReturnInOrder = jest.fn().mockResolvedValue({
        id: "ret_test_123",
        status: "received",
      })

      const result = await executeReceiveAndRestock({
        input: mockInput,
        adjustInventoryFn: mockAdjustInventory,
        receiveReturnFn: mockReceiveReturnInOrder,
      })

      expect(result.status).toBe("completed")
      expect(result.receipt.restocked_items).toHaveLength(1)
      expect(result.receipt.restocked_items[0].quantity).toBe(2)
      expect(result.receipt.quarantined_items).toHaveLength(1)
      expect(result.receipt.quarantined_items[0].quantity).toBe(1)
      expect(result.receipt.operator_id).toBe("usr_warehouse_operator")

      expect(mockAdjustInventory).toHaveBeenCalledWith([
        {
          inventory_item_id: "iitem_tee_white_m",
          location_id: "sloc_main_warehouse",
          adjustment: 2,
        },
      ])
      expect(mockReceiveReturnInOrder).toHaveBeenCalledWith({
        return_id: "ret_test_123",
        items: [
          { id: "line_item_1", quantity: 2 },
          { id: "line_item_2", quantity: 1 },
        ],
      })
    })

    it("does not call inventory adjustment if no items are sellable", async () => {
      const mockAdjustInventory = jest.fn()
      const mockReceiveReturnInOrder = jest.fn().mockResolvedValue({
        id: "ret_test_123",
        status: "received",
      })

      const inputWithOnlyDamaged: ReceiveAndRestockInput = {
        ...mockInput,
        items: [
          {
            item_id: "line_item_2",
            inventory_item_id: "iitem_tee_black_l",
            quantity: 1,
            is_sellable: false,
            damage_reason: "Completely destroyed",
          },
        ],
      }

      const result = await executeReceiveAndRestock({
        input: inputWithOnlyDamaged,
        adjustInventoryFn: mockAdjustInventory,
        receiveReturnFn: mockReceiveReturnInOrder,
      })

      expect(result.status).toBe("completed")
      expect(mockAdjustInventory).not.toHaveBeenCalled()
      expect(result.receipt.restocked_items).toHaveLength(0)
      expect(result.receipt.quarantined_items).toHaveLength(1)
    })

    it("is idempotent: reuses existing receipt record without re-adjusting stock", async () => {
      const mockAdjustInventory = jest.fn()
      const existingReceipt: ReturnReceiptRecord = {
        id: "rcpt_existing_123",
        order_id: "order_test_123",
        return_id: "ret_test_123",
        location_id: "sloc_main_warehouse",
        operator_id: "usr_warehouse_operator",
        idempotency_key: "idem_ret_001",
        status: "completed",
        restocked_items: [
          {
            item_id: "line_item_1",
            inventory_item_id: "iitem_tee_white_m",
            quantity: 2,
          },
        ],
        quarantined_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const result = await executeReceiveAndRestock({
        input: mockInput,
        existingReceipt,
        adjustInventoryFn: mockAdjustInventory,
      })

      expect(result.status).toBe("completed")
      expect(result.reused).toBe(true)
      expect(result.receipt.id).toBe("rcpt_existing_123")
      expect(mockAdjustInventory).not.toHaveBeenCalled()
    })
  })
})
