import {
  BundleValidationResult,
  PresentationBundle,
} from "./types"

const FORBIDDEN_COMMERCE_KEYS = [
  "products",
  "variants",
  "prices",
  "inventory",
  "orders",
  "cart",
  "shipping",
  "tax_rates",
]

const FORBIDDEN_SECRET_KEYS = [
  "secret",
  "api_key",
  "api_secret",
  "token",
  "password",
  "private_key",
  "jwt",
]

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Validates a client presentation bundle against schema, commerce isolation, and secret leakage rules (ADR-0050, ADR-0115, ADR-0142).
 */
export function validatePresentationBundle(
  bundle: PresentationBundle & Record<string, any>
): BundleValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Recursive checker for forbidden keys
  function checkForbiddenKeys(obj: any, path: string = "") {
    if (!obj || typeof obj !== "object") return

    for (const key of Object.keys(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      const lowerKey = key.toLowerCase()

      // Check commerce keys
      if (FORBIDDEN_COMMERCE_KEYS.includes(lowerKey)) {
        errors.push(
          `Operational commerce data must not be embedded in presentation bundle at '${currentPath}' (ADR-0050, ADR-0142)`
        )
      }

      // Check secret keys
      if (FORBIDDEN_SECRET_KEYS.some((sec) => lowerKey.includes(sec))) {
        errors.push(
          `Secret or credential detected in presentation bundle at '${currentPath}' (ADR-0009, ADR-0115)`
        )
      }

      // Check string values for sensitive tokens
      if (typeof obj[key] === "string") {
        if (/sk_(live|test)_[a-zA-Z0-9]+/.test(obj[key])) {
          errors.push(
            `Secret or credential detected in presentation bundle value at '${currentPath}'`
          )
        }
      }

      if (typeof obj[key] === "object") {
        checkForbiddenKeys(obj[key], currentPath)
      }
    }
  }

  checkForbiddenKeys(bundle)

  if (!bundle.bundle_id) {
    errors.push("Missing bundle_id")
  }

  if (!bundle.version) {
    errors.push("Missing version")
  }

  if (!bundle.branding?.name) {
    errors.push("Missing branding.name")
  }

  // Validate theme colors
  if (bundle.theme) {
    if (!bundle.theme.primary_color || !HEX_COLOR_REGEX.test(bundle.theme.primary_color)) {
      errors.push("theme.primary_color must be a valid hex color code (e.g. #111827)")
    }
    if (!bundle.theme.accent_color || !HEX_COLOR_REGEX.test(bundle.theme.accent_color)) {
      errors.push("theme.accent_color must be a valid hex color code (e.g. #2563eb)")
    }
  }

  // Validate SEO
  if (bundle.seo) {
    if (!bundle.seo.default_title) errors.push("Missing seo.default_title")
    if (!bundle.seo.title_template) errors.push("Missing seo.title_template")
    if (!bundle.seo.default_description) errors.push("Missing seo.default_description")
  }

  // Warn if referenced media keys are not declared in media_references
  const mediaRefs = new Set(bundle.media_references || [])
  const checkMediaKey = (key?: string, context?: string) => {
    if (key && !mediaRefs.has(key)) {
      warnings.push(`Media key '${key}' referenced in ${context} is not declared in media_references`)
    }
  }

  checkMediaKey(bundle.branding?.logo_key, "branding.logo_key")
  checkMediaKey(bundle.branding?.favicon_key, "branding.favicon_key")
  checkMediaKey(bundle.seo?.open_graph?.default_image_key, "seo.open_graph.default_image_key")

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}
