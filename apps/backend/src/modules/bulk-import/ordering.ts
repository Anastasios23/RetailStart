import { MedusaError } from "@medusajs/framework/utils"
import { ImportUnit } from "./types"

/**
 * Detects any dependency cycles among the given import units.
 * Returns the cycle path as an array of keys if a cycle exists, or null otherwise.
 */
export function detectDependencyCycles(units: ImportUnit[]): string[] | null {
  const adj = new Map<string, string[]>()
  const unitKeys = new Set(units.map((u) => u.key))

  for (const unit of units) {
    // Only include dependencies that are also part of this batch
    const internalDeps = unit.dependencies.filter((dep) => unitKeys.has(dep))
    adj.set(unit.key, internalDeps)
  }

  const visited = new Map<string, 0 | 1 | 2>() // 0: unvisited, 1: visiting, 2: visited
  for (const key of unitKeys) {
    visited.set(key, 0)
  }

  const path: string[] = []

  function dfs(curr: string): string[] | null {
    visited.set(curr, 1)
    path.push(curr)

    const neighbors = adj.get(curr) || []
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor)
      if (state === 1) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(neighbor)
        return path.slice(cycleStartIndex).concat(neighbor)
      }
      if (state === 0) {
        const cycle = dfs(neighbor)
        if (cycle) return cycle
      }
    }

    visited.set(curr, 2)
    path.pop()
    return null
  }

  for (const key of unitKeys) {
    if (visited.get(key) === 0) {
      const cycle = dfs(key)
      if (cycle) return cycle
    }
  }

  return null
}

/**
 * Organizes units into ordered execution waves (Kahn's algorithm).
 * Units in wave N depend only on units in waves 0 through N-1.
 * Throws an Error if a circular dependency is detected.
 */
export function resolveExecutionWaves(units: ImportUnit[]): ImportUnit[][] {
  const cycle = detectDependencyCycles(units)
  if (cycle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Circular dependency detected involving: ${cycle.join(" -> ")}`
    )
  }

  const unitMap = new Map<string, ImportUnit>()
  const batchKeys = new Set<string>()
  for (const unit of units) {
    unitMap.set(unit.key, unit)
    batchKeys.add(unit.key)
  }

  const satisfiedKeys = new Set<string>()
  const remainingKeys = new Set<string>(batchKeys)
  const waves: ImportUnit[][] = []

  while (remainingKeys.size > 0) {
    const currentWave: ImportUnit[] = []

    for (const key of remainingKeys) {
      const unit = unitMap.get(key)!
      // Check if all batch-internal dependencies have been satisfied in earlier waves
      const internalDeps = unit.dependencies.filter((d) => batchKeys.has(d))
      const allDepsSatisfied = internalDeps.every((dep) => satisfiedKeys.has(dep))

      if (allDepsSatisfied) {
        currentWave.push(unit)
      }
    }

    if (currentWave.length === 0) {
      // Should have been caught by detectDependencyCycles, but guard against deadlock
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unable to resolve dependency wave for remaining units: ${Array.from(
          remainingKeys
        ).join(", ")}`
      )
    }

    // Sort current wave deterministically by key for reproducible execution order
    currentWave.sort((a, b) => a.key.localeCompare(b.key))
    waves.push(currentWave)

    for (const unit of currentWave) {
      satisfiedKeys.add(unit.key)
      remainingKeys.delete(unit.key)
    }
  }

  return waves
}
