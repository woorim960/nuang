"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AdvertisingPublicHeader } from "./AdvertisingPublicHeader";
import styles from "./AdvertisingInquiryForm.module.css";

type InquiryFormValue = {
  budgetBand: string;
  campaignObjective: string;
  companyName: string;
  contactName: string;
  creativeReadiness: string;
  desiredEndDate: string;
  desiredStartDate: string;
  details: string;
  inquiryType: string;
  marketingConsent: boolean;
  phone: string;
  preferredPlacement: string;
  privacyConsent: boolean;
  promotedOffering: string;
  scheduleMode: "fixed" | "flexible";
  targetAudience: string;
  website: string;
  websiteUrl: string;
  workEmail: string;
};

type FieldErrors = Partial<Record<keyof InquiryFormValue, string>>;

type SubmitState =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" };

const safeDraftKey = "nuang:advertising-inquiry:safe-draft.v1";
const contactDraftKey = "nuang:advertising-inquiry:contact-draft.v1";
const completionKey = "nuang:advertising-inquiry:completion.v1";
const consentDocumentVersion = "2026-08-01.v1";

const initialValue: InquiryFormValue = {
  budgetBand: "",
  campaignObjective: "",
  companyName: "",
  contactName: "",
  creativeReadiness: "",
  desiredEndDate: "",
  desiredStartDate: "",
  details: "",
  inquiryType: "",
  marketingConsent: false,
  phone: "",
  preferredPlacement: "",
  privacyConsent: false,
  promotedOffering: "",
  scheduleMode: "flexible",
  targetAudience: "",
  website: "",
  websiteUrl: "",
  workEmail: "",
};

const stepMeta = [
  {
    description: "회사와 담당자 정보를 알려주세요.",
    label: "기본 정보",
  },
  {
    description: "목표와 운영 조건을 확인할게요.",
    label: "캠페인",
  },
  {
    description: "세부 내용을 확인하고 문의를 보냅니다.",
    label: "상세·동의",
  },
] as const;

const inquiryTypes = [
  ["banner", "인라인 배너", "콘텐츠 사이의 명확히 구분된 광고 영역"],
  [
    "contextual_affiliate",
    "문맥형 제휴",
    "운영자가 소재를 확인하는 정적 제휴 카드",
  ],
  [
    "branded_together_pack",
    "브랜드 함께하기 팩",
    "함께 즐기는 참여형 콘텐츠 공동 기획",
  ],
  ["other", "기타 협업", "위 상품 외의 브랜드 제안"],
] as const;

const objectiveOptions = [
  ["awareness", "브랜드 인지도"],
  ["traffic", "사이트 방문"],
  ["engagement", "참여"],
  ["launch", "신제품·서비스 출시"],
  ["other", "기타"],
] as const;

const placementOptions = [
  ["home", "홈"],
  ["community", "커뮤니티"],
  ["together_future", "함께하기 후속 협업"],
  ["consultation", "상담 후 결정"],
] as const;

const budgetOptions = [
  ["under_1m", "100만원 미만"],
  ["1m_3m", "100~300만원"],
  ["3m_10m", "300~1,000만원"],
  ["over_10m", "1,000만원 이상"],
  ["undecided", "미정"],
] as const;

const creativeOptions = [
  ["ready", "준비 완료"],
  ["in_progress", "제작 중"],
  ["needs_collaboration", "공동 기획 필요"],
] as const;

