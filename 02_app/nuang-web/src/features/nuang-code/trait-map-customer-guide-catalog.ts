export const publishedTraitMapCustomerGuideCodes = ["ENAKQ"] as const;

export function hasPublishedTraitMapCustomerGuide(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  return publishedTraitMapCustomerGuideCodes.some(
    (publishedCode) => publishedCode === normalizedCode,
  );
}
