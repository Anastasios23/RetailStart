import {
  executeMediaCleanup,
  identifyOrphanedStagedKeys,
  type MediaCleanupDependencies,
} from "../cleanup"
import { InMemoryMediaStorageAdapter } from "../storage-adapter"
import type { MediaRecord } from "../types"

describe("media cleanup & retirement coordination (ADR-0059, ADR-0122)", () => {
  let adapter: InMemoryMediaStorageAdapter
  const dummyBuffer = Buffer.from("image-content-bytes")

  beforeEach(() => {
    adapter = new InMemoryMediaStorageAdapter()
  })

  describe("identifyOrphanedStagedKeys", () => {
    it("identifies staged keys older than TTL threshold", () => {
      const now = Math.floor(Date.now() / 1000)
      const stagedKeys = [
        "staged/client_1/med_recent",
        "staged/client_1/med_old_abandoned",
      ]
      const keyTimestamps = new Map<string, number>([
        ["staged/client_1/med_recent", now - 300], // 5 mins ago (fresh)
        ["staged/client_1/med_old_abandoned", now - 86400 * 2], // 2 days ago (expired)
      ])

      const orphaned = identifyOrphanedStagedKeys({
        stagedKeys,
        getKeyCreatedAt: (k) => keyTimestamps.get(k) ?? now,
        stagingTtlSeconds: 86400, // 24 hours
        nowEpochSeconds: now,
      })

      expect(orphaned).toEqual(["staged/client_1/med_old_abandoned"])
    })
  })

  describe("executeMediaCleanup", () => {
    it("deletes abandoned staged objects that were never finalized", async () => {
      const now = Math.floor(Date.now() / 1000)
      const freshKey = "staged/client_1/fresh"
      const abandonedKey = "staged/client_1/abandoned"

      await adapter.upload(freshKey, dummyBuffer, "image/png")
      await adapter.upload(abandonedKey, dummyBuffer, "image/png")

      // Artificially age the abandoned object
      const abandonedObj = await adapter.get(abandonedKey)
      if (abandonedObj) {
        abandonedObj.createdAt = now - 86400 * 3 // 3 days ago
      }

      const activeRecords = new Map<string, MediaRecord>()

      const result = await executeMediaCleanup({
        storageAdapter: adapter,
        mediaRecords: activeRecords,
        stagingTtlSeconds: 86400,
        retentionWindowSeconds: 86400 * 7,
        nowEpochSeconds: now,
      })

      expect(result.deletedStagedKeys).toContain(abandonedKey)
      expect(result.deletedStagedKeys).not.toContain(freshKey)

      expect(await adapter.exists(abandonedKey)).toBe(false)
      expect(await adapter.exists(freshKey)).toBe(true)
    })

    it("never deletes active/published media (ADR-0122)", async () => {
      const publishedKey = "public/published_hero.png"
      await adapter.upload(publishedKey, dummyBuffer, "image/png")

      const activeRecords = new Map<string, MediaRecord>([
        [
          "med_published_1",
          {
            id: "med_published_1",
            original_filename: "hero.png",
            mime_type: "image/png",
            file_size: dummyBuffer.length,
            visibility: "public",
            status: "published",
            url: "https://cdn.retail-starter.internal/public/published_hero.png",
            storage_key: publishedKey,
            checksum: "chk123",
            created_at: new Date(Date.now() - 86400 * 30 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 86400 * 30 * 1000).toISOString(),
          },
        ],
      ])

      const result = await executeMediaCleanup({
        storageAdapter: adapter,
        mediaRecords: activeRecords,
        stagingTtlSeconds: 86400,
        retentionWindowSeconds: 86400 * 7,
      })

      expect(result.deletedMediaIds).not.toContain("med_published_1")
      expect(await adapter.exists(publishedKey)).toBe(true)
    })

    it("safely retires and removes superseded media only after retention window expires", async () => {
      const now = Math.floor(Date.now() / 1000)
      const supersededRecentKey = "public/superseded_recent.png"
      const supersededOldKey = "public/superseded_old.png"

      await adapter.upload(supersededRecentKey, dummyBuffer, "image/png")
      await adapter.upload(supersededOldKey, dummyBuffer, "image/png")

      const records = new Map<string, MediaRecord>([
        [
          "med_recent_super",
          {
            id: "med_recent_super",
            original_filename: "recent.png",
            mime_type: "image/png",
            file_size: dummyBuffer.length,
            visibility: "public",
            status: "superseded",
            superseded_by: "med_active_replacement",
            url: "https://cdn.retail-starter.internal/public/superseded_recent.png",
            storage_key: supersededRecentKey,
            checksum: "chk_recent",
            created_at: new Date(now * 1000 - 86400 * 2 * 1000).toISOString(),
            updated_at: new Date(now * 1000 - 86400 * 2 * 1000).toISOString(), // 2 days ago (< 7 day retention)
          },
        ],
        [
          "med_old_super",
          {
            id: "med_old_super",
            original_filename: "old.png",
            mime_type: "image/png",
            file_size: dummyBuffer.length,
            visibility: "public",
            status: "superseded",
            superseded_by: "med_active_replacement",
            url: "https://cdn.retail-starter.internal/public/superseded_old.png",
            storage_key: supersededOldKey,
            checksum: "chk_old",
            created_at: new Date(now * 1000 - 86400 * 10 * 1000).toISOString(),
            updated_at: new Date(now * 1000 - 86400 * 10 * 1000).toISOString(), // 10 days ago (> 7 day retention)
          },
        ],
      ])

      const result = await executeMediaCleanup({
        storageAdapter: adapter,
        mediaRecords: records,
        stagingTtlSeconds: 86400,
        retentionWindowSeconds: 86400 * 7,
        nowEpochSeconds: now,
      })

      // Recent superseded media is retained
      expect(result.deletedMediaIds).not.toContain("med_recent_super")
      expect(await adapter.exists(supersededRecentKey)).toBe(true)

      // Old superseded media past retention window is retired and pruned from storage
      expect(result.deletedMediaIds).toContain("med_old_super")
      expect(await adapter.exists(supersededOldKey)).toBe(false)
      expect(records.get("med_old_super")?.status).toBe("retired")
    })
  })
})
