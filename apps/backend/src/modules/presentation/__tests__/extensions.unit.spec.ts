import { validateExtensionSet } from "../extensions"
import { ClientExtensionDescriptor } from "../types"

describe("Client Extension Allow-List and Dependency Validation (ADR-0089, ADR-0095)", () => {
  const allowList: Record<string, string> = {
    "stripe-payments": "^1.0.0",
    "customer-reviews": "^2.0.0",
    "loyalty-rewards": "^1.0.0",
  }

  it("approves allowed extensions satisfying version ranges and dependencies", () => {
    const extensions: ClientExtensionDescriptor[] = [
      {
        id: "stripe-payments",
        version: "1.2.0",
        enabled: true,
        capability_scope: "payment",
      },
      {
        id: "loyalty-rewards",
        version: "1.0.1",
        enabled: true,
        capability_scope: "custom",
        dependencies: ["stripe-payments"],
      },
    ]

    const result = validateExtensionSet(extensions, allowList)
    expect(result.is_valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects extensions not present in the approved allow-list (ADR-0089)", () => {
    const unapproved: ClientExtensionDescriptor[] = [
      {
        id: "unauthorized-script-injector",
        version: "1.0.0",
        enabled: true,
        capability_scope: "custom",
      },
    ]

    const result = validateExtensionSet(unapproved, allowList)
    expect(result.is_valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("unauthorized-script-injector' is not in the approved allow-list"))
    ).toBe(true)
  })

  it("rejects extensions with incompatible versions", () => {
    const incompatible: ClientExtensionDescriptor[] = [
      {
        id: "stripe-payments",
        version: "2.0.0", // allowList requires ^1.0.0
        enabled: true,
        capability_scope: "payment",
      },
    ]

    const result = validateExtensionSet(incompatible, allowList)
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("incompatible with supported range"))).toBe(true)
  })

  it("rejects extensions when required dependencies are missing or disabled", () => {
    const missingDependency: ClientExtensionDescriptor[] = [
      {
        id: "loyalty-rewards",
        version: "1.0.0",
        enabled: true,
        capability_scope: "custom",
        dependencies: ["stripe-payments"], // stripe-payments is missing from extensions array
      },
    ]

    const result = validateExtensionSet(missingDependency, allowList)
    expect(result.is_valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("requires enabled dependency 'stripe-payments'"))
    ).toBe(true)
  })
})
