import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import {
  NotificationTemplates,
  buildNotificationIdempotencyKey,
  sanitizeNotificationPayload,
} from "../../modules/notifications"

export type BuildPaymentFailedNotificationInput = {
  cartId?: string
  orderId?: string
  paymentId?: string
  email: string
  errorMessage?: string
  [key: string]: any
}

export type PaymentFailedNotificationPayloadItem = {
  to: string
  channel: string
  template: string
  idempotency_key: string
  data: Record<string, any>
}

export function buildPaymentFailedNotificationPayload(
  input: BuildPaymentFailedNotificationInput
): PaymentFailedNotificationPayloadItem {
  const entityId = input.cartId || input.orderId || "unknown_entity"
  const secondaryId = input.paymentId

  const sanitizedData = sanitizeNotificationPayload({
    cartId: input.cartId,
    orderId: input.orderId,
    paymentId: input.paymentId,
    errorMessage: input.errorMessage,
    ...input,
  })

  return {
    to: input.email,
    channel: "email",
    template: NotificationTemplates.PAYMENT_FAILED,
    idempotency_key: buildNotificationIdempotencyKey(
      NotificationTemplates.PAYMENT_FAILED,
      entityId,
      secondaryId
    ),
    data: sanitizedData,
  }
}

export type ExecuteSendPaymentFailedNotificationInput =
  BuildPaymentFailedNotificationInput & {
    notificationService: any
  }

export type PaymentFailedDeliveryResult = {
  success: boolean
  notifications?: any[]
  error?: string
}

export async function executeSendPaymentFailedNotification({
  notificationService,
  ...input
}: ExecuteSendPaymentFailedNotificationInput): Promise<PaymentFailedDeliveryResult> {
  try {
    const payload = buildPaymentFailedNotificationPayload(input)
    const created = await notificationService.createNotifications(payload)
    return { success: true, notifications: created }
  } catch (err: any) {
    // Per ADR-0124: Provider failure does not roll back commerce state.
    console.error(
      `[Notification Operational Failure] Payment failed notification for ${input.email} failed:`,
      err?.message || err
    )
    return {
      success: false,
      error: err?.message || "Payment-failed notification delivery failed",
    }
  }
}

export const sendPaymentFailedNotificationStep = createStep(
  "send-payment-failed-notification",
  async (
    input: BuildPaymentFailedNotificationInput,
    { container }
  ): Promise<StepResponse<PaymentFailedDeliveryResult>> => {
    const notificationService = container.resolve(Modules.NOTIFICATION)
    const result = await executeSendPaymentFailedNotification({
      ...input,
      notificationService,
    })
    return new StepResponse<PaymentFailedDeliveryResult>(result)
  }
)

export const sendPaymentFailedNotificationWorkflow = createWorkflow(
  "send-payment-failed-notification",
  (input: BuildPaymentFailedNotificationInput) => {
    const result = sendPaymentFailedNotificationStep(input)
    return new WorkflowResponse(result)
  }
)
