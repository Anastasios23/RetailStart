import {
  detectDependencyCycles,
  resolveExecutionWaves,
} from "../ordering"
import { ImportUnit } from "../types"

describe("Bulk Import Dependency Ordering & Cycle Detection", () => {
  const makeUnit = (
    key: string,
    dependencies: string[] = []
  ): ImportUnit => ({
    unit_id: `unit_${key}`,
    unit_type: key.startsWith("cat")
      ? "category"
      : key.startsWith("prod")
      ? "product"
      : key.startsWith("var")
      ? "variant"
      : "price",
    key,
    dependencies,
    payload: {},
    status: "pending",
  })

  it("organizes independent units into Wave 0", () => {
    const units: ImportUnit[] = [
      makeUnit("cat:apparel", []),
      makeUnit("cat:footwear", []),
      makeUnit("prod:gift-card", []),
    ]

    const waves = resolveExecutionWaves(units)
    expect(waves.length).toBe(1)
    expect(waves[0].map((u) => u.key).sort()).toEqual([
      "cat:apparel",
      "cat:footwear",
      "prod:gift-card",
    ])
  })

  it("orders dependent units into sequential waves", () => {
    const units: ImportUnit[] = [
      makeUnit("price:shirt:eur", ["var:shirt-s"]),
      makeUnit("var:shirt-s", ["prod:shirt"]),
      makeUnit("cat:sub-shirts", ["cat:apparel"]),
      makeUnit("cat:apparel", []),
      makeUnit("prod:shirt", ["cat:sub-shirts"]),
    ]

    const waves = resolveExecutionWaves(units)
    expect(waves.length).toBe(5)
    // Wave 0: cat:apparel
    expect(waves[0].map((u) => u.key)).toEqual(["cat:apparel"])
    // Wave 1: cat:sub-shirts
    expect(waves[1].map((u) => u.key)).toEqual(["cat:sub-shirts"])
    // Wave 2: prod:shirt
    expect(waves[2].map((u) => u.key)).toEqual(["prod:shirt"])
    // Wave 3: var:shirt-s
    expect(waves[3].map((u) => u.key)).toEqual(["var:shirt-s"])
    // Wave 4: price:shirt:eur
    expect(waves[4].map((u) => u.key)).toEqual(["price:shirt:eur"])
  })

  it("allows multiple units in the same wave when their dependencies are satisfied", () => {
    const units: ImportUnit[] = [
      makeUnit("prod:shirt", []),
      makeUnit("var:shirt-s", ["prod:shirt"]),
      makeUnit("var:shirt-m", ["prod:shirt"]),
      makeUnit("price:shirt-s:eur", ["var:shirt-s"]),
      makeUnit("price:shirt-m:eur", ["var:shirt-m"]),
    ]

    const waves = resolveExecutionWaves(units)
    expect(waves.length).toBe(3)
    expect(waves[0].map((u) => u.key)).toEqual(["prod:shirt"])
    expect(waves[1].map((u) => u.key).sort()).toEqual(["var:shirt-m", "var:shirt-s"])
    expect(waves[2].map((u) => u.key).sort()).toEqual(["price:shirt-m:eur", "price:shirt-s:eur"])
  })

  it("detects direct 2-node circular dependencies", () => {
    const units: ImportUnit[] = [
      makeUnit("cat:a", ["cat:b"]),
      makeUnit("cat:b", ["cat:a"]),
    ]

    const cycle = detectDependencyCycles(units)
    expect(cycle).not.toBeNull()
    expect(cycle?.length).toBeGreaterThanOrEqual(2)

    expect(() => resolveExecutionWaves(units)).toThrow(/Circular dependency detected/)
  })

  it("detects multi-node indirect circular dependencies", () => {
    const units: ImportUnit[] = [
      makeUnit("cat:a", ["cat:b"]),
      makeUnit("cat:b", ["cat:c"]),
      makeUnit("cat:c", ["cat:d"]),
      makeUnit("cat:d", ["cat:a"]),
    ]

    const cycle = detectDependencyCycles(units)
    expect(cycle).not.toBeNull()
    expect(() => resolveExecutionWaves(units)).toThrow(/Circular dependency detected/)
  })

  it("detects self-referencing circular dependency", () => {
    const units: ImportUnit[] = [makeUnit("cat:self", ["cat:self"])]

    const cycle = detectDependencyCycles(units)
    expect(cycle).not.toBeNull()
    expect(() => resolveExecutionWaves(units)).toThrow(/Circular dependency detected/)
  })
})
