import { describe, expect, it } from "vitest";
import { enakqTraitMapTemplateV1 } from "@/features/nuang-code/enakq-trait-map-template-v1";
import { traitMapContentAtomSchema } from "@/features/nuang-code/trait-map-content-contract-v1";

describe("ENAKQ trait map template v1", () => {
  it("keeps the representative profile, five axes, and six contexts together", () => {
    expect(enakqTraitMapTemplateV1).toMatchObject({
      code: "ENAKQ",
      profileName: "관계를 여는 지휘자",
      status: "research_preview_not_customer_content",
    });
    expect(enakqTraitMapTemplateV1.axes.map((axis) => axis.symbol)).toEqual([
      "E",
      "N",
      "A",
      "K",
      "Q",
    ]);
    expect(
      enakqTraitMapTemplateV1.contexts.map((context) => context.id),
    ).toEqual([
      "daily",
      "family",
      "friend",
      "partner",
      "person_of_interest",
      "work",
    ]);
  });

  it("validates every content atom without marking drafts as published", () => {
    const parsed = enakqTraitMapTemplateV1.contentAtoms.map((atom) =>
      traitMapContentAtomSchema.parse(atom),
    );

    expect(parsed).toHaveLength(10);
    expect(
      parsed.every((atom) => atom.publicationState === "research_only"),
    ).toBe(true);
    expect(new Set(parsed.map((atom) => atom.atomId)).size).toBe(parsed.length);
  });

  it("requires relationship context before relationship copy can be reused", () => {
    const relationshipAtoms = enakqTraitMapTemplateV1.contentAtoms.filter(
      (atom) => atom.context !== "general",
    );

    expect(relationshipAtoms).toHaveLength(5);
    expect(
      relationshipAtoms.every((atom) =>
        atom.requiredSignals.includes("relationship_context"),
      ),
    ).toBe(true);
  });
});
