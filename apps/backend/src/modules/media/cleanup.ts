import type { MediaRecord } from "./types"
import type { MediaStorageAdapter } from "./storage-adapter"

export type IdentifyOrphanedStagedKeysInput = {
  stagedKeys: string[]
  getKeyCreatedAt: (key: string) => number
  stagingTtlSeconds?: number
  nowEpochSeconds?: number
}

export function identifyOrphanedStagedKeys({
  stagedKeys,
  getKeyCreatedAt,
  stagingTtlSeconds = 86400, // 24 hours
  nowEpochSeconds = Math.floor(Date.now() / 1000),
}: IdentifyOrphanedStagedKeysInput): string[] {
  const cutoff = nowEpochSeconds - stagingTtlSeconds
  return stagedKeys.filter((key) => {
    const createdAt = getKeyCreatedAt(key)
    return createdAt < cutoff
  })
}

export type MediaCleanupDependencies = {
  storageAdapter: MediaStorageAdapter
  mediaRecords: Map<string, MediaRecord>
  stagingTtlSeconds?: number
  retentionWindowSeconds?: number
  nowEpochSeconds?: number
}

export type MediaCleanupResult = {
  deletedStagedKeys: string[]
  deletedMediaIds: string[]
}

export async function executeMediaCleanup({
  storageAdapter,
  mediaRecords,
  stagingTtlSeconds = 86400, // 24 hours
  retentionWindowSeconds = 86400 * 7, // 7 days
  nowEpochSeconds = Math.floor(Date.now() / 1000),
}: MediaCleanupDependencies): Promise<MediaCleanupResult> {
  const deletedStagedKeys: string[] = []
  const deletedMediaIds: string[] = []

  // 1. Clean up abandoned staged keys
  const stagedKeys = await storageAdapter.listKeys("staged/")
  for (const key of stagedKeys) {
    const obj = await storageAdapter.get(key)
    if (obj && obj.createdAt < nowEpochSeconds - stagingTtlSeconds) {
      await storageAdapter.delete(key)
      deletedStagedKeys.push(key)
    }
  }

  // 2. Clean up superseded media past retention window per ADR-0059 and ADR-0122
  const retentionCutoffMs = (nowEpochSeconds - retentionWindowSeconds) * 1000

  for (const [id, record] of mediaRecords.entries()) {
    if (record.status === "superseded") {
      const updatedAtMs = new Date(record.updated_at).getTime()
      if (updatedAtMs < retentionCutoffMs) {
        await storageAdapter.delete(record.storage_key)
        record.status = "retired"
        record.updated_at = new Date(nowEpochSeconds * 1000).toISOString()
        deletedMediaIds.push(id)
      }
    }
  }

  return {
    deletedStagedKeys,
    deletedMediaIds,
  }
}
