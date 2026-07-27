"use client";

import {
  CalendarClock,
  Check,
  Copy,
  Eye,
  Gift,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import styles from "./RewardOperationsDashboard.module.css";

type RewardAdminPayload = {
  campaign: {
    announcementLabel: string | null;
    prize: string;
    winnerCount: number;
  };
  counts: Record<string, number>;
  draw: {
    entrantCount: number;
    executedAt: string;
    id: string;
    selectionMethod: string;
    winnerCount: number;
  } | null;
  ok: true;
  winners: Array<{
    contact: {
      hasMobilePhone: boolean;
      mobilePhoneMasked: string | null;
    };
    enteredAt: string;
    id: string;
    status: string;
  }>;
};

export function RewardOperationsDashboard() {
  const [payload, setPayload] = useState<RewardAdminPayload | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [state, setState] = useState<"error" | "idle" | "loading" | "saving">(
    "loading",
  );
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const response = await fetch("/api/admin/research/gate-c/rewards", {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | RewardAdminPayload
      | null;
    if (!response.ok || !body?.ok) {
      setMessage("이벤트 운영 정보를 불러오지 못했습니다.");
      setState("error");
      return;
    }
    setPayload(body);
    setState("idle");
  }, []);

  useEffect(() => {
    let active = true;
    void readRewardPayload().then((result) => {
      if (!active) return;
      if (!result) {
        setMessage("이벤트 운영 정보를 불러오지 못했습니다.");
        setState("error");
        return;
      }
      setPayload(result);
      setState("idle");
    });
    return () => {
      active = false;
    };
  }, []);

  async function runAction(
    body:
      | { action: "draw" }
      | { action: "mark_contacted"; entryId: string }
      | { action: "reveal"; entryId: string },
  ) {
    setState("saving");
    setMessage("");
    const response = await fetch("/api/admin/research/gate-c/rewards", {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      mobilePhone?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !result?.ok) {
      const errorMessages: Record<string, string> = {
        reward_contact_status_failed: "연락 완료 상태를 저장하지 못했습니다.",
        reward_draw_failed: "추첨을 완료하지 못했습니다. 응모 데이터와 DB 함수를 확인해 주세요.",
        reward_draw_not_open: "추첨은 2026년 10월 1일에 실행할 수 있습니다.",
        reward_winner_not_found: "당첨자 정보를 찾지 못했습니다.",
        winner_contact_unavailable: "등록된 휴대전화 번호가 없어 연락처를 열 수 없습니다.",
      };
      setMessage(
        errorMessages[result?.error ?? ""] ?? "요청을 처리하지 못했습니다.",
      );
      setState("error");
      return;
    }
    if (body.action === "reveal" && result.mobilePhone) {
      const formattedPhone = formatPhone(result.mobilePhone);
      setRevealed((current) => ({
        ...current,
        [body.entryId]: formattedPhone,
      }));
      setState("idle");
      return;
    }
    await load();
  }

  if (state === "loading" && !payload) {
    return <p className={styles.loading}>운영 정보를 불러오는 중</p>;
  }

  return (
    <div className={styles.content}>
      <section className={styles.summary}>
        <div>
          <span>
            <Gift aria-hidden="true" size={20} strokeWidth={1.7} />
          </span>
          <div>
            <strong>뉴앙 질문 검토 이벤트</strong>
            <p>{payload?.campaign.prize}</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>유효 응모</dt>
            <dd>{payload?.counts.entered ?? 0}명</dd>
          </div>
          <div>
            <dt>당첨 예정</dt>
            <dd>{payload?.campaign.winnerCount ?? 10}명</dd>
          </div>
          <div>
            <dt>발표</dt>
            <dd>{payload?.campaign.announcementLabel ?? "미정"}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.draw}>
        <div>
          <ShieldCheck aria-hidden="true" size={19} strokeWidth={1.7} />
          <div>
            <strong>{payload?.draw ? "추첨 완료" : "추첨 대기"}</strong>
            <p>
              {payload?.draw
                ? `${payload.draw.entrantCount}명 중 ${payload.draw.winnerCount}명을 추첨했습니다.`
                : "추첨 전에는 누구의 전화번호도 볼 수 없습니다."}
            </p>
          </div>
        </div>
        {payload?.draw ? (
          <span>
            <CalendarClock aria-hidden="true" size={15} strokeWidth={1.7} />
            {new Date(payload.draw.executedAt).toLocaleString("ko-KR")}
          </span>
        ) : (
          <button
            disabled={state === "saving"}
            onClick={() => runAction({ action: "draw" })}
            type="button"
          >
            추첨 실행
          </button>
        )}
      </section>

      {payload?.draw ? (
        <section className={styles.winners}>
          <header>
            <div>
              <strong>당첨자 연락</strong>
              <p>번호 확인과 문자 발송은 당첨자에게만 진행합니다.</p>
            </div>
            <button aria-label="목록 새로고침" onClick={load} type="button">
              <RefreshCw aria-hidden="true" size={17} strokeWidth={1.7} />
            </button>
          </header>
          {payload.winners.map((winner, index) => (
            <article key={winner.id}>
              <span>{index + 1}</span>
              <div>
                <strong>
                  {revealed[winner.id] ??
                    winner.contact.mobilePhoneMasked ??
                    "연락처 없음"}
                </strong>
                <p>
                  {winner.status === "contacted"
                    ? "안내 완료"
                    : "문자 안내 대기"}
                </p>
              </div>
              {winner.status === "contacted" ? (
                <Check aria-label="안내 완료" size={18} strokeWidth={2} />
              ) : revealed[winner.id] ? (
                <div className={styles.winnerActions}>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        revealed[winner.id].replace(/\D/g, ""),
                      )
                    }
                    type="button"
                  >
                    <Copy aria-hidden="true" size={15} strokeWidth={1.7} />
                    복사
                  </button>
                  <button
                    onClick={() =>
                      runAction({
                        action: "mark_contacted",
                        entryId: winner.id,
                      })
                    }
                    type="button"
                  >
                    안내 완료
                  </button>
                </div>
              ) : (
                <button
                  className={styles.reveal}
                  disabled={!winner.contact.hasMobilePhone}
                  onClick={() =>
                    runAction({ action: "reveal", entryId: winner.id })
                  }
                  type="button"
                >
                  <Eye aria-hidden="true" size={16} strokeWidth={1.7} />
                  번호 보기
                </button>
              )}
            </article>
          ))}
          {payload.winners.length === 0 ? (
            <p className={styles.emptyWinners}>
              추첨 결과가 저장됐지만 표시할 당첨자가 없습니다.
            </p>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <p aria-live="polite" className={styles.message}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

async function readRewardPayload() {
  const response = await fetch("/api/admin/research/gate-c/rewards", {
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as
    | RewardAdminPayload
    | null;
  return response.ok && body?.ok ? body : null;
}
