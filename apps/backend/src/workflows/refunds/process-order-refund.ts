import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  NotificationTemplates,
  buildNotificationIdempotencyKey,
  sanitizeNotificationPayload,
} from "../../modules/notifications"
import { randomUUID } from "node:crypto"

import type { BigNumberValue } from "@medusajs/framework/types"

export type RefundStatus =
  | "succeeded"
  | "failed"
  | "pending"
  | "ambiguous"
  | "manually_reconciled"

export type RefundRecord = {
  id: string
  order_id: string
  payment_id: string
  amount: number
  currency_code: string
  status: RefundStatus
  provider_refund_id?: string
  operator_id?: string
  reason?: string
  note?: string
  idempotency_key: string
  error_message?: string
  reconciliation_note?: string
  created_at: string
  updated_at: string
}

export type RefundReconciliationInput = {
  action: "mark_reconciled" | "force_retry"
  provider_refund_id?: string
  note?: string
  operator_id?: string
}

export type ProcessOrderRefundInput = {
  order: {
    id: string
    display_id?: number
    email?: string | null
    currency_code?: string
    total?: BigNumberValue
    metadata?: Record<string, any> | null
  }
  payment: {
    id: string
    amount: BigNumberValue
    captured_amount?: BigNumberValue
    refunded_amount?: BigNumberValue
    currency_code: string
    provider_id?: string
    data?: Record<string, any> | null
  }
  amount: number
  reason?: string
  note?: string
  operator_id?: string
  idempotency_key: string
  reconciliation?: RefundReconciliationInput
}

export type ClassifyRefundOutcomeInput = {
  providerResult?: any
  error?: any
}

export type ClassifiedRefundOutcome = {
  status: RefundStatus
  isAmbiguous: boolean
  providerRefundId?: string
  errorMessage?: string
}

const AMBIGUOUS_ERROR_PATTERNS = [
  /etimedout/i,
  /econnreset/i,
  /timeout/i,
  /socket hang up/i,
  /enotfound/i,
  /network/i,
  /rate limit/i,
  /502/i,
  /503/i,
  /504/i,
]

export function classifyRefundOutcome({
  providerResult,
  error,
}: ClassifyRefundOutcomeInput): ClassifiedRefundOutcome {
  if (providerResult && !error) {
    return {
      status: "succeeded",
      isAmbiguous: false,
      providerRefundId: providerResult.id || providerResult.provider_refund_id,
    }
  }

  const errMsg = error?.message || String(error || "Unknown provider error")
  const isAmbiguous = AMBIGUOUS_ERROR_PATTERNS.some((pattern) =>
    pattern.test(errMsg)
  )

  return {
    status: isAmbiguous ? "ambiguous" : "failed",
    isAmbiguous,
    errorMessage: errMsg,
  }
}

export type RefundNotificationPayload = {
  to: string
  channel: string
  template: string
  idempotency_key: string
  data: Record<string, any>
}

export function buildRefundNotificationPayload({
  order,
  refund,
}: {
  order: ProcessOrderRefundInput["order"]
  refund: RefundRecord
}): RefundNotificationPayload | null {
  if (!order.email) {
    return null
  }

  const sanitizedData = sanitizeNotificationPayload({
    orderId: order.id,
    displayId: order.display_id,
    refundId: refund.id,
    amount: refund.amount,
    currencyCode: refund.currency_code,
    reason: refund.reason,
  })

  return {
    to: order.email,
    channel: "email",
    template: NotificationTemplates.REFUND_CONFIRMATION,
    idempotency_key: buildNotificationIdempotencyKey(
      NotificationTemplates.REFUND_CONFIRMATION,
      order.id,
      refund.id
    ),
    data: sanitizedData,
  }
}

export type ExecuteOrderRefundDependencies = {
  input: ProcessOrderRefundInput
  existingRefund?: RefundRecord | null
  refundPaymentFn?: (args: {
    payment_id: string
    amount: number
    data?: Record<string, any>
  }) => Promise<any>
  notificationService?: {
    createNotifications: (notifications: any[]) => Promise<any>
  }
}

export type ExecuteOrderRefundResult = {
  status: RefundStatus
  refund: RefundRecord
  reused?: boolean
}

