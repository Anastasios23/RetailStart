import { projectSafePublicPresentation } from "../projection"
import { PresentationBundle } from "../types"

describe("Safe Public Presentation Projection (ADR-0024, ADR-0114, ADR-0115)", () => {
  const sampleBundle: PresentationBundle = {
    bundle_id: "pb_proj_001",
    version: "1.0.0",
    compatible_storefront_range: "^1.0.0",
    branding: {
      name: "Modern Living",
      tagline: "Everyday essentials",
      logo_key: "logo.png",
      favicon_key: "favicon.ico",
    },
    theme: {
      primary_color: "#0f172a",
      accent_color: "#3b82f6",
      font_family: "Inter, sans-serif",
      dark_mode_enabled: false,
    },
    navigation: {
      header: [{ label: "Shop", href: "/products" }],
      footer: [{ label: "Help", href: "/help" }],
    },
    seo: {
      default_title: "Modern Living",
      title_template: "%s | Modern Living",
      default_description: "Curated home goods",
      robots: "index, follow",
    },
    static_content: {
      announcement_banner: {
        text: "Grand Opening Sale",
        enabled: true,
      },
    },
    media_references: ["logo.png", "favicon.ico"],
    extensions: [
      {
        id: "stripe-payments",
        version: "1.0.0",
        enabled: true,
        capability_scope: "payment",
      },
      {
        id: "internal-telemetry",
        version: "0.1.0",
        enabled: false,
        capability_scope: "analytics",
      },
    ],
    created_at: "2026-10-16T10:00:00.000Z",
    checksum: "sha256:secretchecksum123",
  }

  it("projects safe public presentation payload without leaking internal checksum or disabled extensions", () => {
    const projection = projectSafePublicPresentation(sampleBundle)

    expect(projection.bundle_id).toBe("pb_proj_001")
    expect(projection.version).toBe("1.0.0")
    expect(projection.branding.name).toBe("Modern Living")
    expect(projection.theme.primary_color).toBe("#0f172a")

    // Only active extensions are projected
    expect(projection.active_extensions).toHaveLength(1)
    expect(projection.active_extensions[0].id).toBe("stripe-payments")

    // Internal fields are omitted from public projection
    expect((projection as any).checksum).toBeUndefined()
    expect((projection as any).media_references).toBeUndefined()
  })
})
