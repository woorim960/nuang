export type AssessmentExperienceSectionId = "lab" | "self" | "together";

export const assessmentExperienceSections: ReadonlyArray<{
  id: AssessmentExperienceSectionId;
  label: string;
}> = [
  { id: "self", label: "나 알아보기" },
  { id: "together", label: "함께하기" },
  { id: "lab", label: "별난 연구소" },
];
