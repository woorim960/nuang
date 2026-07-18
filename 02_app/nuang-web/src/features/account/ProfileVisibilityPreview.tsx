import { ChevronDown, Eye, EyeOff, LockKeyhole } from "lucide-react";
import {
  listDefaultComparableFields,
  listPrivateOrBlockedFields,
  type ProfileVisibilityRule,
} from "@/features/together/profile-visibility-policy";

export function ProfileVisibilityPreview() {
  const publicFields = listDefaultComparableFields();
  const privateFields = listPrivateOrBlockedFields();

  return (
    <section aria-labelledby="profile-visibility-title">
      <div>
        <h2 className="text-base font-bold" id="profile-visibility-title">
          공개 범위
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          프로필과 성향지도는 공개하고, 민감한 정보는 비공개로 보호해요.
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">
          공개 {publicFields.length}개
          <span aria-hidden="true" className="mx-2 text-line">
            ·
          </span>
          비공개 {privateFields.length}개
        </p>
      </div>

      <div className="mt-4 border-y border-line">
        <div className="flex items-center gap-3 py-3">
          <Eye aria-hidden="true" className="shrink-0 text-ink" size={19} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold">공개되는 정보</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted">
              프로필을 보는 사람과 1:1 비교에 사용돼요.
            </p>
          </div>
        </div>
        <VisibilityList fields={publicFields} />
      </div>

      <details className="group border-b border-line">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
          <EyeOff aria-hidden="true" className="shrink-0 text-muted" size={19} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">비공개 정보 {privateFields.length}개</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              민감 정보와 원자료는 비교에서도 추정하지 않아요.
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="shrink-0 text-muted transition-transform group-open:rotate-180"
            size={18}
          />
        </summary>
        <VisibilityList fields={privateFields} />
      </details>

      <div className="flex items-start gap-3 pt-3 text-muted">
        <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        <p className="text-xs leading-5">
          공개 범위를 직접 바꾸는 기능은 준비 중이에요. 열리기 전에는 위 기본값이
          유지됩니다.
        </p>
      </div>
    </section>
  );
}

function VisibilityList({
  fields,
}: {
  fields: ProfileVisibilityRule[];
}) {
  return (
    <ul className="border-t border-line">
      {fields.map((field) => (
        <li
          className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
          key={field.fieldId}
        >
          <span className="text-sm font-medium text-ink">{field.label}</span>
          <span className="shrink-0 text-xs font-semibold text-muted">
            {getRuleLabel(field)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function getRuleLabel(field: ProfileVisibilityRule) {
  if (field.defaultVisibility === "public") return "공개";
  if (field.comparisonUse === "blocked") return "항상 비공개";

  return "비공개";
}
