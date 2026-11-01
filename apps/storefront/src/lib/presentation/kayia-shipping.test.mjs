import assert from "node:assert/strict"
import test from "node:test"

const {
  formatKayiaShippingAmountLabel,
  getKayiaLocalZoneDisclaimer,
  getKayiaShippingAudience,
  getKayiaShippingEta,
  isBeforeKayiaLocalCutoff,
  isKayiaLocalWorkingDay,
  isPostalCodeInLocalZone,
  resolveKayiaShippingMethod,
} = await import("./kayia-shipping.ts")

test("resolves method from data.kayia_method and type.code", () => {
  assert.equal(
    resolveKayiaShippingMethod({ data: { kayia_method: "acs_point" } }),
    "acs_point"
  )
  assert.equal(resolveKayiaShippingMethod({ type: { code: "pickup" } }), "pharmacy_pickup")
  assert.equal(resolveKayiaShippingMethod({ name: "Other" }), null)
})

test("allows any postal code while local list is empty", () => {
  assert.equal(isPostalCodeInLocalZone("2224"), true)
  assert.equal(isPostalCodeInLocalZone(""), false)
})

test("formats free shipping label", () => {
  assert.equal(formatKayiaShippingAmountLabel(0, "0,00 €"), "Δωρεάν")
  assert.equal(formatKayiaShippingAmountLabel(3, "3,00 €"), "3,00 €")
})

test("uses Nicosia cutoff for local ETA", () => {
  // 2026-10-28 Wednesday; 08:00Z = 10:00 Asia/Nicosia (UTC+2 in Oct)
  const morning = new Date("2026-10-28T08:00:00.000Z")
  assert.equal(isKayiaLocalWorkingDay(morning), true)
  assert.equal(isBeforeKayiaLocalCutoff(morning), true)
  assert.match(getKayiaShippingEta("local_delivery", morning), /Σήμερα/)

  const afternoon = new Date("2026-10-28T12:00:00.000Z") // 15:00 Nicosia
  assert.equal(isBeforeKayiaLocalCutoff(afternoon), false)
  assert.match(getKayiaShippingEta("local_delivery", afternoon), /Επόμενη εργάσιμη/)
})

test("audience lines distinguish methods", () => {
  assert.match(getKayiaShippingAudience("pharmacy_pickup"), /φαρμακείο/)
  assert.match(getKayiaShippingAudience("acs_point"), /ACS/)
  assert.match(getKayiaShippingAudience("cyprus_door"), /Κύπρο/)
})

test("local zone disclaimer is honest while TK list is empty", () => {
  assert.match(getKayiaLocalZoneDisclaimer() ?? "", /Λευκωσίας/)
})
