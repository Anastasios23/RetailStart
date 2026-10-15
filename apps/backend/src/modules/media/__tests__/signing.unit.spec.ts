import {
  generateSignedTransferAuthorization,
  verifySignedTransferToken,
} from "../signing"

describe("media signed transfer authorization (ADR-0048, ADR-0121)", () => {
  const secret = "test-media-signing-secret-key-12345"
  const mockParams = {
    mediaId: "med_12345",
    clientId: "admin_user_99",
    operation: "upload" as const,
    key: "staged/admin_user_99/med_12345",
    visibility: "public" as const,
    baseUrl: "https://media.retail-starter.internal",
    ttlSeconds: 900,
    secret,
  }

  describe("generateSignedTransferAuthorization", () => {
    it("generates a signed URL with scoped query parameters and expiration", () => {
      const auth = generateSignedTransferAuthorization(mockParams)

      expect(auth.media_id).toBe("med_12345")
      expect(auth.operation).toBe("upload")
      expect(auth.key).toBe("staged/admin_user_99/med_12345")
      expect(auth.visibility).toBe("public")
      expect(auth.transfer_url).toContain("https://media.retail-starter.internal")
      expect(auth.transfer_url).toContain("token=")
      expect(auth.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it("never includes long-lived credentials in the transfer authorization (ADR-0121)", () => {
      const auth = generateSignedTransferAuthorization(mockParams)

      expect(auth.transfer_url).not.toContain(secret)
      expect(JSON.stringify(auth)).not.toContain(secret)
    })
  })

  describe("verifySignedTransferToken", () => {
    it("successfully verifies valid, unexpired token matching expected operation", () => {
      const auth = generateSignedTransferAuthorization(mockParams)
      const token = new URL(auth.transfer_url).searchParams.get("token")!

      const verified = verifySignedTransferToken({
        token,
        expectedOperation: "upload",
        secret,
      })

      expect(verified.media_id).toBe("med_12345")
      expect(verified.client_id).toBe("admin_user_99")
      expect(verified.operation).toBe("upload")
      expect(verified.key).toBe("staged/admin_user_99/med_12345")
      expect(verified.visibility).toBe("public")
    })

    it("rejects token with mismatched operation scope", () => {
      const auth = generateSignedTransferAuthorization(mockParams) // operation: upload
      const token = new URL(auth.transfer_url).searchParams.get("token")!

      expect(() =>
        verifySignedTransferToken({
          token,
          expectedOperation: "download", // mismatched!
          secret,
        })
      ).toThrow(/operation mismatch/i)
    })

    it("rejects token with mismatched key scope", () => {
      const auth = generateSignedTransferAuthorization(mockParams)
      const token = new URL(auth.transfer_url).searchParams.get("token")!

      expect(() =>
        verifySignedTransferToken({
          token,
          expectedOperation: "upload",
          expectedKey: "staged/other_client/malicious_overwrite",
          secret,
        })
      ).toThrow(/key mismatch/i)
    })

    it("rejects expired token", () => {
      // Generate token that expired 10 seconds ago
      const auth = generateSignedTransferAuthorization({
        ...mockParams,
        ttlSeconds: -10,
      })
      const token = new URL(auth.transfer_url).searchParams.get("token")!

      expect(() =>
        verifySignedTransferToken({
          token,
          expectedOperation: "upload",
          secret,
        })
      ).toThrow(/expired/i)
    })

    it("rejects tampered token signature", () => {
      const auth = generateSignedTransferAuthorization(mockParams)
      const validToken = new URL(auth.transfer_url).searchParams.get("token")!

      // Tamper with the token
      const tamperedToken = validToken.slice(0, -4) + "abcd"

      expect(() =>
        verifySignedTransferToken({
          token: tamperedToken,
          expectedOperation: "upload",
          secret,
        })
      ).toThrow(/invalid.*signature/i)
    })

    it("rejects token signed with a different secret", () => {
      const auth = generateSignedTransferAuthorization(mockParams)
      const token = new URL(auth.transfer_url).searchParams.get("token")!

      expect(() =>
        verifySignedTransferToken({
          token,
          expectedOperation: "upload",
          secret: "different-unauthorized-secret-999",
        })
      ).toThrow(/invalid.*signature/i)
    })
  })
})
