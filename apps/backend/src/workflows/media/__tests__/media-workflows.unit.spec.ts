import {
  executeAuthorizeMediaUpload,
  type AuthorizeMediaUploadInput,
} from "../authorize-media-upload"
import {
  executeFinalizeMediaUploadWorkflow,
  type FinalizeMediaUploadWorkflowInput,
} from "../finalize-media-upload"
import { InMemoryMediaStorageAdapter } from "../../../modules/media"

describe("media workflows (ADR-0037, ADR-0048, ADR-0058, ADR-0059, ADR-0121, ADR-0122)", () => {
  const secret = "test-media-workflow-secret-98765"
  let storageAdapter: InMemoryMediaStorageAdapter

  beforeEach(() => {
    storageAdapter = new InMemoryMediaStorageAdapter()
  })

  describe("executeAuthorizeMediaUpload", () => {
    it("authorizes upload with scoped staged key and short-lived signed URL", () => {
      const input: AuthorizeMediaUploadInput = {
        clientId: "admin_usr_42",
        originalFilename: "summer-collection.jpg",
        visibility: "public",
        contentType: "image/jpeg",
        baseUrl: "https://media.retail-starter.internal/upload",
        secret,
      }

      const result = executeAuthorizeMediaUpload(input)

      expect(result.mediaId).toMatch(/^med_[a-z0-9]+$/)
      expect(result.stagedKey).toContain("staged/admin_usr_42/")
      expect(result.signedAuth.transfer_url).toContain("token=")
      expect(result.signedAuth.operation).toBe("upload")
      expect(result.signedAuth.visibility).toBe("public")
      expect(result.signedAuth.expires_at).toBeGreaterThan(
        Math.floor(Date.now() / 1000)
      )
    })

    it("rejects unauthorized file MIME types at authorization time", () => {
      const input: AuthorizeMediaUploadInput = {
        clientId: "admin_usr_42",
        originalFilename: "malicious.sh",
        visibility: "public",
        contentType: "application/x-sh",
        baseUrl: "https://media.retail-starter.internal/upload",
        secret,
      }

      expect(() => executeAuthorizeMediaUpload(input)).toThrow(
        /unsupported media mime type/i
      )
    })
  })

  describe("executeFinalizeMediaUploadWorkflow", () => {
    const dummyImageBuffer = Buffer.from("valid-png-image-binary-data")

    it("verifies authorization token, promotes staged object, and publishes media record", async () => {
      // 1. Authorize
      const auth = executeAuthorizeMediaUpload({
        clientId: "admin_usr_1",
        originalFilename: "banner.png",
        visibility: "public",
        contentType: "image/png",
        baseUrl: "https://media.retail-starter.internal/upload",
        secret,
      })

      const token = new URL(auth.signedAuth.transfer_url).searchParams.get(
        "token"
      )!

      // 2. Direct upload simulation (client PUTs binary to staged key)
      await storageAdapter.upload(auth.stagedKey, dummyImageBuffer, "image/png")

      // 3. Finalize
      const finalizeInput: FinalizeMediaUploadWorkflowInput = {
        mediaId: auth.mediaId,
        stagedKey: auth.stagedKey,
        originalFilename: "banner.png",
        visibility: "public",
        token,
        secret,
        storageAdapter,
      }

      const result = await executeFinalizeMediaUploadWorkflow(finalizeInput)

      expect(result.media.id).toBe(auth.mediaId)
      expect(result.media.status).toBe("published")
      expect(result.media.visibility).toBe("public")
      expect(result.media.file_size).toBe(dummyImageBuffer.length)

      // Staged object promoted
      expect(await storageAdapter.exists(auth.stagedKey)).toBe(false)
      expect(await storageAdapter.exists(result.media.storage_key)).toBe(true)
    })

    it("fails closed when authorization token is invalid or tampered", async () => {
      const auth = executeAuthorizeMediaUpload({
        clientId: "admin_usr_1",
        originalFilename: "banner.png",
        visibility: "public",
        contentType: "image/png",
        baseUrl: "https://media.retail-starter.internal/upload",
        secret,
      })

      await storageAdapter.upload(auth.stagedKey, dummyImageBuffer, "image/png")

      await expect(
        executeFinalizeMediaUploadWorkflow({
          mediaId: auth.mediaId,
          stagedKey: auth.stagedKey,
          originalFilename: "banner.png",
          visibility: "public",
          token: "invalid.token.signature",
          secret,
          storageAdapter,
        })
      ).rejects.toThrow(/invalid.*token/i)
    })

    it("fails closed when token key does not match the finalized staged key", async () => {
      const auth = executeAuthorizeMediaUpload({
        clientId: "admin_usr_1",
        originalFilename: "banner.png",
        visibility: "public",
        contentType: "image/png",
        baseUrl: "https://media.retail-starter.internal/upload",
        secret,
      })

      const token = new URL(auth.signedAuth.transfer_url).searchParams.get(
        "token"
      )!

      await storageAdapter.upload(auth.stagedKey, dummyImageBuffer, "image/png")

      await expect(
        executeFinalizeMediaUploadWorkflow({
          mediaId: auth.mediaId,
          stagedKey: "staged/other_usr/different_key",
          originalFilename: "banner.png",
          visibility: "public",
          token,
          secret,
          storageAdapter,
        })
      ).rejects.toThrow(/key mismatch/i)
    })
  })
})