export async function executeOrderRefund({
  input,
  existingRefund,
  refundPaymentFn,
  notificationService,
}: ExecuteOrderRefundDependencies): Promise<ExecuteOrderRefundResult> {
  const captured = Number(input.payment.captured_amount ?? input.payment.amount)
  const alreadyRefunded = Number(input.payment.refunded_amount ?? 0)
  const refundable = captured - alreadyRefunded

  if (input.amount <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Refund amount must be positive. Received: ${input.amount}`
    )
  }

  if (input.amount > refundable) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Refund amount ${input.amount} exceeds refundable amount ${refundable}`
    )
  }

  // Idempotency check against prior refund state
  if (existingRefund) {
    if (existingRefund.status === "succeeded") {
      return {
        status: "succeeded",
        reused: true,
        refund: existingRefund,
      }
    }

    if (existingRefund.status === "ambiguous") {
      if (input.reconciliation?.action === "mark_reconciled") {
        const reconciledRefund: RefundRecord = {
          ...existingRefund,
          status: "manually_reconciled",
          provider_refund_id: input.reconciliation.provider_refund_id,
          reconciliation_note: input.reconciliation.note,
          operator_id: input.reconciliation.operator_id ?? existingRefund.operator_id,
          updated_at: new Date().toISOString(),
        }

        if (notificationService && input.order.email) {
          const payload = buildRefundNotificationPayload({
            order: input.order,
            refund: reconciledRefund,
          })
          if (payload) {
            try {
              await notificationService.createNotifications([payload])
            } catch (err: any) {
              console.error(
                `[Notification Warning] Reconciled refund notification delivery failed:`,
                err?.message || err
              )
            }
          }
        }

        return {
          status: "manually_reconciled",
          refund: reconciledRefund,
        }
      }

      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot retry refund in ambiguous state without explicit reconciliation (ADR-0129). ` +
          `Operator must reconcile before issuing potentially duplicate refund.`
      )
    }
  }

  const refundId = `ref_${randomUUID().replace(/-/g, "").slice(0, 16)}`
  const now = new Date().toISOString()

  let outcome: ClassifiedRefundOutcome
  try {
    if (!refundPaymentFn) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "refundPaymentFn is required to execute provider refund"
      )
    }

    const providerResult = await refundPaymentFn({
      payment_id: input.payment.id,
      amount: input.amount,
      data: { idempotency_key: input.idempotency_key },
    })

    outcome = classifyRefundOutcome({ providerResult })
  } catch (err: any) {
    outcome = classifyRefundOutcome({ error: err })
  }

  const refundRecord: RefundRecord = {
    id: refundId,
    order_id: input.order.id,
    payment_id: input.payment.id,
    amount: input.amount,
    currency_code: input.payment.currency_code,
    status: outcome.status,
    provider_refund_id: outcome.providerRefundId,
    operator_id: input.operator_id,
    reason: input.reason,
    note: input.note,
    idempotency_key: input.idempotency_key,
    error_message: outcome.errorMessage,
    created_at: now,
    updated_at: now,
  }

  // Uphold ADR-0129: Emit notification ONLY after provider-confirmed success
  if (outcome.status === "succeeded" && notificationService && input.order.email) {
    const payload = buildRefundNotificationPayload({
      order: input.order,
      refund: refundRecord,
    })
    if (payload) {
      try {
        await notificationService.createNotifications([payload])
      } catch (err: any) {
        // Notification failure does NOT invalidate authoritative refund per ADR-0124
        console.error(
          `[Notification Operational Failure] Refund notification delivery failed:`,
          err?.message || err
        )
      }
    }
  }

  return {
    status: outcome.status,
    refund: refundRecord,
  }
}

export type ProcessOrderRefundStepInput = {
  order_id: string
  payment_id: string
  amount: number
  reason?: string
  note?: string
  operator_id?: string
  idempotency_key: string
  reconciliation?: RefundReconciliationInput
}

export const processOrderRefundStep = createStep(
  "process-order-refund",
  async (
    input: ProcessOrderRefundStepInput,
    { container }
  ): Promise<StepResponse<ExecuteOrderRefundResult>> => {
    const orderService = container.resolve(Modules.ORDER)
    const paymentService = container.resolve(Modules.PAYMENT)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    const order = await orderService.retrieveOrder(input.order_id)
    const payment = await paymentService.retrievePayment(input.payment_id)

    const result = await executeOrderRefund({
      input: {
        order,
        payment,
        amount: input.amount,
        reason: input.reason,
        note: input.note,
        operator_id: input.operator_id,
        idempotency_key: input.idempotency_key,
        reconciliation: input.reconciliation,
      },
      refundPaymentFn: async (args) => {
        return await paymentService.refundPayment(args)
      },
      notificationService,
    })

    return new StepResponse<ExecuteOrderRefundResult>(result)
  }
)

export const processOrderRefundWorkflow = createWorkflow(
  "process-order-refund",
  (input: ProcessOrderRefundStepInput) => {
    const result = processOrderRefundStep(input)
    return new WorkflowResponse(result)
  }
)
