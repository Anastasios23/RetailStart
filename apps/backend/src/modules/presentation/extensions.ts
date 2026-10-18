import {
  BundleValidationResult,
  ClientExtensionDescriptor,
} from "./types"

function isVersionCompatible(version: string, range: string): boolean {
  if (range === "*" || range === version) {
    return true
  }

  const parse = (v: string) => {
    const cleaned = v.replace(/^[v^~]/, "")
    const parts = cleaned.split(".").map(Number)
    return {
      major: isNaN(parts[0]) ? 0 : parts[0],
      minor: isNaN(parts[1]) ? 0 : parts[1],
      patch: isNaN(parts[2]) ? 0 : parts[2],
    }
  }

  const target = parse(version)
  const base = parse(range)

  if (range.startsWith("^")) {
    if (base.major !== target.major) return false
    if (target.minor < base.minor) return false
    if (target.minor === base.minor && target.patch < base.patch) return false
    return true
  }

  if (range.startsWith("~")) {
    if (base.major !== target.major || base.minor !== target.minor) return false
    return target.patch >= base.patch
  }

  return version === range
}

/**
 * Validates a client extension set against an approved allow-list and checks internal dependency coherence (ADR-0089, ADR-0095).
 */
export function validateExtensionSet(
  extensions: ClientExtensionDescriptor[],
  allowList: Record<string, string>
): BundleValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const enabledExtensionIds = new Set(
    extensions.filter((ext) => ext.enabled).map((ext) => ext.id)
  )

  for (const ext of extensions) {
    // Check allow-list presence (ADR-0089)
    if (!(ext.id in allowList)) {
      errors.push(`Extension '${ext.id}' is not in the approved allow-list (ADR-0089)`)
      continue
    }

    // Check version compatibility with allow-list
    const allowedRange = allowList[ext.id]
    if (!isVersionCompatible(ext.version, allowedRange)) {
      errors.push(
        `Extension '${ext.id}' version '${ext.version}' is incompatible with supported range '${allowedRange}'`
      )
    }

    // Check dependencies if enabled (ADR-0095)
    if (ext.enabled && ext.dependencies) {
      for (const dep of ext.dependencies) {
        if (!enabledExtensionIds.has(dep)) {
          errors.push(
            `Extension '${ext.id}' requires enabled dependency '${dep}' (ADR-0095)`
          )
        }
      }
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}
