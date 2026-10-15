import {
  classifyRefundOutcome,
  buildRefundNotificationPayload,
  executeOrderRefund,
  type ProcessOrderRefundInput,
  type RefundRecord,
} from "../process-order-refund"
import { NotificationTemplates } from "../../../modules/notifications"

describe("process-order-refund workflow & domain", () => {
  const mockOrder = {
    id: "order_123",
    display_id: 1001,
    email: "customer@example.com",
    currency_code: "eur",
    total: 5000,
  }

  const mockPayment = {
    id: "pay_123",
    amount: 5000,
    captured_amount: 5000,
    refunded_amount: 0,
    currency_code: "eur",
    provider_id: "pp_stripe_stripe",
    data: { id: "pi_stripe_123" },
  }

  describe("classifyRefundOutcome", () => {
    it("classifies successful provider refund as succeeded", () => {
      const outcome = classifyRefundOutcome({
        providerResult: { id: "re_stripe_123", status: "succeeded" },
      })
      expect(outcome.status).toBe("succeeded")
      expect(outcome.providerRefundId).toBe("re_stripe_123")
      expect(outcome.isAmbiguous).toBe(false)
    })

    it("classifies transient/network/timeout errors as ambiguous per ADR-0129", () => {
      const outcome = classifyRefundOutcome({
        error: new Error("ETIMEDOUT: Connection timed out to api.stripe.com"),
      })
      expect(outcome.status).toBe("ambiguous")
      expect(outcome.isAmbiguous).toBe(true)
      expect(outcome.errorMessage).toContain("ETIMEDOUT")
    })

    it("classifies deterministic business rejection as failed", () => {
      const outcome = classifyRefundOutcome({
        error: new Error("Charge ch_123 has already been fully refunded."),
      })
      expect(outcome.status).toBe("failed")
      expect(outcome.isAmbiguous).toBe(false)
      expect(outcome.errorMessage).toContain("already been fully refunded")
    })
  })

  describe("buildRefundNotificationPayload", () => {
    it("creates refund confirmation payload with deterministic idempotency key", () => {
      const refundRecord: RefundRecord = {
        id: "ref_001",
        order_id: "order_123",
        payment_id: "pay_123",
        amount: 2500,
        currency_code: "eur",
        status: "succeeded",
        provider_refund_id: "re_123",
        operator_id: "usr_admin",
        reason: "Customer requested partial return",
        idempotency_key: "idem_ref_001",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const payload = buildRefundNotificationPayload({
        order: mockOrder,
        refund: refundRecord,
      })

      expect(payload).toBeDefined()
      expect(payload?.to).toBe("customer@example.com")
      expect(payload?.template).toBe(NotificationTemplates.REFUND_CONFIRMATION)
      expect(payload?.idempotency_key).toBe(
        "notif_refund-confirmation_order_123_ref_001"
      )
      expect(payload?.data.amount).toBe(2500)
      expect(payload?.data.currencyCode).toBe("eur")
      expect(payload?.data.orderId).toBe("order_123")
    })

    it("returns null if order email is missing", () => {
      const payload = buildRefundNotificationPayload({
        order: { ...mockOrder, email: null },
        refund: {
          id: "ref_001",
          order_id: "order_123",
          payment_id: "pay_123",
          amount: 2500,
          currency_code: "eur",
          status: "succeeded",
          idempotency_key: "idem_ref_001",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })

      expect(payload).toBeNull()
    })
  })

  describe("executeOrderRefund", () => {
    it("executes full refund successfully and dispatches notification only after provider success", async () => {
      const mockRefundPayment = jest.fn().mockResolvedValue({
        id: "re_stripe_999",
        amount: 5000,
      })
      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue([{ id: "notif_ref_1" }]),
      }

      const input: ProcessOrderRefundInput = {
        order: mockOrder,
        payment: mockPayment,
        amount: 5000,
        reason: "Customer returned product",
        operator_id: "admin_user_1",
        idempotency_key: "idem_test_full_1",
      }

      const result = await executeOrderRefund({
        input,
        refundPaymentFn: mockRefundPayment,
        notificationService: mockNotificationService as any,
      })

      expect(result.status).toBe("succeeded")
      expect(result.refund.amount).toBe(5000)
      expect(result.refund.provider_refund_id).toBe("re_stripe_999")
      expect(mockRefundPayment).toHaveBeenCalledWith({
        payment_id: "pay_123",
        amount: 5000,
        data: { idempotency_key: "idem_test_full_1" },
      })
      expect(mockNotificationService.createNotifications).toHaveBeenCalledTimes(1)
      const notifArg = mockNotificationService.createNotifications.mock.calls[0][0]
      expect(notifArg[0].template).toBe(NotificationTemplates.REFUND_CONFIRMATION)
    })

    it("executes partial refund without restocking inventory (ADR-0130 invariant)", async () => {
      const mockRefundPayment = jest.fn().mockResolvedValue({
        id: "re_stripe_partial",
        amount: 1500,
      })
      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue([{ id: "notif_ref_2" }]),
      }

      const input: ProcessOrderRefundInput = {
        order: mockOrder,
        payment: mockPayment,
        amount: 1500,
        reason: "Partial goodwill gesture",
        operator_id: "admin_user_2",
        idempotency_key: "idem_partial_1",
      }

      const result = await executeOrderRefund({
        input,
        refundPaymentFn: mockRefundPayment,
        notificationService: mockNotificationService as any,
      })

      expect(result.status).toBe("succeeded")
      expect(result.refund.amount).toBe(1500)
      expect(mockRefundPayment).toHaveBeenCalledWith({
        payment_id: "pay_123",
        amount: 1500,
        data: { idempotency_key: "idem_partial_1" },
      })
      // ADR-0130 check: Refund result must NOT have inventory effects
      expect((result as any).restocked_items).toBeUndefined()
    })

    it("prevents duplicate execution if idempotency key already succeeded", async () => {
      const mockRefundPayment = jest.fn()
      const existingRefund: RefundRecord = {
        id: "ref_existing_1",
        order_id: "order_123",
        payment_id: "pay_123",
        amount: 5000,
        currency_code: "eur",
        status: "succeeded",
        provider_refund_id: "re_stripe_existing",
        idempotency_key: "idem_dup_test",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const result = await executeOrderRefund({
        input: {
          order: mockOrder,
          payment: mockPayment,
          amount: 5000,
          idempotency_key: "idem_dup_test",
        },
        existingRefund,
        refundPaymentFn: mockRefundPayment,
      })

      expect(result.status).toBe("succeeded")
      expect(result.reused).toBe(true)
      expect(result.refund.id).toBe("ref_existing_1")
      expect(mockRefundPayment).not.toHaveBeenCalled()
    })

    it("blocks retry on ambiguous refund unless explicit reconciliation is requested per ADR-0129", async () => {
      const mockRefundPayment = jest.fn()
      const ambiguousRefund: RefundRecord = {
        id: "ref_ambig_1",
        order_id: "order_123",
        payment_id: "pay_123",
        amount: 5000,
        currency_code: "eur",
        status: "ambiguous",
        idempotency_key: "idem_ambig_test",
        error_message: "ETIMEDOUT to Stripe",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await expect(
        executeOrderRefund({
          input: {
            order: mockOrder,
            payment: mockPayment,
            amount: 5000,
            idempotency_key: "idem_ambig_test",
          },
          existingRefund: ambiguousRefund,
          refundPaymentFn: mockRefundPayment,
        })
      ).rejects.toThrow(/ambiguous.*reconcil/i)

      expect(mockRefundPayment).not.toHaveBeenCalled()
    })

    it("allows manual reconciliation of ambiguous refund with operator audit evidence", async () => {
      const ambiguousRefund: RefundRecord = {
        id: "ref_ambig_2",
        order_id: "order_123",
        payment_id: "pay_123",
        amount: 5000,
        currency_code: "eur",
        status: "ambiguous",
        idempotency_key: "idem_ambig_reconcile",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue([{ id: "notif_ref_3" }]),
      }

      const result = await executeOrderRefund({
        input: {
          order: mockOrder,
          payment: mockPayment,
          amount: 5000,
          idempotency_key: "idem_ambig_reconcile",
          reconciliation: {
            action: "mark_reconciled",
            provider_refund_id: "re_stripe_verified_manually",
            note: "Confirmed charge refund in Stripe Dashboard by Lead Op",
            operator_id: "lead_operator_9",
          },
        },
        existingRefund: ambiguousRefund,
        refundPaymentFn: jest.fn(),
        notificationService: mockNotificationService as any,
      })

      expect(result.status).toBe("manually_reconciled")
      expect(result.refund.provider_refund_id).toBe("re_stripe_verified_manually")
      expect(result.refund.reconciliation_note).toContain("Confirmed charge refund")
      expect(result.refund.operator_id).toBe("lead_operator_9")
      // Notification is sent once reconciled as successful
      expect(mockNotificationService.createNotifications).toHaveBeenCalledTimes(1)
    })

    it("does NOT dispatch notification when refund fails", async () => {
      const mockRefundPayment = jest.fn().mockRejectedValue(
        new Error("StripeCardError: Charge ch_123 has already been refunded.")
      )
      const mockNotificationService = {
        createNotifications: jest.fn(),
      }

      const result = await executeOrderRefund({
        input: {
          order: mockOrder,
          payment: mockPayment,
          amount: 5000,
          idempotency_key: "idem_fail_1",
        },
        refundPaymentFn: mockRefundPayment,
        notificationService: mockNotificationService as any,
      })

      expect(result.status).toBe("failed")
      expect(result.refund.error_message).toContain("already been refunded")
      expect(mockNotificationService.createNotifications).not.toHaveBeenCalled()
    })

    it("validates that refund amount cannot exceed available captured amount", async () => {
      const partialPayment = {
        ...mockPayment,
        captured_amount: 3000,
        refunded_amount: 2000, // only 1000 refundable
      }

      await expect(
        executeOrderRefund({
          input: {
            order: mockOrder,
            payment: partialPayment,
            amount: 2000, // exceeds remaining 1000
            idempotency_key: "idem_exceed_1",
          },
          refundPaymentFn: jest.fn(),
        })
      ).rejects.toThrow(/exceeds refundable amount/i)
    })
  })
})
