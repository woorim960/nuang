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
        프로필, 게시물, 검사 결과, 비교 기록과 비공개 연락처가 모두
        삭제됩니다. 삭제한 내용은 복구할 수 없습니다.
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
        {pending ? "삭제 중" : "계정과 모든 데이터 삭제"}
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
