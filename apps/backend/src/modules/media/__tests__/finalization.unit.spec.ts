import {
  executeMediaFinalization,
  generateImmutableMediaKey,
  validateMediaFile,
} from "../finalization"
import { InMemoryMediaStorageAdapter } from "../storage-adapter"
import type { MediaRecord } from "../types"

describe("media finalization & immutable replacement (ADR-0058, ADR-0059, ADR-0121, ADR-0122)", () => {
  let adapter: InMemoryMediaStorageAdapter

  beforeEach(() => {
    adapter = new InMemoryMediaStorageAdapter()
  })

  describe("validateMediaFile", () => {
    it("accepts valid image with allowed MIME type and size", () => {
      const result = validateMediaFile({
        contentType: "image/webp",
        fileSize: 1024 * 50, // 50 KB
      })
      expect(result.isValid).toBe(true)
    })

    it("rejects forbidden file types (e.g. executables or scripts)", () => {
      expect(() =>
        validateMediaFile({
          contentType: "application/x-msdownload",
          fileSize: 1024,
        })
      ).toThrow(/unsupported.*mime/i)

      expect(() =>
        validateMediaFile({
          contentType: "text/javascript",
          fileSize: 1024,
        })
      ).toThrow(/unsupported.*mime/i)
    })

    it("rejects files exceeding maximum allowed size", () => {
      expect(() =>
        validateMediaFile({
          contentType: "image/jpeg",
          fileSize: 25 * 1024 * 1024, // 25 MB > 20 MB limit
          maxSizeBytes: 20 * 1024 * 1024,
        })
      ).toThrow(/exceeds maximum allowed size/i)
    })

    it("rejects empty files (0 bytes)", () => {
      expect(() =>
        validateMediaFile({
          contentType: "image/png",
          fileSize: 0,
        })
      ).toThrow(/must be greater than 0/i)
    })
  })

  describe("generateImmutableMediaKey", () => {
    it("generates deterministic immutable key scoped by visibility and checksum", () => {
      const key = generateImmutableMediaKey({
        visibility: "public",
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        originalFilename: "white t-shirt front.png",
        mediaId: "med_abc123",
      })

      expect(key).toBe(
        "public/e3b0c44298fc1c14_med_abc123_white-t-shirt-front.png"
      )
    })

    it("sanitizes dangerous path traversal characters in filenames", () => {
      const key = generateImmutableMediaKey({
        visibility: "protected",
        checksum: "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
        originalFilename: "../../../etc/passwd.jpg",
        mediaId: "med_sec01",
      })

      expect(key).not.toContain("..")
      expect(key.startsWith("protected/")).toBe(true)
      expect(key).toContain("passwd.jpg")
    })
  })

  describe("executeMediaFinalization", () => {
    const dummyImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    )

    it("promotes staged object to immutable published key and records metadata", async () => {
      const stagedKey = "staged/usr_1/med_test_1"
      await adapter.upload(stagedKey, dummyImageBuffer, "image/png")

      const result = await executeMediaFinalization({
        mediaId: "med_test_1",
        stagedKey,
        originalFilename: "icon.png",
        visibility: "public",
        storageAdapter: adapter,
        publicUrlPrefix: "https://cdn.retail-starter.internal",
      })

      expect(result.media.status).toBe("published")
      expect(result.media.visibility).toBe("public")
      expect(result.media.url).toContain("https://cdn.retail-starter.internal/public/")
      expect(result.media.storage_key).toMatch(/^public\/[a-f0-9]{16}_med_test_1_icon\.png$/)
      expect(result.media.file_size).toBe(dummyImageBuffer.length)
      expect(result.media.checksum).toBeDefined()

      // Staged object promoted (staged key removed, target key exists)
      expect(await adapter.exists(stagedKey)).toBe(false)
      expect(await adapter.exists(result.media.storage_key)).toBe(true)
    })

    it("verifies expected checksum when supplied, failing closed on tampering", async () => {
      const stagedKey = "staged/usr_1/med_tamper"
      await adapter.upload(stagedKey, dummyImageBuffer, "image/png")

      await expect(
        executeMediaFinalization({
          mediaId: "med_tamper",
          stagedKey,
          originalFilename: "tampered.png",
          visibility: "public",
          expectedChecksum: "wrong_checksum_value_9999",
          storageAdapter: adapter,
        })
      ).rejects.toThrow(/checksum mismatch/i)
    })

    it("fails closed when staged object does not exist", async () => {
      await expect(
        executeMediaFinalization({
          mediaId: "med_missing",
          stagedKey: "staged/usr_1/nonexistent",
          originalFilename: "missing.png",
          visibility: "public",
          storageAdapter: adapter,
        })
      ).rejects.toThrow(/staged object not found/i)
    })

    it("replaces existing media immutably without overwriting original file (ADR-0059, ADR-0122)", async () => {
      // 1. Initial published media
      const initialKey = "staged/usr_1/med_v1"
      await adapter.upload(initialKey, dummyImageBuffer, "image/png")
      const v1Result = await executeMediaFinalization({
        mediaId: "med_v1",
        stagedKey: initialKey,
        originalFilename: "hero.png",
        visibility: "public",
        storageAdapter: adapter,
      })

      const existingRecords = new Map<string, MediaRecord>([
        ["med_v1", v1Result.media],
      ])

      // 2. Replacement upload (different image bytes)
      const replacementBuffer = Buffer.from("different-image-content-v2")
      const replacementKey = "staged/usr_1/med_v2"
      await adapter.upload(replacementKey, replacementBuffer, "image/png")

      const v2Result = await executeMediaFinalization({
        mediaId: "med_v2",
        stagedKey: replacementKey,
        originalFilename: "hero-updated.png",
        visibility: "public",
        replacesMediaId: "med_v1",
        existingRecords,
        storageAdapter: adapter,
      })

      // V2 is published with unique key
      expect(v2Result.media.id).toBe("med_v2")
      expect(v2Result.media.status).toBe("published")
      expect(v2Result.media.replaced_id).toBe("med_v1")

      // V1 is superseded, not deleted or overwritten in place!
      expect(v2Result.supersededMedia?.id).toBe("med_v1")
      expect(v2Result.supersededMedia?.status).toBe("superseded")
      expect(v2Result.supersededMedia?.superseded_by).toBe("med_v2")

      // Both files remain intact in storage!
      expect(await adapter.exists(v1Result.media.storage_key)).toBe(true)
      expect(await adapter.exists(v2Result.media.storage_key)).toBe(true)
      expect(v1Result.media.storage_key).not.toBe(v2Result.media.storage_key)
    })
  })
})
