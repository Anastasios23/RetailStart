export function createKeyedPromiseCache<T>(load: (key: string) => T): (key: string) => T {
  const promises = new Map<string, T>()

  return (key: string) => {
    const existing = promises.get(key)

    if (existing !== undefined) {
      return existing
    }

    const promise = load(key)
    promises.set(key, promise)
    return promise
  }
}
