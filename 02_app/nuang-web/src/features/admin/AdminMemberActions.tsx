"use client";

import { EyeOff, RotateCcw, ShieldAlert, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import shared from "./AdminShared.module.css";
import styles from "./AdminMemberActions.module.css";

type MemberAction =
  | "hide_profile"
  | "reactivate_account"
  | "restore_profile"
  | "suspend_account";

export function AdminMemberActions({
  accountId,
  accountStatus,
  profileStatus,
}: {
  accountId: string;
  accountStatus: string;
  profileStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<MemberAction | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<MemberAction | null>(null);

  async function run(action: MemberAction) {
    const destructive =
      action === "suspend_account" || action === "hide_profile";
    if (
      destructive &&
      confirmation !== action
    ) {
      setConfirmation(action);
      return;
    }
    setConfirmation(null);

    setPending(action);
    setMessage("");
    const response = await fetch(`/api/admin/members/${accountId}`, {
      body: JSON.stringify({ action }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message ?? "요청을 처리하지 못했습니다.");
      setPending(null);
      return;
    }
    setMessage("변경 사항을 반영했습니다.");
    setPending(null);
    router.refresh();
  }

  return (
    <section className={`${shared.panel} ${styles.actions}`}>
      <div className={shared.panelHeader}>
        <h2>운영 조치</h2>
        <span>모든 변경은 운영 기록에 남습니다</span>
      </div>
      <div className={styles.actionList}>
        {profileStatus === "active" ? (
          <button
            disabled={Boolean(pending)}
            onClick={() => run("hide_profile")}
            type="button"
          >
            <EyeOff aria-hidden="true" size={18} strokeWidth={1.7} />
            <span>
              <strong>공개 프로필 숨기기</strong>
              <small>검색과 상대 프로필에서 보이지 않게 합니다.</small>
            </span>
          </button>
        ) : (
          <button
            disabled={Boolean(pending)}
            onClick={() => run("restore_profile")}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={18} strokeWidth={1.7} />
            <span>
              <strong>공개 프로필 복구</strong>
              <small>회원의 프로필을 다시 공개 가능한 상태로 바꿉니다.</small>
            </span>
          </button>
        )}
        {accountStatus === "active" ? (
          <button
            className={styles.danger}
            disabled={Boolean(pending)}
            onClick={() => run("suspend_account")}
            type="button"
          >
            <ShieldAlert aria-hidden="true" size={18} strokeWidth={1.7} />
            <span>
              <strong>계정 이용 정지</strong>
              <small>로그인 상태는 유지되지만 새 활동을 할 수 없습니다.</small>
            </span>
          </button>
        ) : (
          <button
            disabled={Boolean(pending)}
            onClick={() => run("reactivate_account")}
            type="button"
          >
            <UserRoundCheck aria-hidden="true" size={18} strokeWidth={1.7} />
            <span>
              <strong>계정 이용 복구</strong>
              <small>새 활동을 다시 허용합니다.</small>
            </span>
          </button>
        )}
      </div>
      {message ? (
        <p aria-live="polite" className={styles.message}>
          {message}
        </p>
      ) : null}
      <AdminConfirmDialog
        confirmLabel={confirmation === "suspend_account" ? "이용 정지" : "프로필 숨기기"}
        description={
          confirmation === "suspend_account"
            ? "회원은 로그인할 수 있지만 새 게시물과 댓글 등 공개 활동을 할 수 없습니다. 이 조치는 운영 기록에 남습니다."
            : "프로필이 검색과 상대 프로필 화면에서 보이지 않게 됩니다. 계정 자체는 계속 이용할 수 있습니다."
        }
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation && run(confirmation)}
        open={Boolean(confirmation)}
        pending={Boolean(pending)}
        title={
          confirmation === "suspend_account"
            ? "계정 이용을 정지할까요?"
            : "공개 프로필을 숨길까요?"
        }
      />
    </section>
  );
}
