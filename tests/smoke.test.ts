import { describe, expect, it } from "vitest";

// This test checks nothing about SalesTrack itself. It only proves the
// toolchain (Vitest + TypeScript) is wired up correctly, so later slices
// can trust "pnpm test" when they add real tests for business rules.
describe("toolchain smoke test", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
