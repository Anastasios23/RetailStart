import { createHash } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"

export type StoredObject = {
  content: Buffer
  mimeType: string
  size: number
  checksum: string
  createdAt: number
}

export interface MediaStorageAdapter {
  upload(
    key: string,
    content: Buffer | Uint8Array,
    mimeType: string
  ): Promise<{ size: number; checksum: string }>
  get(key: string): Promise<StoredObject | null>
  exists(key: string): Promise<boolean>
  promote(stagedKey: string, finalKey: string): Promise<void>
  delete(key: string): Promise<void>
  listKeys(prefix?: string): Promise<string[]>
}

export class InMemoryMediaStorageAdapter implements MediaStorageAdapter {
  private objects = new Map<string, StoredObject>()

  async upload(
    key: string,
    content: Buffer | Uint8Array,
    mimeType: string
  ): Promise<{ size: number; checksum: string }> {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const checksum = createHash("sha256").update(buf).digest("hex")
    this.objects.set(key, {
      content: buf,
      mimeType,
      size: buf.length,
      checksum,
      createdAt: Math.floor(Date.now() / 1000),
    })
    return { size: buf.length, checksum }
  }

  async get(key: string): Promise<StoredObject | null> {
    return this.objects.get(key) ?? null
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key)
  }

  async promote(stagedKey: string, finalKey: string): Promise<void> {
    const obj = this.objects.get(stagedKey)
    if (!obj) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cannot promote staged object: key ${stagedKey} not found`
      )
    }
    this.objects.set(finalKey, obj)
    this.objects.delete(stagedKey)
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }

  async listKeys(prefix?: string): Promise<string[]> {
    const all = Array.from(this.objects.keys())
    return prefix ? all.filter((k) => k.startsWith(prefix)) : all
  }
}
