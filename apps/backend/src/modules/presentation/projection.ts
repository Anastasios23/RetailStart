import {
  PresentationBundle,
  PublicPresentationProjection,
} from "./types"

/**
 * Projects a safe public presentation configuration for Next.js and browser code (ADR-0024, ADR-0114, ADR-0115).
 * Strips internal checksums, storage paths, operational controls, and disabled extensions.
 */
export function projectSafePublicPresentation(
  bundle: PresentationBundle
): PublicPresentationProjection {
  const active_extensions = (bundle.extensions || [])
    .filter((ext) => ext.enabled)
    .map((ext) => ({
      id: ext.id,
      version: ext.version,
      capability_scope: ext.capability_scope,
    }))

  return {
    bundle_id: bundle.bundle_id,
    version: bundle.version,
    branding: {
      name: bundle.branding.name,
      tagline: bundle.branding.tagline,
      logo_key: bundle.branding.logo_key,
      favicon_key: bundle.branding.favicon_key,
    },
    theme: {
      primary_color: bundle.theme.primary_color,
      accent_color: bundle.theme.accent_color,
      font_family: bundle.theme.font_family,
      dark_mode_enabled: bundle.theme.dark_mode_enabled,
    },
    navigation: {
      header: bundle.navigation.header || [],
      footer: bundle.navigation.footer || [],
      legal: bundle.navigation.legal || [],
    },
    seo: {
      default_title: bundle.seo.default_title,
      title_template: bundle.seo.title_template,
      default_description: bundle.seo.default_description,
      robots: bundle.seo.robots,
      open_graph: bundle.seo.open_graph,
    },
    static_content: bundle.static_content || {},
    active_extensions,
  }
}
