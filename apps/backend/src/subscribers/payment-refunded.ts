import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules, PaymentEvents } from "@medusajs/framework/utils"
import {
  NotificationTemplates,
  buildNotificationIdempotencyKey,
  sanitizeNotificationPayload,
} from "../modules/notifications"

export type PaymentRefundedEventData = {
  id: string
  refund_id?: string
}

export type HandlePaymentRefundedEventInput = {
  data: PaymentRefundedEventData
  paymentService: any
  orderService: any
  notificationService: any
}

export async function handlePaymentRefundedEvent({
  data,
  paymentService,
  orderService,
  notificationService,
}: HandlePaymentRefundedEventInput): Promise<{ success: boolean; error?: string }> {
  try {
    const payment = await paymentService.retrievePayment(data.id, {
      relations: ["refunds"],
    })

    if (!payment) {
      return { success: false, error: `Payment ${data.id} not found` }
    }

    const orderId = payment.order_id || payment.data?.order_id
    if (!orderId) {
      return { success: true }
    }

    const order = await orderService.retrieveOrder(orderId)
    if (!order?.email) {
      return { success: true }
    }

    const latestRefund =
      (data.refund_id
        ? payment.refunds?.find((r: any) => r.id === data.refund_id)
        : null) ||
      payment.refunds?.at(-1)

    const refundId = latestRefund?.id || data.refund_id || "ref_latest"
    const amount = latestRefund?.amount ?? 0

    const sanitizedData = sanitizeNotificationPayload({
      orderId: order.id,
      displayId: order.display_id,
      refundId,
      amount,
      currencyCode: order.currency_code,
      note: latestRefund?.note,
    })

    const idempotencyKey = buildNotificationIdempotencyKey(
      NotificationTemplates.REFUND_CONFIRMATION,
      order.id,
      refundId
    )

    await notificationService.createNotifications([
      {
        to: order.email,
        channel: "email",
        template: NotificationTemplates.REFUND_CONFIRMATION,
        idempotency_key: idempotencyKey,
        data: sanitizedData,
      },
    ])

    return { success: true }
  } catch (err: any) {
    console.error(
      `[Notification Subscriber Error] Failed to handle payment-refunded event:`,
      err?.message || err
    )
    return {
      success: false,
      error: err?.message || "payment-refunded handler failed",
    }
  }
}

export default async function paymentRefundedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<PaymentRefundedEventData>) {
  const paymentService = container.resolve(Modules.PAYMENT)
  const orderService = container.resolve(Modules.ORDER)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  await handlePaymentRefundedEvent({
    data,
    paymentService,
    orderService,
    notificationService,
  })
}

export const config: SubscriberConfig = {
  event: PaymentEvents.REFUNDED,
}
