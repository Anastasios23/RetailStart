export interface PresentationBranding {
  name: string
  tagline?: string
  logo_key?: string
  favicon_key?: string
}

export interface PresentationTheme {
  primary_color: string
  accent_color: string
  font_family: string
  dark_mode_enabled: boolean
}

export interface NavigationLink {
  label: string
  href: string
  order?: number
}

export interface PresentationNavigation {
  header: NavigationLink[]
  footer: NavigationLink[]
  legal?: NavigationLink[]
}

export interface PresentationSEO {
  default_title: string
  title_template: string
  default_description: string
  robots: string
  open_graph?: {
    site_name?: string
    default_image_key?: string
  }
}

export interface PresentationStaticContent {
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

export interface ClientExtensionDescriptor {
  id: string
  version: string
  enabled: boolean
  capability_scope: "payment" | "analytics" | "notification" | "media" | "custom"
  dependencies?: string[]
}

export interface PresentationBundle {
  bundle_id: string
  version: string
  compatible_storefront_range: string
  branding: PresentationBranding
  theme: PresentationTheme
  navigation: PresentationNavigation
  seo: PresentationSEO
  static_content: PresentationStaticContent
  media_references: string[]
  extensions: ClientExtensionDescriptor[]
  created_at: string
  checksum: string
}

export interface PublicPresentationProjection {
  bundle_id: string
  version: string
  branding: PresentationBranding
  theme: PresentationTheme
  navigation: PresentationNavigation
  seo: PresentationSEO
  static_content: PresentationStaticContent
  active_extensions: Array<{
    id: string
    version: string
    capability_scope: string
  }>
}

export interface BundleValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
}
