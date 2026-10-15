import { MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import {
  DeploymentValidationResult,
  EnvironmentType,
  ReleaseTuple,
} from "./types"

const FORBIDDEN_COMMERCE_DATA_KEYS = [
  "products",
  "variants",
  "prices",
  "inventory",
  "categories",
  "orders",
  "refunds",
  "fulfillments",
  "shipping_options",
  "tax_rates",
]

/**
 * Checks if a version satisfies a simple semver pattern (e.g. "^1.0.0", "~1.0.0", "1.0.0", "*")
 */
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
 * Creates a validated ReleaseTuple, strictly keeping live commerce data outside (ADR-0097).
 */
export function createReleaseTuple(
  params: Omit<ReleaseTuple, "tuple_id"> & Record<string, any>
): ReleaseTuple {
  for (const forbiddenKey of FORBIDDEN_COMMERCE_DATA_KEYS) {
    if (forbiddenKey in params && params[forbiddenKey] !== undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Operational commerce data (${forbiddenKey}) must not be embedded in release tuple (ADR-0097)`
      )
    }
  }

  const tuple_id = `rt_${randomUUID().replace(/-/g, "").substring(0, 16)}`

  return {
    tuple_id,
    backend_version: params.backend_version,
    storefront_version: params.storefront_version,
    schema_version: params.schema_version,
    presentation_bundle_version: params.presentation_bundle_version,
    extensions: params.extensions || {},
    compatibility: params.compatibility,
    metadata: params.metadata,
  }
}

/**
 * Validates whether a release tuple is internally compatible and safe for the target environment.
 */
export function validateReleaseTupleCompatibility(
  tuple: ReleaseTuple,
  targetEnvironment: EnvironmentType
): DeploymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!tuple.backend_version) {
    errors.push("Missing backend_version in release tuple")
  }

  if (!tuple.storefront_version) {
    errors.push("Missing storefront_version in release tuple")
  }

  if (!tuple.schema_version) {
    errors.push("Missing schema_version in release tuple")
  }

  if (!tuple.presentation_bundle_version) {
    errors.push("Missing presentation_bundle_version in release tuple")
  }

  // Validate Storefront compatibility with Backend
  const supportedStorefrontRange = tuple.compatibility?.supported_storefront_range
  if (
    supportedStorefrontRange &&
    !isVersionCompatible(tuple.storefront_version, supportedStorefrontRange)
  ) {
    errors.push(
      `Storefront version '${tuple.storefront_version}' is incompatible with supported range '${supportedStorefrontRange}'`
    )
  }

  // Validate Database Schema compatibility with Backend
  const supportedSchemaVersions = tuple.compatibility?.supported_schema_versions || []
  if (!supportedSchemaVersions.includes(tuple.schema_version)) {
    errors.push(
      `Schema version '${tuple.schema_version}' is incompatible with supported backend schema versions: [${supportedSchemaVersions.join(", ")}]`
    )
  }

  // Validate Presentation bundle compatibility
  const supportedPresentationVersions =
    tuple.compatibility?.supported_presentation_versions || []
  if (!supportedPresentationVersions.includes(tuple.presentation_bundle_version)) {
    errors.push(
      `Presentation bundle version '${tuple.presentation_bundle_version}' is incompatible with supported versions: [${supportedPresentationVersions.join(", ")}]`
    )
  }

  // Validate build metadata
  if (!tuple.metadata?.build_timestamp) {
    errors.push("Missing metadata.build_timestamp in release tuple")
  } else if (isNaN(Date.parse(tuple.metadata.build_timestamp))) {
    errors.push("Invalid metadata.build_timestamp format (must be ISO-8601)")
  }

  // In production, immutable artifact identity (git_sha, docker_image_digest) is mandatory (ADR-0074)
  if (targetEnvironment === "production") {
    if (!tuple.metadata?.git_sha) {
      errors.push("metadata.git_sha is required for production promotion")
    }
    if (!tuple.metadata?.docker_image_digest) {
      errors.push("metadata.docker_image_digest is required for production promotion")
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Asserts release tuple compatibility before startup; throws MedusaError if invalid.
 */
export function assertReleaseTupleStartup(
  tuple: ReleaseTuple,
  env: EnvironmentType
): void {
  const result = validateReleaseTupleCompatibility(tuple, env)
  if (!result.is_valid) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Application cannot start in an incompatible release-tuple state: ${result.errors.join("; ")}`
    )
  }
}
