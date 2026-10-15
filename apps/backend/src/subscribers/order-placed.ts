import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendOrderNotificationsWorkflow } from "../workflows/notifications/send-order-notifications"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    await sendOrderNotificationsWorkflow(container).run({
      input: {
        order_id: data.id,
      },
    })
  } catch (err: any) {
    // Per ADR-0124: Provider failure does not roll back an authoritative transition.
    // Asynchronous notification delivery failure is logged for operator recovery.
    console.error(
      `[Notification Subscriber Error] Failed to dispatch order notifications for order ${data?.id}:`,
      err?.message || err
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
