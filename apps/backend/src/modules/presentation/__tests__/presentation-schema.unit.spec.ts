import { MedusaError } from "@medusajs/framework/utils"
import { validatePresentationBundle } from "../schema"
import { PresentationBundle } from "../types"

describe("Presentation Bundle Schema Validation (ADR-0017, ADR-0050, ADR-0115, ADR-0142)", () => {
  const validBundle: PresentationBundle = {
    bundle_id: "pb_client_001",
    version: "1.0.0",
    compatible_storefront_range: "^1.0.0",
    branding: {
      name: "Acme Retail",
      tagline: "Quality goods for modern life",
      logo_key: "branding/acme-logo.svg",
      favicon_key: "branding/favicon.ico",
    },
    theme: {
      primary_color: "#111827",
      accent_color: "#2563eb",
      font_family: "Inter, sans-serif",
      dark_mode_enabled: true,
    },
    navigation: {
      header: [
        { label: "Home", href: "/", order: 1 },
        { label: "Products", href: "/products", order: 2 },
        { label: "Categories", href: "/categories", order: 3 },
      ],
      footer: [
        { label: "About Us", href: "/about", order: 1 },
        { label: "Contact", href: "/contact", order: 2 },
      ],
      legal: [
        { label: "Privacy Policy", href: "/privacy", order: 1 },
        { label: "Terms of Service", href: "/terms", order: 2 },
      ],
    },
    seo: {
      default_title: "Acme Retail Store",
      title_template: "%s | Acme Retail",
      default_description: "Discover premium apparel and home goods at Acme Retail.",
      robots: "index, follow",
      open_graph: {
        site_name: "Acme Retail",
        default_image_key: "branding/og-cover.png",
      },
    },
    static_content: {
      announcement_banner: {
        text: "Free shipping on all orders over $50",
        enabled: true,
        link: "/products",
      },
      hero: {
        heading: "Autumn Collection",
        subheading: "Timeless designs crafted with care",
        cta_label: "Shop Now",
        cta_link: "/products",
      },
    },
    media_references: [
      "branding/acme-logo.svg",
      "branding/favicon.ico",
      "branding/og-cover.png",
    ],
    extensions: [
      {
        id: "stripe-payment",
        version: "1.0.0",
        enabled: true,
        capability_scope: "payment",
      },
    ],
    created_at: "2026-10-16T10:00:00.000Z",
    checksum: "sha256:abc123456789",
  }

  it("validates a compliant client presentation bundle", () => {
    const result = validatePresentationBundle(validBundle)
    expect(result.is_valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects bundle if live commerce data is embedded (ADR-0050, ADR-0142)", () => {
    const illegalBundle = {
      ...validBundle,
      products: [{ id: "prod_1", title: "Illegal Product" }],
    } as any

    const result = validatePresentationBundle(illegalBundle)
    expect(result.is_valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("Operational commerce data must not be embedded"))
    ).toBe(true)
  })

  it("rejects bundle if secret credentials are leakily included (ADR-0009, ADR-0115)", () => {
    const leakingBundle = {
      ...validBundle,
      branding: {
        ...validBundle.branding,
        api_secret_key: "sk_live_12345",
      },
    } as any

    const result = validatePresentationBundle(leakingBundle)
    expect(result.is_valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("Secret or credential detected in presentation bundle"))
    ).toBe(true)
  })

  it("validates theme color codes", () => {
    const invalidColorBundle: PresentationBundle = {
      ...validBundle,
      theme: {
        ...validBundle.theme,
        primary_color: "invalid-color-code",
      },
    }

    const result = validatePresentationBundle(invalidColorBundle)
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("primary_color must be a valid hex color code"))).toBe(true)
  })

  it("warns if media referenced in branding or SEO is missing from media_references list", () => {
    const missingRefBundle: PresentationBundle = {
      ...validBundle,
      branding: {
        ...validBundle.branding,
        logo_key: "branding/unregistered-logo.svg",
      },
    }

    const result = validatePresentationBundle(missingRefBundle)
    expect(result.warnings.some((w) => w.includes("unregistered-logo.svg"))).toBe(true)
  })
})
