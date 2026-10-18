export interface NavigationLink {
  label: string
  href: string
  order?: number
}

export interface PublicPresentationConfig {
  bundle_id?: string
  version?: string
  branding: {
    name: string
    tagline?: string
    logo_key?: string
    favicon_key?: string
  }
  theme: {
    primary_color: string
    accent_color: string
    font_family: string
    dark_mode_enabled: boolean
  }
  navigation: {
    header: NavigationLink[]
    footer: NavigationLink[]
    legal?: NavigationLink[]
  }
  seo: {
    default_title: string
    title_template: string
    default_description: string
    robots: string
    open_graph?: {
      site_name?: string
      default_image_key?: string
    }
  }
  static_content?: {
    announcement_banner?: {
      text: string
      enabled: boolean
      link?: string
    }
    hero?: {
      heading: string
      subheading: string
      cta_label: string
      cta_link: string
    }
  }
  active_extensions?: Array<{
    id: string
    version: string
    capability_scope: string
  }>
}

export const DEFAULT_PRESENTATION_CONFIG: PublicPresentationConfig = {
  branding: {
    name: "Retail Starter",
    tagline: "A server-rendered product catalog powered by Medusa.",
  },
  theme: {
    primary_color: "#111827",
    accent_color: "#2563eb",
    font_family: "system-ui, -apple-system, sans-serif",
    dark_mode_enabled: false,
  },
  navigation: {
    header: [
      { label: "Home", href: "/", order: 1 },
      { label: "Products", href: "/products", order: 2 },
      { label: "Categories", href: "/categories", order: 3 },
      { label: "Cart", href: "/cart", order: 4 },
    ],
    footer: [
      { label: "Home", href: "/", order: 1 },
      { label: "Products", href: "/products", order: 2 },
      { label: "Categories", href: "/categories", order: 3 },
      { label: "Cart", href: "/cart", order: 4 },
    ],
  },
  seo: {
    default_title: "Retail Starter",
    title_template: "%s | Retail Starter",
    default_description: "A server-rendered product catalog powered by Medusa.",
    robots: "index, follow",
  },
}

/**
 * Returns the effective public presentation configuration.
 * Safely merges custom client bundle projections while preserving baseline fallbacks and single-owner boundaries (ADR-0115, ADR-0142).
 */
export function getPublicPresentationConfig(
  custom?: Partial<PublicPresentationConfig> | null
): PublicPresentationConfig {
  if (!custom) {
    return DEFAULT_PRESENTATION_CONFIG
  }

  return {
    bundle_id: custom.bundle_id,
    version: custom.version,
    branding: {
      name: custom.branding?.name || DEFAULT_PRESENTATION_CONFIG.branding.name,
      tagline: custom.branding?.tagline ?? DEFAULT_PRESENTATION_CONFIG.branding.tagline,
      logo_key: custom.branding?.logo_key,
      favicon_key: custom.branding?.favicon_key,
    },
    theme: {
      primary_color: custom.theme?.primary_color || DEFAULT_PRESENTATION_CONFIG.theme.primary_color,
      accent_color: custom.theme?.accent_color || DEFAULT_PRESENTATION_CONFIG.theme.accent_color,
      font_family: custom.theme?.font_family || DEFAULT_PRESENTATION_CONFIG.theme.font_family,
      dark_mode_enabled: custom.theme?.dark_mode_enabled ?? DEFAULT_PRESENTATION_CONFIG.theme.dark_mode_enabled,
    },
    navigation: {
      header: custom.navigation?.header || DEFAULT_PRESENTATION_CONFIG.navigation.header,
      footer: custom.navigation?.footer || DEFAULT_PRESENTATION_CONFIG.navigation.footer,
      legal: custom.navigation?.legal,
    },
    seo: {
      default_title: custom.seo?.default_title || DEFAULT_PRESENTATION_CONFIG.seo.default_title,
      title_template: custom.seo?.title_template || DEFAULT_PRESENTATION_CONFIG.seo.title_template,
      default_description: custom.seo?.default_description || DEFAULT_PRESENTATION_CONFIG.seo.default_description,
      robots: custom.seo?.robots || DEFAULT_PRESENTATION_CONFIG.seo.robots,
      open_graph: custom.seo?.open_graph,
    },
    static_content: custom.static_content,
    active_extensions: custom.active_extensions || [],
  }
}
