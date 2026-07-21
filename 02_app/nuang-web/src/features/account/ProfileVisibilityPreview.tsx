"use client";

import {
  ChevronDown,
  Eye,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  alwaysPrivateProfileItems,
  type CommunityProfileVisibilityPayload,
} from "@/features/account/profile-visibility-settings";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import styles from "./ProfileVisibilityPreview.module.css";

type VisibilityDraft = Pick<
  CommunityProfileVisibilityPayload,
  "codeVisible" | "comparisonEnabled" | "detailsVisible"
>;

type VisibilityResponse = {
  error?: string;
  message?: string;
  ok?: boolean;
  visibility?: CommunityProfileVisibilityPayload;
};

export function ProfileVisibilityPreview() {
  const [saved, setSaved] = useState<CommunityProfileVisibilityPayload | null>(
    null,
  );
  const [draft, setDraft] = useState<VisibilityDraft | null>(null);
  const [status, setStatus] = useState<
    "error" | "loading" | "ready" | "saving"
  >("loading");
  const [message, setMessage] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      Boolean(
        saved &&
        draft &&
        (saved.codeVisible !== draft.codeVisible ||
          saved.detailsVisible !== draft.detailsVisible ||
          saved.comparisonEnabled !== draft.comparisonEnabled),
      ),
    [draft, saved],
  );

  async function loadVisibility() {
    setStatus("loading");
    setMessage(null);

    try {
      const result = await requestVisibility();
      if (!result.ok) {
        setMessage(result.message ?? "공개 정보 설정을 불러오지 못했어요.");
        setStatus("error");
        return;
      }

      setSaved(result.visibility);
      setDraft(toDraft(result.visibility));
      setStatus("ready");
    } catch {
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let active = true;

    void requestVisibility().then((result) => {
      if (!active) return;

      if (!result.ok) {
        setMessage(result.message ?? "공개 정보 설정을 불러오지 못했어요.");
        setStatus("error");
        return;
      }

      setSaved(result.visibility);
      setDraft(toDraft(result.visibility));
      setStatus("ready");
    });

    return () => {
      active = false;
    };
  }, []);

  function updateDraft(key: keyof VisibilityDraft, value: boolean) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };

      if (key === "codeVisible" && !value) {
        next.detailsVisible = false;
        next.comparisonEnabled = false;
      }
      if (key === "detailsVisible") {
        if (value) next.codeVisible = true;
        else next.comparisonEnabled = false;
      }
      if (key === "comparisonEnabled" && value) {
        next.codeVisible = true;
        next.detailsVisible = true;
      }

      return next;
    });
    setMessage(null);
  }

  async function save() {
    if (!saved || !draft || !dirty || status === "saving") return;
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/profile-visibility", {
        body: JSON.stringify({
          ...draft,
          expectedRevision: saved.revision,
          policyVersion: profileVisibilityPolicyVersion,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as VisibilityResponse | null;

      if (!response.ok || !payload?.visibility) {
        setMessage(payload?.message ?? "변경사항을 저장하지 못했어요.");
        setStatus("ready");
        return;
      }

      setSaved(payload.visibility);
      setDraft(toDraft(payload.visibility));
      setMessage("공개 정보를 저장했어요.");
      setStatus("ready");
    } catch {
      setMessage("연결이 불안정해요. 선택한 내용은 그대로 두었어요.");
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return (
      <div aria-live="polite" className={styles.statePanel} role="status">
        <span className={styles.loader} />
        <strong>공개 정보를 확인하고 있어요</strong>
        <p>다른 사람에게 보이는 현재 설정을 안전하게 불러옵니다.</p>
      </div>
    );
  }

  if (!saved || !draft || status === "error") {
    return (
      <div className={styles.statePanel} role="alert">
        <ShieldCheck aria-hidden="true" size={24} strokeWidth={1.7} />
        <strong>설정을 안전하게 불러오지 못했어요</strong>
        <p>{message ?? "잠시 뒤 다시 시도해 주세요."}</p>
        <button onClick={() => void loadVisibility()} type="button">
          <RefreshCw aria-hidden="true" size={16} /> 다시 불러오기
        </button>
      </div>
    );
  }

  return (
    <section className={styles.visibility}>
      <div className={styles.preview}>
        <span className={styles.previewEyebrow}>
          다른 사람이 보는 내 프로필
        </span>
        <div className={styles.previewIdentity}>
          <span aria-hidden="true" className={styles.previewAvatar}>
            {saved.displayName.slice(0, 1)}
          </span>
          <span>
            <strong>{saved.displayName}</strong>
            <small>
              {draft.codeVisible && saved.code
                ? `${saved.code} · ${saved.profileName ?? "뉴앙 성향"}`
                : "성향 정보 비공개"}
            </small>
          </span>
        </div>
        <Link href={`/feed/profiles/${saved.publicId}?view=public`}>
          다른 사람에게 보이는 모습 확인
        </Link>
      </div>

      <section
        aria-labelledby="public-information-title"
        className={styles.group}
      >
        <div className={styles.groupIntro}>
          <Eye aria-hidden="true" size={19} strokeWidth={1.7} />
          <span>
            <h2 id="public-information-title">공개 정보</h2>
            <p>다른 사람이 내 프로필에서 볼 수 있는 정보를 정해요.</p>
          </span>
        </div>

        <div className={styles.fixedRow}>
          <span>
            <strong>기본 프로필</strong>
            <small>프로필 사진, 닉네임, 사용자 ID, 프로필 메시지</small>
          </span>
          <span className={styles.publicLabel}>공개</span>
        </div>

        <VisibilitySwitch
          checked={draft.codeVisible}
          description="내 5글자 뉴앙 코드와 역할형 이름을 보여줘요."
          label="대표 코드 공개"
          onChange={(value) => updateDraft("codeVisible", value)}
        />
        <VisibilitySwitch
          checked={draft.detailsVisible}
          description="5개 성향 영역과 세부 성향 요약을 보여줘요."
          label="상세 성향 공개"
          onChange={(value) => updateDraft("detailsVisible", value)}
        />
        <VisibilitySwitch
          checked={draft.comparisonEnabled}
          description="내가 공개한 성향만 사용해 상대가 비교 리포트를 만들 수 있어요."
          label="나와 비교 허용"
          onChange={(value) => updateDraft("comparisonEnabled", value)}
        />
      </section>

      <div className={styles.scopeNote}>
        <UsersRound aria-hidden="true" size={18} strokeWidth={1.7} />
        <p>
          공개한 정보는 링크를 받은 사람을 포함해 누구나 볼 수 있어요. 게시물
          공개 범위는 글을 작성하거나 수정할 때 따로 정합니다.
        </p>
      </div>

      <details className={styles.privateDetails}>
        <summary>
          <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>
            <strong>항상 비공개로 보호되는 정보</strong>
            <small>어떤 설정을 골라도 공개하지 않아요.</small>
          </span>
          <ChevronDown aria-hidden="true" size={18} />
        </summary>
        <ul>
          {alwaysPrivateProfileItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>

      {message ? (
        <p aria-live="polite" className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      {dirty ? (
        <div className={styles.saveDock}>
          <button
            disabled={status === "saving"}
            onClick={() => void save()}
            type="button"
          >
            {status === "saving" ? "저장 중" : "변경사항 저장"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function VisibilitySwitch({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={styles.switchRow}>
      <label htmlFor={`visibility-${label}`}>
        <strong>{label}</strong>
        <small>{description}</small>
      </label>
      <button
        aria-checked={checked}
        aria-label={`${label}, ${checked ? "켜짐" : "꺼짐"}`}
        className={styles.switch}
        id={`visibility-${label}`}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span />
      </button>
    </div>
  );
}

function toDraft(value: CommunityProfileVisibilityPayload): VisibilityDraft {
  return {
    codeVisible: value.codeVisible,
    comparisonEnabled: value.comparisonEnabled,
    detailsVisible: value.detailsVisible,
  };
}

async function requestVisibility(): Promise<
  | { message?: string; ok: false }
  | { ok: true; visibility: CommunityProfileVisibilityPayload }
> {
  try {
    const response = await fetch("/api/profile-visibility", {
      cache: "no-store",
    });
    const payload = (await response
      .json()
      .catch(() => null)) as VisibilityResponse | null;

    if (!response.ok || !payload?.visibility) {
      return { message: payload?.message, ok: false };
    }

    return { ok: true, visibility: payload.visibility };
  } catch {
    return {
      message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
      ok: false,
    };
  }
}
