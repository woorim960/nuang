import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminAudit } from "@/features/admin/server-admin-audit";

export const runtime = "nodejs";

export async function GET() {
  const context = await resolveAdminContext();
  if (!context.ok) {
    return new Response("관리자 권한이 필요합니다.", { status: 403 });
  }
  const items = await readAdminAudit({ client: context.client });
  const rows = [
    ["시간", "관리자", "조치", "대상 테이블", "대상 ID"],
    ...items.map((item) => [
      item.createdAt,
      item.adminName,
      item.action,
      item.targetTable ?? "",
      item.targetId ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  return new Response(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="nuang-admin-audit-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
