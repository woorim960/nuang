"use client";

import { Check, Clock3, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdvertisingPublicHeader } from "./AdvertisingPublicHeader";
import styles from "./AdvertisingInquiryComplete.module.css";

const completionKey = "nuang:advertising-inquiry:completion.v1";

export function AdvertisingInquiryComplete({
  publicReference,
}: {
  publicReference: string;
}) {
  const [maskedEmail, setMaskedEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.sessionStorage.getItem(completionKey);
        if (!raw) return;
        const stored = JSON.parse(raw) as {
          maskedEmail?: string;
          publicReference?: string;
        };
        if (
          stored.publicReference === publicReference &&
          typeof stored.maskedEmail === "string"
        ) {
          setMaskedEmail(stored.maskedEmail);
        }
      } catch {
        window.sessionStorage.removeItem(completionKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [publicReference]);

  return (
    <main className={styles.page}>
      <AdvertisingPublicHeader />
      <section className={styles.complete}>
        <span className={styles.check}>
          <Check aria-hidden="true" size={32} strokeWidth={1.8} />
        </span>
        <p className={styles.eyebrow}>INQUIRY RECEIVED</p>
        <h1>문의가 접수됐습니다.</h1>
        <p className={styles.description}>
          내용을 차분히 검토한 뒤 영업일 기준 1~2일 안에 연락드릴게요.
        </p>

        <dl className={styles.receipt}>
          <div>
            <dt>접수번호</dt>
            <dd>{publicReference || "접수 완료"}</dd>
          </div>
          {maskedEmail ? (
            <div>
              <dt>확인 메일</dt>
              <dd>{maskedEmail}</dd>
            </div>
          ) : null}
        </dl>

        <div className={styles.nextSteps}>
          <article>
            <Mail aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <strong>접수 확인</strong>
              <p>입력한 업무 이메일로 접수 내용을 안내합니다.</p>
            </div>
          </article>
          <article>
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <strong>서비스 적합성 검토</strong>
              <p>제품과 소재가 뉴앙의 브랜드 안전 기준에 맞는지 확인합니다.</p>
            </div>
          </article>
          <article>
            <Clock3 aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <strong>담당자 연락</strong>
              <p>가능한 상품과 다음 단계를 업무 이메일로 제안합니다.</p>
            </div>
          </article>
        </div>

        <div className={styles.actions}>
          <Link href="/advertise">광고·제휴 안내로 돌아가기</Link>
          <Link href="/home">뉴앙 둘러보기</Link>
        </div>

        <p className={styles.note}>
          접수 확인 메일이 바로 오지 않더라도 문의는 정상 저장될 수 있어요.
          영업일 기준 2일이 지나도 연락이 없다면 접수번호를 함께 알려주세요.
        </p>
      </section>
    </main>
  );
}
