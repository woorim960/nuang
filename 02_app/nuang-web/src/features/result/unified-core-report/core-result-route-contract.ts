const allowedBackDestinations = new Set([
  "/home",
  "/map",
  "/my?tab=reports",
  "/my/reports/history",
]);

export function sanitizeCoreResultBackHref(
  value: string | string[] | null | undefined,
  fallback = "/my/reports/history",
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !allowedBackDestinations.has(candidate)) return fallback;
  return candidate;
}

export function buildAccountCoreResultHref({
  backHref,
  resultReportId,
}: {
  backHref: string;
  resultReportId: string;
}) {
  const safeBackHref = sanitizeCoreResultBackHref(backHref);
  return `/results/account/${resultReportId}?backTo=${encodeURIComponent(safeBackHref)}`;
}

export function buildLocalCoreResultHref({
  backHref,
  localResultId,
}: {
  backHref: string;
  localResultId: string;
}) {
  const safeBackHref = sanitizeCoreResultBackHref(backHref);
  return `/results/local/${localResultId}?backTo=${encodeURIComponent(safeBackHref)}`;
}
