export const coreAssessments = [
  {
    assessmentId: "nu-core-quick",
    title: "빠른 코어",
    caption: "20문항",
    duration: "3분",
    href: "/assessments/nu-core-quick",
    mapImpact: "예비 결과",
    motif: "water" as const,
    resultUse: "비교·그룹 미사용",
    storage: "로컬 30일",
  },
  {
    assessmentId: "nu-core-full",
    title: "정밀 코어",
    caption: "60문항",
    duration: "10분",
    href: "/assessments/nu-core-full",
    mapImpact: "성향지도 반영",
    motif: "purple" as const,
    resultUse: "비교 준비 기준",
    storage: "로컬 30일",
  },
];
