"use client";

import { BadgeCheck, Check, MailCheck, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  type PrivateContactPayload,
  privateContactConsentVersion,
  privateContactMarketingConsentVersion,
  privateEmailRegistrationVersion,
} from "@/features/account/private-contact-contract";
import { readJsonResponse } from "@/features/account/response-json";
import { useModalDialog } from "@/hooks/useModalDialog";
import styles from "./PrivateContactEditor.module.css";

type ContactField = "email" | "mobile_phone";
type ContactResponse =
  | { contact: PrivateContactPayload; ok: true }
  | { code?: string; message?: string; ok: false };
type VerificationRequestResponse =
  | {
      ok: true;
      verification: {
        challengeId: string;
        emailMasked: string;
        expiresAt: string;
        resendAfterSeconds: number;
      };
    }
  | {
      code?: string;
      message?: string;
      ok: false;
      retryAfterSeconds?: number;
    };
type VerificationConfirmResponse =
  | {
      ok: true;
      verification: {
        emailStatus: "verified";
        verifiedAt: string;
      };
    }
  | {
      attemptsRemaining?: number;
      code?: string;
      message?: string;
      ok: false;
    };

export function PrivateContactEditor() {
  const [contact, setContact] = useState<PrivateContactPayload | null>(null);
  const [editingField, setEditingField] = useState<ContactField | null>(null);
  const [deleteField, setDeleteField] = useState<ContactField | null>(null);
  const [email, setEmail] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [verificationChallengeId, setVerificationChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationResendIn, setVerificationResendIn] = useState(0);
  const [verificationState, setVerificationState] = useState<
    "code" | "confirming" | "error" | "idle" | "requesting" | "verified"
  >("idle");
  const [state, setState] = useState<
    "deleting" | "error" | "idle" | "loading" | "saving" | "success"
  >("loading");
  const [message, setMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeEntryWarning, setActiveEntryWarning] = useState(false);
  const deleteTitleId = useId();
  const deleteDialogRef = useModalDialog<HTMLElement>({
    onClose: closeDeleteConfirm,
    open: deleteConfirmOpen && Boolean(deleteField),
  });

  useEffect(() => {
    let active = true;
    void fetch("/api/me/contact", { cache: "no-store" })
      .then(async (response) => ({
        payload: await readJsonResponse<ContactResponse>(response),
        response,
      }))
      .then(({ payload, response }) => {
        if (!active) return;
        if (!response.ok || !payload || payload.ok !== true) {
          setMessage(
            payload?.ok === false && payload.message
              ? payload.message
              : "비공개 정보를 불러오지 못했어요.",
          );
          setState("error");
          return;
        }
        setContact(payload.contact);
        setMarketingOptIn(payload.contact.marketingOptIn);
        if (payload.contact.emailStatus === "verified") {
          setVerificationState("verified");
        }
        setState("idle");
      })
      .catch(() => {
        if (!active) return;
        setMessage("비공개 정보를 불러오지 못했어요.");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (verificationResendIn <= 0) return;
    const timer = window.setInterval(() => {
      setVerificationResendIn((value) => Math.max(0, value - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [verificationResendIn]);

  const digits = mobilePhone.replace(/\D/g, "");
  const canSavePhone =
    digits.length === 11 && state !== "saving" && !marketingSaving;
  const canSaveEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    state !== "saving" &&
    !marketingSaving;

  async function saveContact(field: ContactField) {
    if (
      (field === "email" && !canSaveEmail) ||
      (field === "mobile_phone" && !canSavePhone)
    ) {
      return;
    }

    setEditingField(field);
    setState("saving");
    setMessage("");
    const response = await fetch("/api/me/contact", {
      body: JSON.stringify(
        field === "email"
          ? {
              consentVersion: privateEmailRegistrationVersion,
              email,
              source: "profile",
            }
          : {
              consentVersion: privateContactConsentVersion,
              mobilePhone,
              source: "profile",
            },
      ),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    const payload = await readJsonResponse<ContactResponse>(response);

    if (!response.ok || !payload || payload.ok !== true) {
      setMessage(
        payload?.ok === false && payload.message
          ? payload.message
          : "비공개 정보를 저장하지 못했어요.",
      );
      setState("error");
      return;
    }

    setContact(payload.contact);
    setEmail("");
    setMobilePhone("");
    setMarketingOptIn(payload.contact.marketingOptIn);
    setVerificationChallengeId("");
    setVerificationCode("");
    setVerificationMessage("");
    setVerificationState(
      payload.contact.emailStatus === "verified" ? "verified" : "idle",
    );
    setEditingField(null);
    setMessage(
      field === "email"
        ? "이메일을 비공개로 저장했어요."
        : "휴대전화번호를 비공개로 저장했어요.",
    );
    setState("success");
  }

  async function requestEmailVerification() {
    setVerificationState("requesting");
    setVerificationMessage("");
    const response = await fetch("/api/me/contact/email-verification/request", {
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload =
      await readJsonResponse<VerificationRequestResponse>(response);

    if (!response.ok || !payload || payload.ok !== true) {
      if (
        payload?.ok === false &&
        typeof payload.retryAfterSeconds === "number"
      ) {
        setVerificationResendIn(payload.retryAfterSeconds);
      }
      setVerificationMessage(
        payload?.ok === false && payload.message
          ? payload.message
          : "인증 메일을 보내지 못했어요.",
      );
      setVerificationState("error");
      return;
    }

    setVerificationChallengeId(payload.verification.challengeId);
    setVerificationCode("");
    setVerificationMessage(
      `${payload.verification.emailMasked}으로 인증번호를 보냈어요.`,
    );
    setVerificationResendIn(payload.verification.resendAfterSeconds);
    setVerificationState("code");
  }

  async function confirmEmailVerification() {
    if (
      !verificationChallengeId ||
      !/^\d{6}$/.test(verificationCode) ||
      verificationState === "confirming"
    ) {
      return;
    }

    setVerificationState("confirming");
    setVerificationMessage("");
    const response = await fetch("/api/me/contact/email-verification/confirm", {
      body: JSON.stringify({
        challengeId: verificationChallengeId,
        code: verificationCode,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload =
      await readJsonResponse<VerificationConfirmResponse>(response);

    if (!response.ok || !payload || payload.ok !== true) {
      setVerificationMessage(
        payload?.ok === false && payload.message
          ? payload.message
          : "인증번호를 확인하지 못했어요.",
      );
      setVerificationState(
        payload?.ok === false &&
          (payload.code === "verification_expired" ||
            payload.code === "verification_locked")
          ? "error"
          : "code",
      );
      return;
    }

    setContact((current) =>
      current
        ? {
            ...current,
            emailStatus: "verified",
            emailVerifiedAt: payload.verification.verifiedAt,
          }
        : current,
    );
    setVerificationCode("");
    setVerificationMessage("이메일 인증이 완료됐어요.");
    setVerificationState("verified");
  }

  async function saveMarketingPreference(nextValue: boolean) {
    const previousValue = marketingOptIn;
    setMarketingOptIn(nextValue);
    setMarketingSaving(true);
    setMessage("");

    const response = await fetch("/api/me/contact", {
      body: JSON.stringify({
        consentVersion: privateContactMarketingConsentVersion,
        marketingOptIn: nextValue,
        preference: "marketing",
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    const payload = await readJsonResponse<ContactResponse>(response);

    if (!response.ok || !payload || payload.ok !== true) {
      setMarketingOptIn(previousValue);
      setMessage(
        payload?.ok === false && payload.message
          ? payload.message
          : "광고성 소식 설정을 저장하지 못했어요.",
      );
      setState("error");
      setMarketingSaving(false);
      return;
    }

    setContact(payload.contact);
    setMarketingOptIn(payload.contact.marketingOptIn);
    setMessage(
      payload.contact.marketingOptIn
        ? "광고성 소식을 받도록 설정했어요."
        : "광고성 소식을 받지 않도록 설정했어요.",
    );
    setState("success");
    setMarketingSaving(false);
  }

  async function deleteContact(cancelActiveEntries: boolean) {
    if (!deleteField) return;

    setState("deleting");
    setMessage("");
    const response = await fetch("/api/me/contact", {
      body: JSON.stringify({
        cancelActiveEntries,
        field: deleteField,
      }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
    const payload = await readJsonResponse<ContactResponse>(response);

    if (
      response.status === 409 &&
      payload?.ok === false &&
      payload.code === "active_event_entry_exists"
    ) {
      setActiveEntryWarning(true);
      setDeleteConfirmOpen(true);
      setState("idle");
      return;
    }
    if (!response.ok || !payload || payload.ok !== true) {
      setMessage(
        payload?.ok === false && payload.message
          ? payload.message
          : "비공개 정보를 삭제하지 못했어요.",
      );
      setState("error");
      return;
    }

    const deletedField = deleteField;
    setContact(payload.contact);
    setDeleteConfirmOpen(false);
    setActiveEntryWarning(false);
    setDeleteField(null);
    setEditingField(null);
    if (deletedField === "email") {
      setVerificationChallengeId("");
      setVerificationCode("");
      setVerificationMessage("");
      setVerificationState("idle");
    }
    setMessage(
      cancelActiveEntries
        ? "휴대전화번호와 진행 중인 이벤트 응모를 삭제했어요."
        : deletedField === "email"
          ? "이메일을 삭제했어요."
          : "휴대전화번호를 삭제했어요.",
    );
    setState("success");
  }

  function cancelEditing() {
    setEditingField(null);
    setEmail("");
    setMobilePhone("");
    setMessage("");
    setState("idle");
  }

  function openDelete(field: ContactField) {
    setDeleteField(field);
    setActiveEntryWarning(false);
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    if (state === "deleting") return;
    setDeleteConfirmOpen(false);
    setActiveEntryWarning(false);
    setDeleteField(null);
  }

  return (
    <section aria-labelledby="private-contact-title" className={styles.section}>
      <div className={styles.heading}>
        <strong id="private-contact-title">비공개 정보</strong>
        <span>나만 확인할 수 있어요</span>
      </div>

      {state === "loading" ? (
        <div aria-live="polite" className={styles.loading} role="status">
          비공개 정보를 불러오는 중
        </div>
      ) : (
        <>
          <div className={styles.fields}>
            <div className={styles.fieldBlock}>
              <span className={styles.fieldHeading}>이메일</span>
              {contact?.hasEmail && editingField !== "email" ? (
                <>
                  <div className={styles.contactRow}>
                    <strong>{contact.emailMasked}</strong>
                    <button
                      onClick={() => {
                        setEditingField("email");
                        setMessage("");
                      }}
                      type="button"
                    >
                      변경
                    </button>
                  </div>
                  {contact.emailStatus === "verified" ? (
                    <div
                      className={styles.verificationStatus}
                      data-verified="true"
                    >
                      <BadgeCheck
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.8}
                      />
                      인증 완료
                    </div>
                  ) : (
                    <div className={styles.verificationStatus}>
                      <span>인증이 필요해요</span>
                      <button
                        disabled={verificationState === "requesting"}
                        onClick={() => void requestEmailVerification()}
                        type="button"
                      >
                        <MailCheck
                          aria-hidden="true"
                          size={15}
                          strokeWidth={1.8}
                        />
                        {verificationState === "requesting"
                          ? "보내는 중"
                          : verificationChallengeId
                            ? "다시 받기"
                            : "인증하기"}
                      </button>
                    </div>
                  )}
                  {contact.emailStatus !== "verified" &&
                  (verificationState === "code" ||
                    verificationState === "confirming" ||
                    Boolean(verificationChallengeId)) ? (
                    <div className={styles.verificationPanel}>
                      <label>
                        <span>인증번호</span>
                        <input
                          aria-label="이메일 인증번호"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          maxLength={6}
                          onChange={(event) =>
                            setVerificationCode(
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="6자리 숫자"
                          type="text"
                          value={verificationCode}
                        />
                      </label>
                      <button
                        className={styles.confirmButton}
                        disabled={
                          verificationCode.length !== 6 ||
                          verificationState === "confirming"
                        }
                        onClick={() => void confirmEmailVerification()}
                        type="button"
                      >
                        {verificationState === "confirming"
                          ? "확인 중"
                          : "인증 확인"}
                      </button>
                      <button
                        className={styles.resendButton}
                        disabled={
                          verificationResendIn > 0 ||
                          verificationState === "requesting"
                        }
                        onClick={() => void requestEmailVerification()}
                        type="button"
                      >
                        {verificationResendIn > 0
                          ? `${verificationResendIn}초 후 다시 받기`
                          : "인증번호 다시 받기"}
                      </button>
                    </div>
                  ) : null}
                  {verificationMessage ? (
                    <p
                      aria-live="polite"
                      className={styles.verificationMessage}
                      data-error={verificationState === "error"}
                    >
                      {verificationMessage}
                    </p>
                  ) : null}
                  <button
                    className={styles.deleteLink}
                    onClick={() => openDelete("email")}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} strokeWidth={1.7} />
                    이메일 삭제
                  </button>
                </>
              ) : (
                <div className={styles.editor}>
                  <input
                    aria-label="이메일"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                  />
                  <div className={styles.actions}>
                    {contact?.hasEmail ? (
                      <button
                        className={styles.secondaryButton}
                        onClick={cancelEditing}
                        type="button"
                      >
                        취소
                      </button>
                    ) : null}
                    <button
                      className={styles.primaryButton}
                      disabled={!canSaveEmail}
                      onClick={() => saveContact("email")}
                      type="button"
                    >
                      {state === "saving" && editingField === "email"
                        ? "저장 중"
                        : "이메일 저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldHeading}>휴대전화번호</span>
              {contact?.hasMobilePhone && editingField !== "mobile_phone" ? (
                <>
                  <div className={styles.contactRow}>
                    <strong>{contact.mobilePhoneMasked}</strong>
                    <button
                      onClick={() => {
                        setEditingField("mobile_phone");
                        setMessage("");
                      }}
                      type="button"
                    >
                      변경
                    </button>
                  </div>
                  <button
                    className={styles.deleteLink}
                    onClick={() => openDelete("mobile_phone")}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} strokeWidth={1.7} />
                    번호 삭제
                  </button>
                </>
              ) : (
                <div className={styles.editor}>
                  <input
                    aria-label="휴대전화번호"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={13}
                    onChange={(event) =>
                      setMobilePhone(formatKoreanMobile(event.target.value))
                    }
                    placeholder="010-0000-0000"
                    type="tel"
                    value={mobilePhone}
                  />
                  <div className={styles.actions}>
                    {contact?.hasMobilePhone ? (
                      <button
                        className={styles.secondaryButton}
                        onClick={cancelEditing}
                        type="button"
                      >
                        취소
                      </button>
                    ) : null}
                    <button
                      className={styles.primaryButton}
                      disabled={!canSavePhone}
                      onClick={() => saveContact("mobile_phone")}
                      type="button"
                    >
                      {state === "saving" && editingField === "mobile_phone"
                        ? "저장 중"
                        : "번호 저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className={styles.contactHelp}>
            외부에 공개되지 않으며 계정과 중요한 안내에만 사용합니다.
          </p>
          <label className={styles.marketing}>
            <input
              checked={marketingOptIn}
              disabled={marketingSaving || state === "saving"}
              onChange={(event) =>
                void saveMarketingPreference(event.target.checked)
              }
              type="checkbox"
            />
            <span>
              광고성 소식 받기
              <small>
                {marketingSaving
                  ? "저장 중"
                  : marketingOptIn
                    ? "수신 중"
                    : "수신 안 함"}
              </small>
            </span>
          </label>
        </>
      )}

      {message ? (
        <p
          aria-live="polite"
          className={styles.message}
          data-error={state === "error"}
        >
          {state === "success" ? (
            <Check aria-hidden="true" size={15} strokeWidth={2} />
          ) : null}
          {message}
        </p>
      ) : null}

      {deleteConfirmOpen && deleteField ? (
        <div className={styles.backdrop} data-modal-layer="true">
          <section
            aria-labelledby={deleteTitleId}
            aria-modal="true"
            className={styles.dialog}
            ref={deleteDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <strong id={deleteTitleId}>
              {activeEntryWarning
                ? "연락처와 이벤트 응모를 함께 삭제할까요?"
                : deleteField === "email"
                  ? "이메일을 삭제할까요?"
                  : "휴대전화번호를 삭제할까요?"}
            </strong>
            <p>
              {activeEntryWarning
                ? "번호를 삭제하면 참여 중인 이벤트의 당첨 안내를 받을 수 없어 응모도 함께 취소됩니다."
                : deleteField === "email"
                  ? "필요할 때 언제든 새 이메일을 다시 등록할 수 있어요."
                  : "삭제한 뒤 이벤트에 응모하려면 번호를 다시 등록해야 해요."}
            </p>
            <div>
              <button
                data-modal-initial-focus="true"
                onClick={closeDeleteConfirm}
                type="button"
              >
                유지하기
              </button>
              <button
                disabled={state === "deleting"}
                onClick={() => deleteContact(activeEntryWarning)}
                type="button"
              >
                {state === "deleting" ? "삭제 중" : "삭제하기"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function formatKoreanMobile(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
