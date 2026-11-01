#!/usr/bin/env node
/**
 * Idempotent Kayia shipping option setup / verify for Medusa Admin.
 *
 * Creates (or reports) the four V1 options from
 * docs/clients/katerina-kayia-shipping-design.md:
 *   pharmacy_pickup €0 | local_delivery €3 | acs_point €4 | cyprus_door €6
 * Paid methods get a conditional EUR price of 0 when item_total >= 40.
 *
 * Usage (from repo root, backend running):
 *   MEDUSA_BACKEND_URL=http://localhost:9000 \
 *   MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
 *   node scripts/setup-kayia-shipping.mjs
 *
 * Env:
 *   MEDUSA_BACKEND_URL (default http://localhost:9000)
 *   MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD — required for create/update
 *   KAYIA_SHIPPING_DRY_RUN=1 — list/match only, no writes
 */

const BASE = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
const DRY = process.env.KAYIA_SHIPPING_DRY_RUN === "1"
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

const DESIRED = [
  {
    kayia_method: "pharmacy_pickup",
    name: "Παραλαβή από φαρμακείο",
    type_code: "pickup",
    type_label: "Παραλαβή από κατάστημα",
    type_description: "Customer collects at pharmacy",
    amount: 0,
    free_over_40: false,
  },
  {
    kayia_method: "local_delivery",
    name: "Τοπική παράδοση (Λευκωσία)",
    type_code: "local_delivery",
    type_label: "Τοπική παράδοση",
    type_description: "Greater Nicosia local delivery",
    amount: 3,
    free_over_40: true,
  },
  {
    kayia_method: "acs_point",
    name: "Παραλαβή από σημείο ACS",
    type_code: "acs_point",
    type_label: "Παραλαβή ACS",
    type_description: "ACS pickup point",
    amount: 4,
    free_over_40: true,
  },
  {
    kayia_method: "cyprus_door",
    name: "Παράδοση σε διεύθυνση (Κύπρος)",
    type_code: "cyprus_door",
    type_label: "Παράδοση διεύθυνσης",
    type_description: "Cyprus door delivery",
    amount: 6,
    free_over_40: true,
  },
]

function methodOf(option) {
  const data = option?.data?.kayia_method
  if (typeof data === "string") return data
  const code = option?.type?.code ?? option?.shipping_option_type?.code
  return typeof code === "string" ? code : null
}

async function adminFetch(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const msg = json?.message || json?.raw || res.statusText
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`)
  }
  return json
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD")
  }
  const json = await adminFetch("/auth/user/emailpass", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  })
  const token = json?.token
  if (!token) throw new Error("Admin login did not return a token")
  return token
}

async function ensureType(token, desired, typesByCode) {
  const existing = typesByCode.get(desired.type_code)
  if (existing) return existing.id

  if (DRY) {
    console.log(`[dry] would create shipping-option-type ${desired.type_code}`)
    return null
  }

  const created = await adminFetch("/admin/shipping-option-types", {
    token,
    method: "POST",
    body: {
      label: desired.type_label,
      description: desired.type_description,
      code: desired.type_code,
    },
  })
  const id = created?.shipping_option_type?.id
  if (!id) throw new Error(`Failed to create type ${desired.type_code}`)
  typesByCode.set(desired.type_code, created.shipping_option_type)
  console.log(`created type ${desired.type_code} → ${id}`)
  return id
}

async function main() {
  console.log(`Kayia shipping setup @ ${BASE}${DRY ? " (dry-run)" : ""}`)

  const token = await login()
  const optionsJson = await adminFetch("/admin/shipping-options?limit=100", { token })
  const options = optionsJson?.shipping_options || []
  const typesJson = await adminFetch("/admin/shipping-option-types?limit=100", { token })
  const typesByCode = new Map(
    (typesJson?.shipping_option_types || [])
      .filter((t) => t?.code)
      .map((t) => [t.code, t])
  )

  const stockLocations = await adminFetch("/admin/stock-locations?limit=20", { token })
  const location = (stockLocations?.stock_locations || [])[0]
  if (!location) throw new Error("No stock location found")

  const fulfillmentSets = location.fulfillment_sets || []
  let serviceZoneId = null
  for (const set of fulfillmentSets) {
    for (const zone of set.service_zones || []) {
      serviceZoneId = zone.id
      break
    }
    if (serviceZoneId) break
  }

  if (!serviceZoneId) {
    // Expand location with fulfillment sets
    const full = await adminFetch(
      `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`,
      { token }
    )
    for (const set of full?.stock_location?.fulfillment_sets || []) {
      for (const zone of set.service_zones || []) {
        serviceZoneId = zone.id
        break
      }
      if (serviceZoneId) break
    }
  }

  if (!serviceZoneId) throw new Error("No service zone on stock location")

  const profiles = await adminFetch("/admin/shipping-profiles?limit=20", { token })
  const profileId = (profiles?.shipping_profiles || [])[0]?.id
  if (!profileId) throw new Error("No shipping profile found")

  const byMethod = new Map()
  for (const option of options) {
    const method = methodOf(option)
    if (method && DESIRED.some((d) => d.kayia_method === method || d.type_code === method)) {
      const key =
        option?.data?.kayia_method ||
        (method === "pickup" ? "pharmacy_pickup" : method)
      byMethod.set(key, option)
    }
  }

  for (const desired of DESIRED) {
    const existing = byMethod.get(desired.kayia_method)
    if (existing) {
      console.log(
        `OK  ${desired.kayia_method.padEnd(18)} ${existing.id}  «${existing.name}»`
      )
      continue
    }

    const typeId = await ensureType(token, desired, typesByCode)
    if (DRY || !typeId) {
      console.log(`[dry] would create option ${desired.kayia_method}`)
      continue
    }

    const prices = [
      {
        currency_code: "eur",
        amount: desired.amount,
      },
    ]
    if (desired.free_over_40) {
      prices.push({
        currency_code: "eur",
        amount: 0,
        rules: [{ attribute: "item_total", operator: "gte", value: 40 }],
      })
    }

    const created = await adminFetch("/admin/shipping-options", {
      token,
      method: "POST",
      body: {
        name: desired.name,
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: profileId,
        type: {
          label: desired.type_label,
          description: desired.type_description,
          code: desired.type_code,
        },
        data: {
          id: "manual-fulfillment",
          kayia_method: desired.kayia_method,
        },
        prices,
      },
    })

    const id = created?.shipping_option?.id
    console.log(`created ${desired.kayia_method} → ${id}`)
  }

  console.log("done")
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
