"use client";

import {
  CalendarDays,
  Check,
  ChevronRight,
  Gift,
  LockKeyhole,
  TicketCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  AccountEventEntryStatus,
  AccountEventHistoryPayload,
} from "@/features/account/account-event-contract";
import styles from "./AccountEventHistory.module.css";

const statusCopy: Record<
  AccountEventEntryStatus,
  { label: string; message: string; tone: string }
> = {
  contacted: {
    label: "안내 완료",
    message: "등록된 번호로 당첨 안내를 보냈어요.",
    tone: "success",
  },
  entered: {
    label: "응모 완료",
    message: "추첨 결과는 발표일에 이 화면에서 확인할 수 있어요.",
    tone: "active",
  },
  invalid: {
    label: "응모 제외",
    message: "참여 조건을 확인하지 못해 추첨 대상에서 제외됐어요.",
    tone: "muted",
  },
  not_selected: {
    label: "추첨 완료",
    message: "이번에는 당첨되지 않았어요. 참여해 주셔서 감사해요.",
    tone: "muted",
  },
  winner: {
    label: "당첨",
    message: "축하해요. 등록된 번호로 당첨 안내를 보내드릴게요.",
    tone: "success",
  },
  withdrawn: {
    label: "응모 취소",
    message: "이 이벤트의 응모를 취소했어요.",
    tone: "muted",
  },
};

export function AccountEventHistory() {
  const [payload, setPayload] = useState<AccountEventHistoryPayload | null>(
    null,
  );
  const [state, setState] = useState<
    "error" | "idle" | "loading" | "withdrawing"
  >("loading");
  const [message, setMessage] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/me/events", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | AccountEventHistoryPayload
          | null;
        if (!active) return;
        if (!response.ok || !body?.ok) {
          setMessage("참여한 이벤트를 불러오지 못했어요.");
          setState("error");
          return;
        }
        setPayload(body);
        setState("idle");
      })
      .catch(() => {
        if (!active) return;
        setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
        setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  async function withdraw(entryId: string) {
    if (state === "withdrawing") return;
    setState("withdrawing");
    setMessage("");

    const response = await fetch(`/api/me/events/${entryId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage("응모를 취소하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      setState("error");
      return;
    }

    setPayload((current) =>
      current
        ? {
            ...current,
            events: current.events.map((event) =>
              event.id === entryId
                ? { ...event, canWithdraw: false, status: "withdrawn" }
                : event,
            ),
          }
        : current,
    );
    setConfirmId(null);
    setMessage("이벤트 응모를 취소했어요.");
    setState("idle");
  }

  if (state === "loading") {
    return (
      <div aria-live="polite" className={styles.loading} role="status">
        <span />
        참여한 이벤트를 불러오는 중
      </div>
    );
  }

  return (
    <>
      <section className={styles.contactStrip}>
        <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.7} />
        <div>
          <strong>당첨 안내 연락처</strong>
          <span>
            {payload?.contact.hasMobilePhone
              ? payload.contact.mobilePhoneMasked
              : "등록된 번호가 없어요"}
          </span>
        </div>
        <Link href="/my/profile/edit">
          {payload?.contact.hasMobilePhone ? "변경" : "등록"}
        </Link>
      </section>

      {payload?.events.length ? (
        <section aria-label="참여한 이벤트" className={styles.list}>
          {payload.events.map((event) => {
            const copy = statusCopy[event.status];
            return (
              <article className={styles.event} key={event.id}>
                <div className={styles.eventHeading}>
                  <span>
                    <Gift aria-hidden="true" size={19} strokeWidth={1.7} />
                  </span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.prize}</p>
                  </div>
                  <em data-tone={copy.tone}>{copy.label}</em>
                </div>

                <p className={styles.statusMessage}>{copy.message}</p>
                <dl>
                  <div>
                    <dt>
                      <TicketCheck
                        aria-hidden="true"
                        size={15}
                        strokeWidth={1.7}
                      />
                      참여일
                    </dt>
                    <dd>{formatDate(event.enteredAt)}</dd>
                  </div>
                  {event.announcementLabel ? (
                    <div>
                      <dt>
                        <CalendarDays
                          aria-hidden="true"
                          size={15}
                          strokeWidth={1.7}
                        />
                        발표일
                      </dt>
                      <dd>{event.announcementLabel}</dd>
                    </div>
                  ) : null}
                </dl>

                {event.canWithdraw ? (
                  <button
                    className={styles.withdrawLink}
                    onClick={() => setConfirmId(event.id)}
                    type="button"
                  >
                    응모 취소
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className={styles.empty}>
          <span>
            <TicketCheck aria-hidden="true" size={23} strokeWidth={1.6} />
          </span>
          <strong>참여한 이벤트가 없어요</strong>
          <p>질문 검토에 참여하면 추첨 이벤트에도 응모할 수 있어요.</p>
          <Link href="/research">
            질문 검토 참여하기
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
          </Link>
        </section>
      )}

      {message ? (
        <p aria-live="polite" className={styles.message}>
          {state === "idle" ? (
            <Check aria-hidden="true" size={15} strokeWidth={2} />
          ) : null}
          {message}
        </p>
      ) : null}

      {confirmId ? (
        <div className={styles.backdrop}>
          <section aria-modal="true" className={styles.dialog} role="dialog">
            <strong>이벤트 응모를 취소할까요?</strong>
            <p>
              응모만 취소돼요. 프로필에 등록한 휴대전화번호는 그대로
              유지됩니다.
            </p>
            <div>
              <button onClick={() => setConfirmId(null)} type="button">
                계속 참여
              </button>
              <button
                disabled={state === "withdrawing"}
                onClick={() => withdraw(confirmId)}
                type="button"
              >
                {state === "withdrawing" ? "취소 중" : "응모 취소"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
