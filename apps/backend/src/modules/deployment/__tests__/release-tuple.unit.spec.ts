import { MedusaError } from "@medusajs/framework/utils"
import {
  createReleaseTuple,
  validateReleaseTupleCompatibility,
  assertReleaseTupleStartup,
} from "../release-tuple"
import { ReleaseTuple } from "../types"

describe("Release Tuple Lifecycle and Validation (ADR-0086, ADR-0097)", () => {
  const validTupleParams: Omit<ReleaseTuple, "tuple_id"> = {
    backend_version: "1.0.0",
    storefront_version: "1.0.0",
    schema_version: "20261015_001",
    presentation_bundle_version: "bundle-v1.0",
    extensions: {
      "stripe-payment": "1.0.0",
    },
    compatibility: {
      supported_storefront_range: "^1.0.0",
      supported_schema_versions: ["20261015_001", "20261014_002"],
      supported_presentation_versions: ["bundle-v1.0", "bundle-v0.9"],
    },
    metadata: {
      git_sha: "3ab7d41a",
      build_timestamp: "2026-10-15T12:00:00.000Z",
      docker_image_digest: "sha256:abcdef1234567890",
    },
  }

  it("creates a release tuple with generated tuple_id and valid structure", () => {
    const tuple = createReleaseTuple(validTupleParams)

    expect(tuple.tuple_id).toBeDefined()
    expect(tuple.tuple_id.startsWith("rt_")).toBe(true)
    expect(tuple.backend_version).toBe("1.0.0")
    expect(tuple.storefront_version).toBe("1.0.0")
    expect(tuple.schema_version).toBe("20261015_001")
  })

  it("rejects creation if live commerce data is illegally embedded (ADR-0097)", () => {
    const illegalParams = {
      ...validTupleParams,
      products: [{ id: "prod_1", title: "Illegal Product Data" }],
    } as any

    expect(() => createReleaseTuple(illegalParams)).toThrow(MedusaError)
    expect(() => createReleaseTuple(illegalParams)).toThrow(
      /Operational commerce data.*must not be embedded in release tuple/i
    )
  })

  it("validates compatible release tuple successfully in staging and production", () => {
    const tuple = createReleaseTuple(validTupleParams)
    const result = validateReleaseTupleCompatibility(tuple, "production")

    expect(result.is_valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails validation if schema version is incompatible with backend", () => {
    const tuple = createReleaseTuple({
      ...validTupleParams,
      schema_version: "19990101_legacy",
    })

    const result = validateReleaseTupleCompatibility(tuple, "staging")
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Schema version '19990101_legacy' is incompatible"))).toBe(true)
  })

  it("fails validation if presentation bundle version is incompatible", () => {
    const tuple = createReleaseTuple({
      ...validTupleParams,
      presentation_bundle_version: "bundle-v99.0",
    })

    const result = validateReleaseTupleCompatibility(tuple, "staging")
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Presentation bundle version 'bundle-v99.0' is incompatible"))).toBe(true)
  })

  it("fails validation if storefront version is outside supported range", () => {
    const tuple = createReleaseTuple({
      ...validTupleParams,
      storefront_version: "2.0.0", // incompatible with ^1.0.0
    })

    const result = validateReleaseTupleCompatibility(tuple, "staging")
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Storefront version '2.0.0' is incompatible"))).toBe(true)
  })

  it("fails validation for production if immutable artifact digest or git SHA is missing", () => {
    const tuple = createReleaseTuple({
      ...validTupleParams,
      metadata: {
        build_timestamp: "2026-10-15T12:00:00.000Z",
        // missing git_sha and docker_image_digest
      },
    })

    const result = validateReleaseTupleCompatibility(tuple, "production")
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("git_sha is required for production"))).toBe(true)
    expect(result.errors.some((e) => e.includes("docker_image_digest is required for production"))).toBe(true)

    // In development, non-digest builds are permissible
    const devResult = validateReleaseTupleCompatibility(tuple, "development")
    expect(devResult.is_valid).toBe(true)
  })

  it("assertReleaseTupleStartup throws MedusaError on incompatible startup attempt", () => {
    const incompatibleTuple = createReleaseTuple({
      ...validTupleParams,
      schema_version: "unknown_schema",
    })

    expect(() => assertReleaseTupleStartup(incompatibleTuple, "production")).toThrow(MedusaError)
    expect(() => assertReleaseTupleStartup(incompatibleTuple, "production")).toThrow(
      /Application cannot start in an incompatible release-tuple state/i
    )
  })

  it("assertReleaseTupleStartup succeeds silently on compatible release tuple", () => {
    const compatibleTuple = createReleaseTuple(validTupleParams)
    expect(() => assertReleaseTupleStartup(compatibleTuple, "staging")).not.toThrow()
  })
})
