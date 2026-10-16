import { MedusaError } from "@medusajs/framework/utils"
import {
  createRecoveryManifest,
  validateRecoveryManifest,
  verifyMediaReferenceIntegrity,
} from "../manifest"
import { RecoveryManifest } from "../manifest-types"

describe("Coordinated Recovery Manifest and Media Integrity (ADR-0016, ADR-0082)", () => {
  const validManifestParams: Omit<RecoveryManifest, "manifest_id"> = {
    release_tuple_id: "rt_1234567890abcdef",
    database: {
      recovery_point_id: "pg_rec_20261015_001",
      schema_version: "20261015_001",
      snapshot_timestamp: "2026-10-15T12:00:00.000Z",
      checksum: "sha256:11112222333344445555666677778888",
    },
    media_storage: {
      snapshot_id: "s3_snap_20261015_001",
      bucket: "client-media-store",
      prefix: "uploads/2026/10",
      media_keys: ["products/prod_1/hero.webp", "categories/apparel.jpg"],
    },
    configuration: {
      config_digest: "sha256:aabbccddeeff00112233445566778899",
      environment: "staging",
    },
    created_at: "2026-10-15T12:15:00.000Z",
    created_by: "operator_backup_service",
  }

  describe("createRecoveryManifest", () => {
    it("creates a recovery manifest with generated manifest_id", () => {
      const manifest = createRecoveryManifest(validManifestParams)

      expect(manifest.manifest_id).toBeDefined()
      expect(manifest.manifest_id.startsWith("rm_")).toBe(true)
      expect(manifest.release_tuple_id).toBe("rt_1234567890abcdef")
      expect(manifest.database.schema_version).toBe("20261015_001")
      expect(manifest.media_storage.bucket).toBe("client-media-store")
    })

    it("throws MedusaError if database recovery point is missing or incomplete", () => {
      const invalidParams = {
        ...validManifestParams,
        database: {
          ...validManifestParams.database,
          checksum: "",
        },
      }

      expect(() => createRecoveryManifest(invalidParams)).toThrow(MedusaError)
      expect(() => createRecoveryManifest(invalidParams)).toThrow(/Missing required database recovery point checksum/i)
    })
  })

  describe("validateRecoveryManifest", () => {
    it("validates a complete, coordinated recovery manifest", () => {
      const manifest = createRecoveryManifest(validManifestParams)
      const result = validateRecoveryManifest(manifest)

      expect(result.is_valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("fails validation if snapshot timestamp is malformed", () => {
      const manifest = createRecoveryManifest({
        ...validManifestParams,
        database: {
          ...validManifestParams.database,
          snapshot_timestamp: "invalid-date",
        },
      })
      const result = validateRecoveryManifest(manifest)

      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("database.snapshot_timestamp"))).toBe(true)
    })
  })

  describe("verifyMediaReferenceIntegrity", () => {
    const availableStorageKeys = [
      "products/prod_1/hero.webp",
      "products/prod_1/thumb.webp",
      "categories/apparel.jpg",
    ]

    it("passes when all database-referenced media exist in object storage backup", () => {
      const referencedKeys = [
        "products/prod_1/hero.webp",
        "categories/apparel.jpg",
      ]

      const result = verifyMediaReferenceIntegrity(referencedKeys, availableStorageKeys)
      expect(result.is_valid).toBe(true)
      expect(result.missing_keys).toHaveLength(0)
      expect(result.checked_count).toBe(2)
    })

    it("fails when database references media missing from object storage backup", () => {
      const referencedKeys = [
        "products/prod_1/hero.webp",
        "products/prod_2/nonexistent.png",
      ]

      const result = verifyMediaReferenceIntegrity(referencedKeys, availableStorageKeys)
      expect(result.is_valid).toBe(false)
      expect(result.missing_keys).toEqual(["products/prod_2/nonexistent.png"])
      expect(result.checked_count).toBe(2)
    })
  })
})
