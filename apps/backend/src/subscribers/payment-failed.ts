import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendPaymentFailedNotificationWorkflow } from "../workflows/notifications/send-payment-failed-notification"

export type PaymentFailedEventData = {
  cart_id?: string
  order_id?: string
  payment_id?: string
  email?: string
  error_message?: string
}

export default async function paymentFailedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentFailedEventData>) {
  try {
    await sendPaymentFailedNotificationWorkflow(container).run({
      input: {
        cartId: data?.cart_id,
        orderId: data?.order_id,
        paymentId: data?.payment_id,
        email: data?.email || "",
        errorMessage: data?.error_message,
      },
    })
  } catch (err: any) {
    // Per ADR-0124: Provider failure does not roll back an authoritative transition.
    console.error(
      `[Notification Subscriber Error] Failed to dispatch payment-failed notification:`,
      err?.message || err
    )
  }
}

export const config: SubscriberConfig = {
  event: ["payment.payment_failed", "payment_session.failed"],
}
