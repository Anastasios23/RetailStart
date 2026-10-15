/**
 * Builds a deterministic, collision-free idempotency key for notification intents.
 * Format: `notif_<template>_<entityId>` or `notif_<template>_<entityId>_<secondaryId>`
 */
export function buildNotificationIdempotencyKey(
  template: string,
  entityId: string,
  secondaryId?: string
): string {
  const parts = ["notif", template, entityId]
  if (secondaryId) {
    parts.push(secondaryId)
  }
  return parts.join("_")
}
