import {
  validateFulfillmentRequest,
  executeOrderFulfillment,
  type ManageOrderFulfillmentInput,
  type ManagedFulfillmentRecord,
} from "../manage-order-fulfillment"

describe("manage-order-fulfillment workflow & domain (ADR-0081, ADR-0131, ADR-0132)", () => {
  const mockOrder = {
    id: "order_ful_123",
    status: "pending",
    items: [
      { id: "item_tee_1", quantity: 2, fulfilled_quantity: 0 },
      { id: "item_tee_2", quantity: 1, fulfilled_quantity: 0 },
    ],
  }

  const mockShippingInput: ManageOrderFulfillmentInput = {
    order_id: "order_ful_123",
    fulfillment_type: "shipping",
    items: [
      { id: "item_tee_1", quantity: 2 },
      { id: "item_tee_2", quantity: 1 },
    ],
    operator_id: "op_warehouse_1",
    idempotency_key: "idem_ful_ship_1",
  }

  const mockPickupInput: ManageOrderFulfillmentInput = {
    order_id: "order_ful_123",
    fulfillment_type: "pickup",
    items: [{ id: "item_tee_1", quantity: 2 }],
    operator_id: "op_store_1",
    idempotency_key: "idem_ful_pickup_1",
    mark_as_delivered: true, // In-store customer handover
  }

  describe("validateFulfillmentRequest", () => {
    it("validates valid order and items", () => {
      const validation = validateFulfillmentRequest({
        order: mockOrder,
        items: [{ id: "item_tee_1", quantity: 2 }],
      })

      expect(validation.isValid).toBe(true)
    })

    it("rejects fulfillment for canceled orders", () => {
      const canceledOrder = { ...mockOrder, status: "canceled" }
      expect(() =>
        validateFulfillmentRequest({
          order: canceledOrder,
          items: [{ id: "item_tee_1", quantity: 1 }],
        })
      ).toThrow(/canceled order/i)
    })

    it("rejects fulfillment when item is not in order", () => {
      expect(() =>
        validateFulfillmentRequest({
          order: mockOrder,
          items: [{ id: "item_nonexistent", quantity: 1 }],
        })
      ).toThrow(/not found in order/i)
    })

    it("rejects fulfillment quantity exceeding unfulfilled quantity", () => {
      const partiallyFulfilledOrder = {
        ...mockOrder,
        items: [{ id: "item_tee_1", quantity: 2, fulfilled_quantity: 1 }],
      }

      expect(() =>
        validateFulfillmentRequest({
          order: partiallyFulfilledOrder,
          items: [{ id: "item_tee_1", quantity: 2 }], // Only 1 unfulfilled
        })
      ).toThrow(/exceeds unfulfilled quantity/i)
    })

    it("rejects non-positive requested quantity", () => {
      expect(() =>
        validateFulfillmentRequest({
          order: mockOrder,
          items: [{ id: "item_tee_1", quantity: 0 }],
        })
      ).toThrow(/positive quantity/i)
    })
  })

  describe("executeOrderFulfillment", () => {
    it("executes standard shipping fulfillment", async () => {
      const mockCreateFulfillment = jest.fn().mockResolvedValue({
        id: "ful_ship_001",
        order_id: "order_ful_123",
        packed_at: new Date().toISOString(),
      })

      const result = await executeOrderFulfillment({
        order: mockOrder,
        input: mockShippingInput,
        createFulfillmentFn: mockCreateFulfillment,
      })

      expect(result.status).toBe("fulfilled")
      expect(result.fulfillment.fulfillment_type).toBe("shipping")
      expect(result.fulfillment.medusa_fulfillment_id).toBe("ful_ship_001")
      expect(result.fulfillment.items).toEqual(mockShippingInput.items)
      expect(mockCreateFulfillment).toHaveBeenCalledWith({
        order_id: "order_ful_123",
        items: mockShippingInput.items,
        metadata: undefined,
      })
    })

    it("executes local-pickup fulfillment with immediate delivered handover", async () => {
      const mockCreateFulfillment = jest.fn().mockResolvedValue({
        id: "ful_pickup_001",
        order_id: "order_ful_123",
      })
      const mockMarkDelivered = jest.fn().mockResolvedValue({
        id: "ful_pickup_001",
        delivered_at: new Date().toISOString(),
      })

      const result = await executeOrderFulfillment({
        order: mockOrder,
        input: mockPickupInput,
        createFulfillmentFn: mockCreateFulfillment,
        markDeliveredFn: mockMarkDelivered,
      })

      expect(result.status).toBe("delivered")
      expect(result.fulfillment.fulfillment_type).toBe("pickup")
      expect(result.fulfillment.delivered_at).toBeDefined()
      expect(mockCreateFulfillment).toHaveBeenCalled()
      expect(mockMarkDelivered).toHaveBeenCalledWith({
        orderId: "order_ful_123",
        fulfillmentId: "ful_pickup_001",
      })
    })

    it("is idempotent: reuses existing fulfillment record without double fulfillment", async () => {
      const mockCreateFulfillment = jest.fn()
      const existingFulfillment: ManagedFulfillmentRecord = {
        id: "rec_ful_001",
        medusa_fulfillment_id: "ful_ship_001",
        order_id: "order_ful_123",
        fulfillment_type: "shipping",
        status: "fulfilled",
        items: mockShippingInput.items,
        operator_id: "op_warehouse_1",
        idempotency_key: "idem_ful_ship_1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const result = await executeOrderFulfillment({
        order: mockOrder,
        input: mockShippingInput,
        existingFulfillment,
        createFulfillmentFn: mockCreateFulfillment,
      })

      expect(result.status).toBe("fulfilled")
      expect(result.reused).toBe(true)
      expect(result.fulfillment.id).toBe("rec_ful_001")
      expect(mockCreateFulfillment).not.toHaveBeenCalled()
    })
  })
})
