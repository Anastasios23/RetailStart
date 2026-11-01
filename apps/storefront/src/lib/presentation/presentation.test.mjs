import assert from "node:assert/strict"
import test from "node:test"

const { DEFAULT_PRESENTATION_CONFIG, getPublicPresentationConfig } = await import("./config.ts")

test("presentation config falls back to default baseline when custom config is absent", () => {
  const config = getPublicPresentationConfig(null)
  assert.equal(config.branding.name, "Retail Starter")
  assert.equal(config.seo.default_title, "Retail Starter")
  assert.equal(config.seo.title_template, "%s | Retail Starter")
  assert.equal(config.navigation.header.length, 5)
  assert.equal(config.navigation.header[0].label, "Home")
})

test("presentation config accepts pharmacy-style Greek branding override", () => {
  const config = getPublicPresentationConfig({
    branding: {
      name: "Φαρμακείο Κατερίνα Καγιά",
      tagline: "Personal care · Wellness · Cosmetics",
    },
    seo: {
      default_title: "Φαρμακείο Κατερίνα Καγιά | Λατσιά",
      title_template: "%s | Φαρμακείο Κατερίνα Καγιά",
      default_description: "Φαρμακείο στα Λατσιά",
      robots: "index, follow",
    },
    navigation: {
      header: [{ label: "Αρχική", href: "/" }],
      footer: [{ label: "Προϊόντα", href: "/products" }],
    },
  })
  assert.equal(config.branding.name, "Φαρμακείο Κατερίνα Καγιά")
  assert.equal(config.navigation.header[0].label, "Αρχική")
  assert.match(config.seo.default_title, /Κατερίνα Καγιά/)
})

test("presentation config merges client branding overrides without clobbering other fields", () => {
  const custom = {
    bundle_id: "pb_client_99",
    branding: {
      name: "Custom Brand Boutique",
    },
    theme: {
      primary_color: "#1e293b",
      accent_color: "#10b981",
      font_family: "Geist, sans-serif",
      dark_mode_enabled: true,
    },
  }

  const config = getPublicPresentationConfig(custom)
  assert.equal(config.bundle_id, "pb_client_99")
  assert.equal(config.branding.name, "Custom Brand Boutique")
  assert.equal(config.branding.tagline, DEFAULT_PRESENTATION_CONFIG.branding.tagline)
  assert.equal(config.theme.primary_color, "#1e293b")
  assert.equal(config.theme.dark_mode_enabled, true)
  assert.equal(config.seo.default_title, DEFAULT_PRESENTATION_CONFIG.seo.default_title)
})

test("presentation config preserves custom navigation when provided", () => {
  const custom = {
    navigation: {
      header: [
        { label: "Catalog", href: "/products" },
        { label: "Cart", href: "/cart" },
      ],
      footer: [{ label: "About", href: "/about" }],
    },
  }

  const config = getPublicPresentationConfig(custom)
  assert.equal(config.navigation.header.length, 2)
  assert.equal(config.navigation.header[0].label, "Catalog")
  assert.equal(config.navigation.footer.length, 1)
})
