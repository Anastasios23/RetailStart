import { installShutdownHandlers, isDraining } from "../shutdown"

describe("shutdown handlers", () => {
  it("exports installShutdownHandlers and registers handlers at top level", () => {
    expect(typeof installShutdownHandlers).toBe("function")
    expect(isDraining()).toBe(false)
    expect(process.listenerCount("SIGTERM")).toBeGreaterThanOrEqual(1)
  })
})
