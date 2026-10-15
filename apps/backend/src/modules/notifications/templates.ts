export const NotificationTemplates = {
  ORDER_PLACED: "order-placed",
  ADMIN_NEW_ORDER: "admin-new-order",
  PAYMENT_FAILED: "payment-failed",
  REFUND_CONFIRMATION: "refund-confirmation",
} as const

export type NotificationTemplateType =
  (typeof NotificationTemplates)[keyof typeof NotificationTemplates]
