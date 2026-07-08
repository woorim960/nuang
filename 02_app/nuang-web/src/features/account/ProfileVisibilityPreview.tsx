import type { ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  listDefaultComparableFields,
  listPrivateOrBlockedFields,
  type ProfileVisibilityRule,
} from "@/features/together/profile-visibility-policy";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

export function ProfileVisibilityPreview() {
  const publicFields = listDefaultComparableFields();
  const privateFields = listPrivateOrBlockedFields();
  const closedState = createApiClosedPayload("profile_visibility_db_write_pending");

  return (
    <section aria-labelledby="profile-visibility-title" className="grid gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          <ShieldCheck aria-hidden="true" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <StatusPill tone="primary">공개 범위 기본값</StatusPill>
          <h2 className="mt-2 text-base font-bold" id="profile-visibility-title">
            비교에 쓰이는 정보만 열어요
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            계정 서버 연결 전에는 설정을 저장하지 않아요. 현재는 공개 프로필과
            1:1 비교에 적용할 기본값을 미리 보여줍니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <VisibilityMetric
          label="기본 공개"
          value={`${publicFields.length}개`}
          description="프로필 비교에 사용"
        />
        <VisibilityMetric
          label="기본 비공개"
          value={`${privateFields.length}개`}
          description="추정 없이 숨김"
        />
      </div>

      <div className="rounded-lg border border-primary/20 bg-surface-soft p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-primary">
            <Save aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold">저장 준비 상태</h3>
              <StatusPill tone="neutral">읽기 전용</StatusPill>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              {closedState.display.message} {closedState.display.nextStep}
            </p>
          </div>
        </div>
        <button
          aria-label="공개 범위 저장 준비 중"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-muted disabled:cursor-not-allowed disabled:opacity-80"
          disabled
          type="button"
        >
          <LockKeyhole aria-hidden="true" size={16} />
          서버 연결 후 저장
        </button>
      </div>

      <VisibilityGroup
        fields={publicFields}
        icon={<Eye aria-hidden="true" size={18} />}
        note="상대가 내 프로필을 볼 때, 이 요약 범위 안에서 바로 비교할 수 있어요."
        title="기본 공개"
        type="public"
      />
      <VisibilityGroup
        fields={privateFields}
        icon={<EyeOff aria-hidden="true" size={18} />}
        note="민감하거나 원자료에 가까운 정보는 기본으로 닫고, 비교에서도 추정하지 않아요."
        title="기본 비공개"
        type="private"
      />
    </section>
  );
}

function VisibilityGroup({
  fields,
  icon,
  note,
  title,
  type,
}: {
  fields: ProfileVisibilityRule[];
  icon: ReactNode;
  note: string;
  title: string;
  type: "private" | "public";
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{title}</h3>
            <StatusPill tone={type === "public" ? "success" : "neutral"}>
              {type === "public" ? "비교 사용" : "잠금"}
            </StatusPill>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{note}</p>
        </div>
      </div>

      <ul className="mt-3 grid gap-2">
        {fields.map((field) => (
          <li
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-surface px-3"
            key={field.fieldId}
          >
            <span className="text-sm font-semibold">{field.label}</span>
            <StatusPill tone={getRuleTone(field)}>
              {getRuleLabel(field)}
            </StatusPill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VisibilityMetric({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{description}</p>
    </div>
  );
}

function getRuleLabel(field: ProfileVisibilityRule) {
  if (field.defaultVisibility === "public") return "공개";
  if (field.comparisonUse === "blocked") return "차단";

  return "비공개";
}

function getRuleTone(field: ProfileVisibilityRule) {
  if (field.defaultVisibility === "public") return "success";
  if (field.comparisonUse === "blocked") return "caution";

  return "neutral";
}
