"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import shared from "./AdminShared.module.css";

export function AdminResearchRefreshButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function refresh() {
    setPending(true);

    try {
      const response = await fetch("/api/admin/research/refresh", {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
        return;
      }

      window.alert("분석을 갱신하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } catch {
      window.alert("분석을 갱신하지 못했습니다. 연결 상태를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className={shared.headerAction}
      disabled={pending}
      onClick={refresh}
      type="button"
    >
      <RefreshCw aria-hidden="true" size={16} strokeWidth={1.7} />
      {pending ? "분석 중" : "분석 갱신"}
    </button>
  );
}