export function AdvertisingInquiryForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<InquiryFormValue>(initialValue);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const [ready, setReady] = useState(false);
  const idempotencyKeyRef = useRef("");
  const formStartedAtRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const safeDraft = readDraft(window.localStorage, safeDraftKey);
      const contactDraft = readDraft(window.sessionStorage, contactDraftKey);
      const restored = { ...initialValue, ...safeDraft, ...contactDraft };
      setValue(restored);
      setDraftRestored(hasMeaningfulDraft(restored));
      idempotencyKeyRef.current = createIdempotencyKey();
      formStartedAtRef.current = new Date().toISOString();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || submitState.status === "pending") return;
    const timer = window.setTimeout(() => {
      const {
        contactName,
        phone,
        workEmail,
        website: _honeypot,
        ...safeDraft
      } = value;
      void _honeypot;
      writeDraft(window.localStorage, safeDraftKey, safeDraft);
      writeDraft(window.sessionStorage, contactDraftKey, {
        contactName,
        phone,
        workEmail,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [ready, submitState.status, value]);

  function update<K extends keyof InquiryFormValue>(
    key: K,
    nextValue: InquiryFormValue[K],
  ) {
    setValue((current) => ({ ...current, [key]: nextValue }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (submitState.status === "error") {
      setSubmitState({ status: "idle" });
    }
  }

  function goToStep(nextStep: number) {
    if (nextStep > step) {
      const stepErrors = validateStep(step, value);
      if (Object.keys(stepErrors).length > 0) {
        showErrors(stepErrors);
        return;
      }
    }
    setErrors({});
    setSubmitState({ status: "idle" });
    setStep(nextStep);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function showErrors(nextErrors: FieldErrors) {
    setErrors(nextErrors);
    window.setTimeout(() => {
      const firstField = Object.keys(nextErrors)[0];
      if (!firstField) return;
      const target = document.querySelector<HTMLElement>(
        `[name="${firstField}"]`,
      );
      target?.focus();
    }, 0);
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState.status === "pending") return;

    const allErrors = validateAll(value);
    if (Object.keys(allErrors).length > 0) {
      const invalidStep = getFirstInvalidStep(allErrors);
      setStep(invalidStep);
      showErrors(allErrors);
      return;
    }

    setSubmitState({ status: "pending" });

    try {
      const response = await fetch("/api/advertising/inquiries", {
        body: JSON.stringify({
          ...value,
          companyName: value.companyName.trim(),
          consentDocumentVersion,
          contactName: value.contactName.trim(),
          details: value.details.trim(),
          desiredEndDate:
            value.scheduleMode === "fixed" ? value.desiredEndDate : null,
          desiredStartDate:
            value.scheduleMode === "fixed" ? value.desiredStartDate : null,
          formStartedAt: formStartedAtRef.current || new Date().toISOString(),
          idempotencyKey:
            idempotencyKeyRef.current || createIdempotencyKey(),
          phone: value.phone.trim() || null,
          promotedOffering: value.promotedOffering.trim(),
          targetAudience: value.targetAudience.trim(),
          websiteUrl: value.websiteUrl.trim() || null,
          workEmail: value.workEmail.trim().toLowerCase(),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        createdAt?: string;
        inquiryId?: string;
        message?: string;
        ok?: boolean;
        publicReference?: string;
      } | null;

      if (!response.ok || !payload?.ok || !payload.publicReference) {
        setSubmitState({
          message:
            payload?.message ??
            "연결이 불안정해 문의를 보내지 못했어요. 작성한 내용은 그대로 보관했어요.",
          status: "error",
        });
        return;
      }

      window.localStorage.removeItem(safeDraftKey);
      window.sessionStorage.removeItem(contactDraftKey);
      window.sessionStorage.setItem(
        completionKey,
        JSON.stringify({
          completedAt: payload.createdAt ?? new Date().toISOString(),
          maskedEmail: maskEmail(value.workEmail),
          publicReference: payload.publicReference,
        }),
      );
      router.push(
        `/advertise/inquiry/complete?reference=${encodeURIComponent(payload.publicReference)}`,
      );
    } catch {
      setSubmitState({
        message:
          "연결이 불안정해 문의를 보내지 못했어요. 작성한 내용은 그대로 보관했어요.",
        status: "error",
      });
    }
  }

  if (!ready) {
    return (
      <main className={styles.page}>
        <AdvertisingPublicHeader
          backHref="/advertise"
          backLabel="광고·제휴 안내로 돌아가기"
          compact
        />
        <section aria-busy="true" className={styles.initializing}>
          <span />
          <span />
          <span />
          <p>문의 화면을 준비하고 있어요.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <AdvertisingPublicHeader
        backHref="/advertise"
        backLabel="광고·제휴 안내로 돌아가기"
        compact
      />

      <div className={styles.layout}>
        <aside className={styles.guide}>
          <p>PARTNERSHIP INQUIRY</p>
          <h1>광고·제휴 문의</h1>
          <span>
            보내주신 내용을 검토한 뒤 영업일 기준 1~2일 안에 업무
            이메일로 연락드릴게요.
          </span>

          <ol aria-label="문의 작성 단계">
            {stepMeta.map((item, index) => (
              <li
                aria-current={index === step ? "step" : undefined}
                data-complete={index < step || undefined}
                key={item.label}
              >
                <span aria-hidden="true">
                  {index < step ? (
                    <Check size={14} strokeWidth={2.2} />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.privacyNote}>
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.7} />
            <p>
              문의 내용은 상담과 제안에만 사용합니다. 개인의 검사·성향
              데이터는 광고에 사용하거나 광고주에게 제공하지 않습니다.
            </p>
          </div>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.mobileProgress}>
            <div>
              <span>
                {step + 1} / {stepMeta.length}
              </span>
              <strong>{stepMeta[step].label}</strong>
            </div>
            <div aria-hidden="true">
              <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
            </div>
          </div>

          <header className={styles.formHeading}>
            <p>STEP {step + 1}</p>
            <h2>{stepMeta[step].label}</h2>
            <span>{stepMeta[step].description}</span>
          </header>

          {draftRestored ? (
            <p className={styles.restored} role="status">
              작성하던 내용을 안전하게 불러왔어요.
            </p>
          ) : null}

          <form noValidate onSubmit={submitInquiry}>
            {step === 0 ? (
              <BasicInformationStep
                errors={errors}
                update={update}
                value={value}
              />
            ) : null}
            {step === 1 ? (
              <CampaignStep errors={errors} update={update} value={value} />
            ) : null}
            {step === 2 ? (
              <DetailsStep errors={errors} update={update} value={value} />
            ) : null}

            <div className={styles.actionBar}>
              {step > 0 ? (
                <button
                  className={styles.previous}
                  disabled={submitState.status === "pending"}
                  onClick={() => goToStep(step - 1)}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} />
                  이전
                </button>
              ) : (
                <Link className={styles.previous} href="/advertise">
                  <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} />
                  안내로
                </Link>
              )}

              <div>
                {submitState.status === "error" ? (
                  <p role="alert">
                    <CircleAlert
                      aria-hidden="true"
                      size={16}
                      strokeWidth={1.8}
                    />
                    {submitState.message}
                  </p>
                ) : null}
                {step < 2 ? (
                  <button
                    className={styles.next}
                    onClick={() => goToStep(step + 1)}
                    type="button"
                  >
                    다음
                    <ArrowRight
                      aria-hidden="true"
                      size={17}
                      strokeWidth={1.8}
                    />
                  </button>
                ) : (
                  <button
                    className={styles.next}
                    disabled={submitState.status === "pending"}
                    type="submit"
                  >
                    {submitState.status === "pending" ? (
                      <>
                        <LoaderCircle
                          aria-hidden="true"
                          className={styles.spinner}
                          size={17}
                          strokeWidth={1.8}
                        />
                        접수 중
                      </>
                    ) : (
                      <>
                        문의 접수하기
                        <ArrowRight
                          aria-hidden="true"
                          size={17}
                          strokeWidth={1.8}
                        />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function BasicInformationStep({
  errors,
  update,
  value,
}: StepProps) {
  return (
    <div className={styles.fields}>
      <Field
        error={errors.companyName}
        label="회사·브랜드명"
        name="companyName"
        required
      >
        <input
          aria-describedby={errorId("companyName", errors.companyName)}
          aria-invalid={Boolean(errors.companyName)}
          autoComplete="organization"
          maxLength={100}
          name="companyName"
          onChange={(event) => update("companyName", event.target.value)}
          placeholder="회사 또는 브랜드 이름"
          value={value.companyName}
        />
      </Field>

      <div className={styles.twoColumns}>
        <Field
          error={errors.contactName}
          label="담당자명"
          name="contactName"
          required
        >
          <input
            aria-describedby={errorId("contactName", errors.contactName)}
            aria-invalid={Boolean(errors.contactName)}
            autoComplete="name"
            maxLength={50}
            name="contactName"
            onChange={(event) => update("contactName", event.target.value)}
            placeholder="이름"
            value={value.contactName}
          />
        </Field>
        <Field
          error={errors.phone}
          hint="선택"
          label="연락처"
          name="phone"
        >
          <input
            aria-describedby={errorId("phone", errors.phone)}
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            name="phone"
            onChange={(event) => update("phone", event.target.value)}
            placeholder="010-0000-0000"
            value={value.phone}
          />
        </Field>
      </div>

      <Field
        error={errors.workEmail}
        hint="접수 확인과 답변을 받을 주소"
        label="업무 이메일"
        name="workEmail"
        required
      >
        <input
          aria-describedby={errorId("workEmail", errors.workEmail)}
          aria-invalid={Boolean(errors.workEmail)}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          name="workEmail"
          onChange={(event) => update("workEmail", event.target.value)}
          placeholder="name@company.com"
          type="email"
          value={value.workEmail}
        />
      </Field>

      <Field
        error={errors.websiteUrl}
        hint="선택 · https 주소"
        label="공식 홈페이지·캠페인 URL"
        name="websiteUrl"
      >
        <input
          aria-describedby={errorId("websiteUrl", errors.websiteUrl)}
          aria-invalid={Boolean(errors.websiteUrl)}
          autoComplete="url"
          inputMode="url"
          maxLength={500}
          name="websiteUrl"
          onChange={(event) => update("websiteUrl", event.target.value)}
          placeholder="https://"
          type="url"
          value={value.websiteUrl}
        />
      </Field>

      <div aria-hidden="true" className={styles.honeypot}>
        <label htmlFor="company-website-confirmation">웹사이트 확인</label>
        <input
          autoComplete="off"
          id="company-website-confirmation"
          name="website"
          onChange={(event) => update("website", event.target.value)}
          tabIndex={-1}
          value={value.website}
        />
      </div>

      <p className={styles.storageNote}>
        이메일과 연락처는 이 탭을 닫으면 브라우저 임시 저장에서 삭제됩니다.
      </p>
    </div>
  );
}

function CampaignStep({ errors, update, value }: StepProps) {
  return (
    <div className={styles.fields}>
      <Field
        error={errors.promotedOffering}
        label="홍보할 제품·서비스"
        name="promotedOffering"
        required
      >
        <textarea
          aria-describedby={errorId(
            "promotedOffering",
            errors.promotedOffering,
          )}
          aria-invalid={Boolean(errors.promotedOffering)}
          maxLength={300}
          name="promotedOffering"
          onChange={(event) => update("promotedOffering", event.target.value)}
          placeholder="제품이나 서비스의 특징을 간단히 알려주세요."
          rows={3}
          value={value.promotedOffering}
        />
        <CharacterCount current={value.promotedOffering.length} max={300} />
      </Field>

      <ChoiceField
        error={errors.inquiryType}
        label="문의 유형"
        name="inquiryType"
        options={inquiryTypes}
        update={(next) => update("inquiryType", next)}
        value={value.inquiryType}
      />

      <ChoiceField
        compact
        error={errors.campaignObjective}
        label="캠페인 목적"
        name="campaignObjective"
        options={objectiveOptions}
        update={(next) => update("campaignObjective", next)}
        value={value.campaignObjective}
      />

      <ChoiceField
        compact
        error={errors.preferredPlacement}
        label="희망 노출면"
        name="preferredPlacement"
        options={placementOptions}
        update={(next) => update("preferredPlacement", next)}
        value={value.preferredPlacement}
      />

      <ChoiceField
        compact
        error={errors.budgetBand}
        label="예산 구간"
        name="budgetBand"
        options={budgetOptions}
        update={(next) => update("budgetBand", next)}
        value={value.budgetBand}
      />

      <fieldset className={styles.choiceField}>
        <legend>
          희망 일정 <Required />
        </legend>
        <div className={styles.scheduleMode}>
          <label>
            <input
              checked={value.scheduleMode === "flexible"}
              name="scheduleMode"
              onChange={() => update("scheduleMode", "flexible")}
              type="radio"
              value="flexible"
            />
            <span>협의 가능</span>
          </label>
          <label>
            <input
              checked={value.scheduleMode === "fixed"}
              name="scheduleMode"
              onChange={() => update("scheduleMode", "fixed")}
              type="radio"
              value="fixed"
            />
            <span>날짜 지정</span>
          </label>
        </div>
        {value.scheduleMode === "fixed" ? (
          <div className={styles.twoColumns}>
            <Field
              error={errors.desiredStartDate}
              label="시작일"
              name="desiredStartDate"
              required
            >
              <input
                aria-describedby={errorId(
                  "desiredStartDate",
                  errors.desiredStartDate,
                )}
                aria-invalid={Boolean(errors.desiredStartDate)}
                name="desiredStartDate"
                onChange={(event) =>
                  update("desiredStartDate", event.target.value)
                }
                type="date"
                value={value.desiredStartDate}
              />
            </Field>
            <Field
              error={errors.desiredEndDate}
              label="종료일"
              name="desiredEndDate"
              required
            >
              <input
                aria-describedby={errorId(
                  "desiredEndDate",
                  errors.desiredEndDate,
                )}
                aria-invalid={Boolean(errors.desiredEndDate)}
                name="desiredEndDate"
                onChange={(event) =>
                  update("desiredEndDate", event.target.value)
                }
                type="date"
                value={value.desiredEndDate}
              />
            </Field>
          </div>
        ) : null}
      </fieldset>

      <Field
        error={errors.targetAudience}
        hint="민감정보가 아닌 넓은 고객군으로 작성"
        label="주요 대상"
        name="targetAudience"
        required
      >
        <textarea
          aria-describedby={errorId("targetAudience", errors.targetAudience)}
          aria-invalid={Boolean(errors.targetAudience)}
          maxLength={300}
          name="targetAudience"
          onChange={(event) => update("targetAudience", event.target.value)}
          placeholder="예: 새로운 취미를 찾는 20~30대 사용자"
          rows={3}
          value={value.targetAudience}
        />
      </Field>

      <ChoiceField
        compact
        error={errors.creativeReadiness}
        label="소재 준비 상태"
        name="creativeReadiness"
        options={creativeOptions}
        update={(next) => update("creativeReadiness", next)}
        value={value.creativeReadiness}
      />
    </div>
  );
}

function DetailsStep({ errors, update, value }: StepProps) {
  return (
    <div className={styles.fields}>
      <Field
        error={errors.details}
        hint="일정, 원하는 방식, 참고 URL 등을 자유롭게 작성"
        label="문의 내용"
        name="details"
        required
      >
        <textarea
          aria-describedby={errorId("details", errors.details)}
          aria-invalid={Boolean(errors.details)}
          maxLength={3000}
          name="details"
          onChange={(event) => update("details", event.target.value)}
          placeholder="협업을 통해 이루고 싶은 목표와 필요한 내용을 자세히 알려주세요."
          rows={9}
          value={value.details}
        />
        <CharacterCount current={value.details.length} max={3000} />
      </Field>

      <section className={styles.dataBoundary}>
        <LockKeyhole aria-hidden="true" size={20} strokeWidth={1.7} />
        <div>
          <strong>광고에 사용하지 않는 정보</strong>
          <p>
            개인의 검사 답변, 뉴앙 코드, 결과 리포트와 궁합 정보는 광고
            타기팅이나 광고주용 결과 자료에 포함하지 않습니다.
          </p>
        </div>
      </section>

      <div className={styles.consents}>
        <label data-error={Boolean(errors.privacyConsent) || undefined}>
          <input
            aria-describedby={errorId(
              "privacyConsent",
              errors.privacyConsent,
            )}
            aria-invalid={Boolean(errors.privacyConsent)}
            checked={value.privacyConsent}
            name="privacyConsent"
            onChange={(event) =>
              update("privacyConsent", event.target.checked)
            }
            type="checkbox"
          />
          <span>
            <strong>[필수] 광고 문의 개인정보 수집·이용에 동의합니다.</strong>
            <small>
              문의 확인과 답변을 위해 입력한 정보를 사용합니다. 자세한 내용은{" "}
              <Link href="/policies/privacy" target="_blank">
                개인정보 처리방침
              </Link>
              에서 확인할 수 있어요.
            </small>
          </span>
        </label>
        {errors.privacyConsent ? (
          <p className={styles.error} id="privacyConsent-error">
            {errors.privacyConsent}
          </p>
        ) : null}

        <label>
          <input
            checked={value.marketingConsent}
            name="marketingConsent"
            onChange={(event) =>
              update("marketingConsent", event.target.checked)
            }
            type="checkbox"
          />
          <span>
            <strong>[선택] 뉴앙의 광고 상품과 제휴 소식을 받습니다.</strong>
            <small>
              선택하지 않아도 문의 접수와 답변에는 영향을 주지 않습니다.
            </small>
          </span>
        </label>
      </div>

      <section className={styles.finalCheck}>
        <strong>접수 전에 확인해 주세요</strong>
        <ul>
          <li>문의 확인 메일은 입력한 업무 이메일로 발송됩니다.</li>
          <li>소재 파일은 담당자와 연락한 뒤 안전하게 전달받습니다.</li>
          <li>전 연령 서비스 기준에 맞지 않는 제안은 진행하기 어렵습니다.</li>
        </ul>
      </section>
    </div>
  );
}

type StepProps = {
  errors: FieldErrors;
  update: <K extends keyof InquiryFormValue>(
    key: K,
    value: InquiryFormValue[K],
  ) => void;
  value: InquiryFormValue;
};

function Field({
  children,
  error,
  hint,
  label,
  name,
  required = false,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  label: string;
  name: keyof InquiryFormValue;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span>
        <strong>
          {label} {required ? <Required /> : null}
        </strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
      {error ? (
        <span className={styles.error} id={`${name}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function ChoiceField({
  compact = false,
  error,
  label,
  name,
  options,
  update,
  value,
}: {
  compact?: boolean;
  error?: string;
  label: string;
  name: keyof InquiryFormValue;
  options: ReadonlyArray<readonly [string, string, string?]>;
  update: (value: string) => void;
  value: string;
}) {
  return (
    <fieldset className={styles.choiceField}>
      <legend>
        {label} <Required />
      </legend>
      <div className={styles.choices} data-compact={compact || undefined}>
        {options.map(([optionValue, optionLabel, description]) => (
          <label key={optionValue}>
            <input
              aria-describedby={error ? `${name}-error` : undefined}
              checked={value === optionValue}
              name={name}
              onChange={() => update(optionValue)}
              type="radio"
              value={optionValue}
            />
            <span>
              <strong>{optionLabel}</strong>
              {description ? <small>{description}</small> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p className={styles.error} id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Required() {
  return <span className={styles.required}>필수</span>;
}

function CharacterCount({ current, max }: { current: number; max: number }) {
  return (
    <span aria-label={`${max}자 중 ${current}자 입력`} className={styles.count}>
      {current.toLocaleString("ko-KR")} / {max.toLocaleString("ko-KR")}
    </span>
  );
}

function validateStep(step: number, value: InquiryFormValue): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (value.companyName.trim().length < 2) {
      errors.companyName = "회사·브랜드명을 2자 이상 입력해 주세요.";
    }
    if (value.contactName.trim().length < 2) {
      errors.contactName = "담당자명을 2자 이상 입력해 주세요.";
    }
    if (!isValidEmail(value.workEmail)) {
      errors.workEmail = "답변을 받을 수 있는 이메일 주소를 확인해 주세요.";
    }
    if (value.phone.trim() && !isValidPhone(value.phone)) {
      errors.phone = "연락처에 숫자와 +, -, 괄호만 입력해 주세요.";
    }
    if (value.websiteUrl.trim() && !isHttpsUrl(value.websiteUrl)) {
      errors.websiteUrl = "https://로 시작하는 주소를 입력해 주세요.";
    }
  }

  if (step === 1) {
    if (value.promotedOffering.trim().length < 10) {
      errors.promotedOffering = "제품·서비스를 10자 이상 소개해 주세요.";
    }
    if (!value.inquiryType) {
      errors.inquiryType = "문의 유형을 선택해 주세요.";
    }
    if (!value.campaignObjective) {
      errors.campaignObjective = "캠페인 목적을 선택해 주세요.";
    }
    if (!value.preferredPlacement) {
      errors.preferredPlacement = "희망 노출면을 선택해 주세요.";
    }
    if (!value.budgetBand) {
      errors.budgetBand = "예산 구간을 선택해 주세요.";
    }
    if (value.scheduleMode === "fixed") {
      if (!value.desiredStartDate) {
        errors.desiredStartDate = "희망 시작일을 선택해 주세요.";
      }
      if (!value.desiredEndDate) {
        errors.desiredEndDate = "희망 종료일을 선택해 주세요.";
      } else if (
        value.desiredStartDate &&
        value.desiredEndDate < value.desiredStartDate
      ) {
        errors.desiredEndDate = "종료일은 시작일 이후로 선택해 주세요.";
      }
    }
    if (value.targetAudience.trim().length < 10) {
      errors.targetAudience = "주요 대상을 10자 이상 구체적으로 알려주세요.";
    }
    if (!value.creativeReadiness) {
      errors.creativeReadiness = "소재 준비 상태를 선택해 주세요.";
    }
  }

  if (step === 2) {
    if (value.details.trim().length < 20) {
      errors.details = "문의 내용을 20자 이상 자세히 입력해 주세요.";
    }
    if (!value.privacyConsent) {
      errors.privacyConsent = "문의 접수를 위해 필수 동의가 필요해요.";
    }
  }

  return errors;
}

function validateAll(value: InquiryFormValue) {
  return {
    ...validateStep(0, value),
    ...validateStep(1, value),
    ...validateStep(2, value),
  };
}

function getFirstInvalidStep(errors: FieldErrors) {
  const fields = Object.keys(errors) as Array<keyof InquiryFormValue>;
  if (
    fields.some((field) =>
      [
        "companyName",
        "contactName",
        "phone",
        "websiteUrl",
        "workEmail",
      ].includes(field),
    )
  ) {
    return 0;
  }
  if (
    fields.some((field) =>
      [
        "budgetBand",
        "campaignObjective",
        "creativeReadiness",
        "desiredEndDate",
        "desiredStartDate",
        "inquiryType",
        "preferredPlacement",
        "promotedOffering",
        "scheduleMode",
        "targetAudience",
      ].includes(field),
    )
  ) {
    return 1;
  }
  return 2;
}

function errorId(name: keyof InquiryFormValue, error?: string) {
  return error ? `${name}-error` : undefined;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  return /^[+()\-\s0-9]{7,30}$/.test(value.trim());
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function createIdempotencyKey() {
  const browserCrypto =
    typeof globalThis.crypto === "undefined" ? null : globalThis.crypto;
  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }
  const values = new Uint8Array(16);
  if (browserCrypto) {
    browserCrypto.getRandomValues(values);
  } else {
    values.forEach((_, index) => {
      values[index] = Math.floor(Math.random() * 256);
    });
  }
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;
  const hex = Array.from(values, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.trim().split("@");
  if (!domain) return "입력한 업무 이메일";
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(2, localPart.length - visible.length))}@${domain}`;
}

function readDraft(storage: Storage, key: string) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<InquiryFormValue>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    storage.removeItem(key);
    return {};
  }
}

function writeDraft(
  storage: Storage,
  key: string,
  draft: Partial<InquiryFormValue>,
) {
  if (Object.values(draft).some((item) => Boolean(item))) {
    storage.setItem(key, JSON.stringify(draft));
  } else {
    storage.removeItem(key);
  }
}

function hasMeaningfulDraft(value: InquiryFormValue) {
  return [
    value.companyName,
    value.contactName,
    value.workEmail,
    value.promotedOffering,
    value.details,
  ].some((item) => item.trim().length > 0);
}
