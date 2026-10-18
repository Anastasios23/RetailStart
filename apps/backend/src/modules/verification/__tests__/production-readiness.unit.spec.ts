import { generateProductionReadinessReport } from "../readiness-checker"

describe("Production-Readiness Verification and Acceptance Gates (Phase 17, ADR-0014, ADR-0033)", () => {
  it("generates complete production readiness report evaluating all 17 phase gates", () => {
    const report = generateProductionReadinessReport({
      release_tuple_id: "rt_prod_release_001",
      lifecycle_policy_version: "1.0.0",
    })

    expect(report.report_id).toBeDefined()
    expect(report.report_id.startsWith("prr_")).toBe(true)
    expect(report.total_gates).toBe(17)
    expect(report.passed_gates).toBe(17)
    expect(report.failed_gates).toBe(0)
    expect(report.is_production_ready).toBe(true)
    expect(report.release_tuple_id).toBe("rt_prod_release_001")
    expect(report.lifecycle_policy_version).toBe("1.0.0")

    // Verify all phases 1 through 17 are represented
    const phases = report.gate_results.map((g) => g.phase)
    for (let p = 1; p <= 17; p++) {
      expect(phases).toContain(p)
    }

    // Verify each gate has explicit ADR references and evidence summary
    for (const gate of report.gate_results) {
      expect(gate.adrs.length).toBeGreaterThan(0)
      expect(gate.evidence_summary.length).toBeGreaterThan(10)
      expect(gate.status).toBe("passed")
    }

    // Verify deferred limitations are explicitly enumerated
    expect(report.deferred_limitations.length).toBeGreaterThanOrEqual(4)
    expect(
      report.deferred_limitations.some((lim) => lim.includes("Client-specific custom brand assets"))
    ).toBe(true)
  })
})
