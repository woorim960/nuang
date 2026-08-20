"use client";

import {
  BadgeCheck,
  Check,
  LockKeyhole,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  type PrivateContactPayload,
  privateContactConsentVersion,
  privateEmailRegistrationVersion,
} from "@/features/account/private-contact-contract";
import { readJsonResponse } from "@/features/account/response-json";
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
  const canSavePhone = digits.length === 11 && state !== "saving";
  const canSaveEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && state !== "saving";

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
              source: "account_security",
            }
          : {
              consentVersion: privateContactConsentVersion,
              mobilePhone,
              source: "account_security",
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
    setVerificationChallengeId("");
    setVerificationCode("");
    setVerificationMessage("");
    setVerificationState(
      payload.contact.emailStatus === "verified" ? "verified" : "idle",
    );
    setEditingField(null);
    setMessage(
      field === "email"
        ? "이메일을 저장했어요. 인증을 마치면 복구에 사용할 수 있어요."
        : "휴대전화번호를 안전하게 저장했어요.",
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
      const terminalFailure =
        payload?.ok === false &&
        (payload.code === "verification_expired" ||
          payload.code === "verification_locked" ||
          payload.code === "verified_identifier_conflict");
      setVerificationMessage(
        payload?.ok === false && payload.message
          ? payload.message
          : "인증번호를 확인하지 못했어요.",
      );
      if (terminalFailure) {
        setVerificationChallengeId("");
        setVerificationCode("");
      }
      setVerificationState(terminalFailure ? "error" : "code");
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
        <div>
          <p>RECOVERY CONTACT</p>
          <strong id="private-contact-title">복구 연락처</strong>
        </div>
        <span>
          <LockKeyhole aria-hidden="true" size={14} />
          비공개
        </span>
      </div>
      <p className={styles.headingCopy}>
        이전 저장된 데이터를 복구할 수 있어요.
      </p>

      {state === "loading" ? (
        <div aria-live="polite" className={styles.loading} role="status">
          복구 연락처를 확인하는 중
        </div>
      ) : (
        <>
          <div className={styles.fields}>
            <article className={styles.fieldBlock}>
              <div className={styles.fieldTitle}>
                <span aria-hidden="true">
                  <Mail size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>복구용 이메일</strong>
                  <small>인증 후 이전 기록 찾기와 계정 복구에 사용</small>
                </div>
                <i>선택</i>
              </div>
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
                      <span>
                        <strong>인증 완료</strong>
                        <small>계정 복구에 사용할 수 있어요</small>
                      </span>
                    </div>
                  ) : (
                    <div
                      className={styles.verificationStatus}
                      data-verified="false"
                    >
                      <span>
                        <strong>인증이 필요해요</strong>
                        <small>메일로 받은 6자리 번호를 확인해 주세요</small>
                      </span>
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
                            : "이메일 인증"}
                      </button>
                    </div>
                  )}
                  {contact.emailStatus !== "verified" &&
                  (verificationState === "code" ||
                    verificationState === "confirming" ||
                    Boolean(verificationChallengeId)) ? (
                    <div
                      aria-labelledby="email-verification-title"
                      className={styles.verificationPanel}
                    >
                      <div className={styles.verificationHeading}>
                        <MailCheck aria-hidden="true" size={18} />
                        <span>
                          <strong id="email-verification-title">
                            인증번호를 입력해 주세요
                          </strong>
                          <small>메일로 보낸 6자리 번호예요</small>
                        </span>
                      </div>
                      <label>
                        <span className="sr-only">인증번호</span>
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
                          placeholder="000000"
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
                          : "확인"}
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
                      role={verificationState === "error" ? "alert" : "status"}
                    >
                      {verificationMessage}
                    </p>
                  ) : null}
                  <div className={styles.destructiveActions}>
                    <button
                      className={styles.deleteLink}
                      onClick={() => openDelete("email")}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={14} strokeWidth={1.7} />
                      이메일 삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.editor}>
                  <label>
                    <span>이메일</span>
                    <input
                      aria-describedby="recovery-email-help"
                      aria-label="복구용 이메일"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      value={email}
                    />
                  </label>
                  <p id="recovery-email-help">
                    저장 후 인증 메일을 보내드려요.
                  </p>
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
                        : contact?.hasEmail
                          ? "변경 저장"
                          : "이메일 등록"}
                    </button>
                  </div>
                </div>
              )}
            </article>

            <article className={styles.fieldBlock}>
              <div className={styles.fieldTitle}>
                <span aria-hidden="true">
                  <Phone size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>복구용 휴대전화</strong>
                  <small>SMS 인증 기능이 준비되면 복구 수단으로 사용</small>
                </div>
                <i>선택</i>
              </div>
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
                  <div
                    className={styles.phonePendingStatus}
                    data-verified={contact.mobilePhoneStatus === "verified"}
                  >
                    {contact.mobilePhoneStatus === "verified" ? (
                      <BadgeCheck aria-hidden="true" size={17} />
                    ) : (
                      <ShieldCheck aria-hidden="true" size={17} />
                    )}
                    <span>
                      <strong>
                        {contact.mobilePhoneStatus === "verified"
                          ? "인증 완료"
                          : "안전하게 보관 중"}
                      </strong>
                      <small>
                        {contact.mobilePhoneStatus === "verified"
                          ? "계정 복구에 사용할 수 있어요"
                          : "현재는 이벤트 안내용이며, 본인 인증에는 사용하지 않아요"}
                      </small>
                    </span>
                  </div>
                  <div className={styles.destructiveActions}>
                    <button
                      className={styles.deleteLink}
                      onClick={() => openDelete("mobile_phone")}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={14} strokeWidth={1.7} />
                      번호 삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.editor}>
                  <label>
                    <span>휴대전화번호</span>
                    <div className={styles.phoneInput}>
                      <span aria-hidden="true">+82</span>
                      <input
                        aria-describedby="recovery-phone-help"
                        aria-label="복구용 휴대전화번호"
                        autoComplete="tel-national"
                        inputMode="tel"
                        maxLength={13}
                        onChange={(event) =>
                          setMobilePhone(formatKoreanMobile(event.target.value))
                        }
                        placeholder="010-0000-0000"
                        type="tel"
                        value={mobilePhone}
                      />
                    </div>
                  </label>
                  <p id="recovery-phone-help">
                    SMS 인증 도입 전에는 동일 사용자 확인이나 계정 복구에
                    사용하지 않아요.
                  </p>
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
                        : contact?.hasMobilePhone
                          ? "변경 저장"
                          : "번호 등록"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          </div>
        </>
      )}

      {message ? (
        <p
          aria-live="polite"
          className={styles.message}
          data-error={state === "error"}
          role={state === "error" ? "alert" : "status"}
        >
          {state === "success" ? (
            <Check aria-hidden="true" size={15} strokeWidth={2} />
          ) : null}
          {message}
        </p>
      ) : null}

      {deleteConfirmOpen && deleteField ? (
        <BottomSheet
          backdropDisabled
          backdropLabel="연락처 삭제 확인 창"
          className={styles.dialog}
          dialogProps={{ "aria-labelledby": deleteTitleId }}
          onClose={closeDeleteConfirm}
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
        </BottomSheet>
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
