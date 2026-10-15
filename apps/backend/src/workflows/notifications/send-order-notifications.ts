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

export type NotificationPayloadItem = {
  to: string
  channel: string
  template: string
  idempotency_key: string
  data: Record<string, any>
}

export type BuildOrderNotificationsInput = {
  order: any
  adminEmail?: string
}

export type BuildOrderNotificationsResult = {
  customerNotification: NotificationPayloadItem | null
  adminNotification: NotificationPayloadItem | null
}

export function buildOrderNotificationsPayload({
  order,
  adminEmail,
}: BuildOrderNotificationsInput): BuildOrderNotificationsResult {
  const sanitizedOrderData = sanitizeNotificationPayload({
    orderId: order?.id,
    displayId: order?.display_id,
    total: order?.total,
    currencyCode: order?.currency_code,
    customerEmail: order?.email,
    items: order?.items,
    metadata: order?.metadata,
  })

  let customerNotification: NotificationPayloadItem | null = null
  if (order?.email) {
    customerNotification = {
      to: order.email,
      channel: "email",
      template: NotificationTemplates.ORDER_PLACED,
      idempotency_key: buildNotificationIdempotencyKey(
        NotificationTemplates.ORDER_PLACED,
        order.id
      ),
      data: sanitizedOrderData,
    }
  }

  const effectiveAdminEmail =
    adminEmail ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    "admin@retail-starter.internal"

  let adminNotification: NotificationPayloadItem | null = null
  if (effectiveAdminEmail) {
    adminNotification = {
      to: effectiveAdminEmail,
      channel: "email",
      template: NotificationTemplates.ADMIN_NEW_ORDER,
      idempotency_key: buildNotificationIdempotencyKey(
        NotificationTemplates.ADMIN_NEW_ORDER,
        order.id
      ),
      data: sanitizedOrderData,
    }
  }

  return { customerNotification, adminNotification }
}

export type ExecuteSendOrderNotificationsInput = {
  order: any
  adminEmail?: string
  notificationService: any
}

export type NotificationDeliveryResult = {
  success: boolean
  notifications?: any[]
  error?: string
}

export async function executeSendOrderNotifications({
  order,
  adminEmail,
  notificationService,
}: ExecuteSendOrderNotificationsInput): Promise<NotificationDeliveryResult> {
  try {
    const { customerNotification, adminNotification } =
      buildOrderNotificationsPayload({
        order,
        adminEmail,
      })

    const notificationsToSend: NotificationPayloadItem[] = []
    if (customerNotification) {
      notificationsToSend.push(customerNotification)
    }
    if (adminNotification) {
      notificationsToSend.push(adminNotification)
    }

    if (notificationsToSend.length === 0) {
      return { success: true, notifications: [] }
    }

    const created =
      await notificationService.createNotifications(notificationsToSend)
    return { success: true, notifications: created }
  } catch (err: any) {
    // Per ADR-0124: Provider failure does not roll back an authoritative transition.
    // Commerce remains authoritative and notification failure remains visible for operator recovery.
    console.error(
      `[Notification Operational Failure] Order ${order?.id} notification failed:`,
      err?.message || err
    )
    return {
      success: false,
      error: err?.message || "Order notification delivery failed",
    }
  }
}

export type SendOrderNotificationsStepInput = {
  orderId: string
  adminEmail?: string
}

export const sendOrderNotificationsStep = createStep(
  "send-order-notifications",
  async (
    input: SendOrderNotificationsStepInput,
    { container }
  ): Promise<StepResponse<NotificationDeliveryResult>> => {
    const notificationService = container.resolve(Modules.NOTIFICATION)
    const orderService = container.resolve(Modules.ORDER)

    let order: any = null
    try {
      order = await orderService.retrieveOrder(input.orderId, {
        relations: ["items"],
      })
    } catch (retrieveErr: any) {
      console.error(
        `[Notification Operational Failure] Failed to retrieve order ${input.orderId}:`,
        retrieveErr?.message || retrieveErr
      )
      return new StepResponse<NotificationDeliveryResult>({
        success: false,
        error: retrieveErr?.message || "Order retrieval failed",
      })
    }

    const result = await executeSendOrderNotifications({
      order,
      adminEmail: input.adminEmail,
      notificationService,
    })

    return new StepResponse<NotificationDeliveryResult>(result)
  }
)

export type SendOrderNotificationsWorkflowInput = {
  order_id: string
  adminEmail?: string
}

export const sendOrderNotificationsWorkflow = createWorkflow(
  "send-order-notifications",
  (input: SendOrderNotificationsWorkflowInput) => {
    const result = sendOrderNotificationsStep({
      orderId: input.order_id,
      adminEmail: input.adminEmail,
    })

    return new WorkflowResponse(result)
  }
)
