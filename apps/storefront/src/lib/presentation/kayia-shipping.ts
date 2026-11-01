/**
 * Kayia client shipping presentation (docs/clients/katerina-kayia-shipping-design.md).
 * Prices and option availability stay Medusa-owned; this layer is labels / ETA / ACS UX.
 */

export type KayiaShippingMethod =
  | "pharmacy_pickup"
  | "local_delivery"
  | "acs_point"
  | "cyprus_door"

export type KayiaShippingOptionLike = {
  id?: string | null
  name?: string | null
  data?: Record<string, unknown> | null
  type?: { code?: string | null } | null
  shipping_option_type?: { code?: string | null } | null
}

/** Empty = do not filter local by TK yet (client TBD). */
export const KAYIA_LOCAL_POSTAL_CODES: readonly string[] = []

export const KAYIA_PHARMACY_ADDRESS = {
  first_name: "Παραλαβή",
  last_name: "Φαρμακείο",
  address_1: "Δημήτρη Σταύρου 3ΑΒ",
  city: "Λατσιά",
  postal_code: "2224",
  country_code: "cy",
  phone: "+35722480888",
} as const

export const KAYIA_PHARMACY_HOURS =
  "Δευ–Τρί, Πέμ–Παρ 08:00–13:30 & 15:00–18:30 · Τετ/Σάβ 08:00–13:30 · Κυρ κλειστά"

export const KAYIA_ACS_POINTS_URL = "https://cyp.acscourier.net/en/"

export const KAYIA_LOCAL_CUTOFF = {
  timeZone: "Asia/Nicosia",
  hour: 13,
  minute: 0,
} as const

const METHOD_BY_TYPE_CODE: Record<string, KayiaShippingMethod> = {
  pickup: "pharmacy_pickup",
  local_delivery: "local_delivery",
  acs_point: "acs_point",
  cyprus_door: "cyprus_door",
}

const METHOD_BY_DATA: Record<string, KayiaShippingMethod> = {
  pharmacy_pickup: "pharmacy_pickup",
  local_delivery: "local_delivery",
  acs_point: "acs_point",
  cyprus_door: "cyprus_door",
}

export function resolveKayiaShippingMethod(
  option: KayiaShippingOptionLike | null | undefined
): KayiaShippingMethod | null {
  if (!option) return null

  const dataMethod = option.data?.kayia_method
  if (typeof dataMethod === "string" && dataMethod in METHOD_BY_DATA) {
    return METHOD_BY_DATA[dataMethod]
  }

  const typeCode = option.type?.code ?? option.shipping_option_type?.code
  if (typeof typeCode === "string" && typeCode in METHOD_BY_TYPE_CODE) {
    return METHOD_BY_TYPE_CODE[typeCode]
  }

  return null
}

export function isKayiaPickup(method: KayiaShippingMethod | null): boolean {
  return method === "pharmacy_pickup"
}

export function isKayiaAcsPoint(method: KayiaShippingMethod | null): boolean {
  return method === "acs_point"
}

export function isKayiaLocalDelivery(method: KayiaShippingMethod | null): boolean {
  return method === "local_delivery"
}

export function isPostalCodeInLocalZone(postalCode: string | null | undefined): boolean {
  const normalized = postalCode?.trim()
  if (!normalized) return false
  if (KAYIA_LOCAL_POSTAL_CODES.length === 0) return true
  return KAYIA_LOCAL_POSTAL_CODES.includes(normalized)
}

function nicosiaParts(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KAYIA_LOCAL_CUTOFF.timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? ""
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "99")
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "99")
  return { weekday, hour, minute }
}

/** Working day for local same-day copy: Mon/Tue/Thu/Fri (not Wed afternoon-only semantics — Wed still morning). */
export function isKayiaLocalWorkingDay(now: Date = new Date()): boolean {
  const { weekday } = nicosiaParts(now)
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(weekday)
}

export function isBeforeKayiaLocalCutoff(now: Date = new Date()): boolean {
  const { hour, minute } = nicosiaParts(now)
  if (hour < KAYIA_LOCAL_CUTOFF.hour) return true
  if (hour > KAYIA_LOCAL_CUTOFF.hour) return false
  return minute < KAYIA_LOCAL_CUTOFF.minute
}

export function getKayiaShippingEta(
  method: KayiaShippingMethod | null,
  now: Date = new Date()
): string {
  switch (method) {
    case "pharmacy_pickup":
      return "Όταν ετοιμαστεί — παραλαβή εντός ωραρίου καταστήματος"
    case "local_delivery":
      if (isKayiaLocalWorkingDay(now) && isBeforeKayiaLocalCutoff(now)) {
        return "Σήμερα / εντός ημέρας (για παραγγελίες πριν τις 13:00)"
      }
      return "Επόμενη εργάσιμη εντός ωραρίου"
    case "acs_point":
      return "Συνήθως 1–2 εργάσιμες στο σημείο ACS"
    case "cyprus_door":
      return "Συνήθως 1–2 εργάσιμες στη διεύθυνση"
    default:
      return "Χρόνος παράδοσης βάσει επιλογής"
  }
}

/** One-line audience hint under the option title (Wolt-like clarity, no branding). */
export function getKayiaShippingAudience(method: KayiaShippingMethod | null): string {
  switch (method) {
    case "pharmacy_pickup":
      return "Παραλαβή από το φαρμακείο στα Λατσιά"
    case "local_delivery":
      return "Τοπική παράδοση — μεγαλύτερη περιοχή Λευκωσίας"
    case "acs_point":
      return "Παραλαβή από σημείο ACS στην Κύπρο"
    case "cyprus_door":
      return "Παράδοση στην πόρτα σας σε όλη την Κύπρο"
    default:
      return "Επιλογή αποστολής"
  }
}

/**
 * Shown when local delivery is selected and the postal-code allowlist is still empty.
 * Does not invent a zone filter — honest ops copy until the client supplies TK list.
 */
export function getKayiaLocalZoneDisclaimer(): string | null {
  if (KAYIA_LOCAL_POSTAL_CODES.length > 0) return null
  return "Η τοπική παράδοση αφορά τη μεγαλύτερη περιοχή Λευκωσίας. Αν ο Τ.Κ. είναι εκτός ζώνης, θα σας καλέσουμε για εναλλακτική (ACS ή παράδοση Κύπρου)."
}

export function formatKayiaShippingAmountLabel(
  amount: number | null,
  formatted: string | null
): string {
  if (amount === 0) return "Δωρεάν"
  return formatted ?? "—"
}
