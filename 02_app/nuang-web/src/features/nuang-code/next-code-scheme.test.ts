import { describe, expect, it } from "vitest";
import {
  assertCodeSchemeCanActivate,
  canActivateCodeScheme,
  nextNuangCodeScheme,
} from "@/features/nuang-code/next-code-scheme";

describe("next NUANG code scheme", () => {
  it("keeps the owner-approved customer order and symbols", () => {
    expect(
      nextNuangCodeScheme.positions.map((position) => [
        position.domainId,
        position.lowSymbol,
        position.highSymbol,
      ]),
    ).toEqual([
      ["SE", "I", "E"],
      ["OE", "R", "N"],
      ["RO", "G", "A"],
      ["SM", "M", "K"],
      ["ER", "C", "Q"],
    ]);
  });

  it("cannot become customer-active before every validation gate passes", () => {
    expect(canActivateCodeScheme(nextNuangCodeScheme)).toBe(false);
    expect(() => assertCodeSchemeCanActivate(nextNuangCodeScheme)).toThrow(
      /has not passed every measurement gate/,
    );
  });
});
