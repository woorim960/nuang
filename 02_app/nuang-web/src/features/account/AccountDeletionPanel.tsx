"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./AccountDeletionPanel.module.css";

export function AccountDeletionPanel() {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const canDelete = confirmation.trim() === "계정 삭제";

  async function deleteAccount() {
    if (!canDelete || pending) return;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        body: JSON.stringify({ confirmation: confirmation.trim() }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });
      const body = (await response.json()) as { message?: string; ok?: boolean };

      if (!response.ok || !body.ok) {
        setMessage(body.message ?? "계정을 삭제하지 못했어요.");
        return;
      }

      await createBrowserSupabaseClient()?.auth.signOut({ scope: "local" });
      clearNuangLocalData();
      window.location.replace("/");
    } catch {
      setMessage("계정을 삭제하지 못했어요. 연결 상태를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.panel}>
      <span className={styles.icon}>
        <AlertTriangle aria-hidden="true" size={22} strokeWidth={1.7} />
      </span>
      <h1>계정을 삭제할까요?</h1>
      <p>
        프로필, 게시물, 검사 결과, 비교 기록, 로그인 정보와 비공개 연락처 등
        계정에 연결된 데이터가 영구 삭제됩니다. 같은 Google·Kakao 계정으로 다시
        가입할 수 있지만 삭제한 내용은 복구되거나 새 계정으로 이어지지 않습니다.
        결제나 민원 기록이 실제로 존재하고 법령상 보존 의무가 있는 경우에만 해당
        기록을 다른 데이터와 분리해 정해진 기간 동안 보관한 뒤 삭제합니다.
      </p>
      <label>
        <span>
          계속하려면 <strong>계정 삭제</strong>를 입력하세요
        </span>
        <input
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="계정 삭제"
          value={confirmation}
        />
      </label>
      <button
        disabled={!canDelete || pending}
        onClick={deleteAccount}
        type="button"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className={styles.spinner} size={18} />
        ) : null}
        {pending ? "삭제 중" : "계정과 연결된 데이터 영구 삭제"}
      </button>
      {message ? (
        <p aria-live="polite" className={styles.message} role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function clearNuangLocalData() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("nuang")) localStorage.removeItem(key);
  }

  if (typeof indexedDB !== "undefined") {
    indexedDB.deleteDatabase("nuang-local");
  }
}
