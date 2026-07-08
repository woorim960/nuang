import {
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  FileText,
  Flag,
  LockKeyhole,
  Route,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { moderationQueueReadinessItems } from "@/features/community/moderation-queue-contract";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "관리자 | NUANG",
};

const launchSummary = [
  {
    label: "사전 QA",
    value: "통과",
  },
  {
    label: "화면 경로 QA",
    value: "주요 경로 통과",
  },
  {
    label: "계정 서버",
    value: "연결 대기",
  },
  {
    label: "공개 출시",
    value: "NO-GO",
  },
] as const;

const qaGroups = [
  {
    icon: <CheckCircle2 size={20} />,
    items: [
      "빠른·정밀 코어 로컬 검사",
      "결과 리포트 action deck",
      "성향지도와 5탭 shell",
      "커뮤니티 읽기 전용 피드",
      "도움 연결 허브",
    ],
    note: "서버 전송 없이 모바일 기본 점검까지 통과",
    title: "검증된 로컬 MVP",
    tone: "success" as const,
  },
  {
    icon: <Route size={20} />,
    items: [
      "/home, /assessments, /map",
      "/together, /my, /help",
      "로컬 결과 리포트",
      "비교 미리보기와 접근 불가 화면",
      "공유·공개 프로필 준비 화면",
    ],
    note: "가로 넘침, 실행 오류, 깨진 이미지 없음",
    title: "화면 경로 QA",
    tone: "success" as const,
  },
  {
    icon: <CircleDashed size={20} />,
    items: [
      "Google·Kakao 로그인 연결",
      "계정 서버 주소와 공개 키",
      "서버 데이터베이스 연결값",
      "데이터 구조 실제 적용",
      "Naver는 MVP 1차 보류 권장",
    ],
    note: "실제 계정·공유·비교 기능을 열 때 필요",
    title: "연결 정보 대기",
    tone: "caution" as const,
  },
  {
    icon: <LockKeyhole size={20} />,
    items: [
      "문항 최종 공개 승인",
      "약관·개인정보 최종 승인",
      "공유 링크 검색 차단·만료·철회 검증",
      "결제·환불 정책",
      "접근성·운영 QA",
    ],
    note: "MVP 공개 전 waive 불가",
    title: "출시 차단 게이트",
    tone: "neutral" as const,
  },
];

const policyGateCards = [
  {
    href: "/policies/terms",
    note: "계정 저장, 공유 링크, 공개 비교, 커뮤니티 글쓰기 조건을 최종 검토해야 합니다.",
    title: "이용약관",
  },
  {
    href: "/policies/privacy",
    note: "직접 응답, 원점수, 민감 주제, 도움 허브 맥락의 처리 기준을 최종 검토해야 합니다.",
    title: "개인정보 처리방침",
  },
] as const;

const openingOrder = [
  "Google/Kakao 로그인 연결",
  "결과 계정 저장",
  "공유 링크 생성·철회",
  "공개 프로필 코드와 공개 비교",
  "커뮤니티 글쓰기와 운영 검토",
] as const;

export default function AdminPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[960px] px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">관리자</h1>
          <p className="mt-1 text-sm text-muted">
            직접 응답 조회 없이 QA 게이트와 운영 준비 상태만 봅니다.
          </p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-surface-soft text-primary">
          <ShieldCheck size={22} />
        </div>
      </header>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="caution">NO-GO</StatusPill>
          <StatusPill tone="neutral">내부 QA</StatusPill>
        </div>
        <h2 className="mt-3 text-lg font-bold">공개 MVP는 아직 열지 않습니다</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          로컬 핵심 경험과 주요 화면 경로 QA는 통과했지만, 실제 계정 저장,
          공유 링크, 공개 비교 기능, 법률·개인정보·문항 최종 승인 게이트가
          남아 있어 공개 출시는 차단 상태입니다.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {launchSummary.map((item) => (
            <div className="rounded-lg bg-surface-soft p-3" key={item.label}>
              <p className="text-xs font-bold text-muted">{item.label}</p>
              <p className="mt-1 text-sm font-black">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="정책 문서 준비 상태"
        className="mt-6 rounded-lg border border-line bg-white p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="caution">NO-GO</StatusPill>
              <StatusPill tone="neutral">준비 문서</StatusPill>
            </div>
            <h2 className="mt-3 text-lg font-bold">정책 문서가 아직 최종본이 아닙니다</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              계정 저장, 공유, 공개 비교를 열기 전에는 약관과 개인정보 처리방침을
              승인된 최종 문서로 교체해야 합니다.
            </p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <FileText aria-hidden="true" size={22} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {policyGateCards.map((card) => (
            <Link
              className="block rounded-lg bg-surface-soft p-3"
              href={card.href}
              key={card.href}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black">{card.title}</p>
                <StatusPill tone="caution">공개 전 승인 필요</StatusPill>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-muted">
                {card.note}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-label="MVP 출시 준비 상태"
        className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        {qaGroups.map((group) => (
          <article className="rounded-lg border border-line bg-white p-4" key={group.title}>
            <div className="flex items-center justify-between gap-3">
              <StatusPill tone={group.tone}>{group.title}</StatusPill>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-soft text-primary">
                {group.icon}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{group.note}</p>
            <ul className="mt-4 grid gap-2">
              {group.items.map((item) => (
                <li
                  className="rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="primary">권장 오픈 순서</StatusPill>
              <StatusPill tone="caution">연결 이후</StatusPill>
            </div>
            <h2 className="mt-3 text-lg font-bold">작게 열고 검증합니다</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              계정 서버 연결 정보가 준비되더라도 모든 서버 기능을 한 번에 열지
              않고, 저장과 공유처럼 위험도가 낮은 흐름부터 순서대로 검증합니다.
            </p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <Flag aria-hidden="true" size={22} />
          </div>
        </div>
        <ol className="mt-4 grid gap-2 md:grid-cols-5">
          {openingOrder.map((item, index) => (
            <li className="rounded-lg bg-surface-soft p-3" key={item}>
              <p className="text-xs font-black text-primary">{index + 1}</p>
              <p className="mt-1 text-sm font-bold">{item}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="caution">운영 큐 준비</StatusPill>
              <StatusPill tone="neutral">직접 응답 미조회</StatusPill>
            </div>
            <h2 className="mt-3 text-lg font-bold">커뮤니티 moderation 큐</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              신고가 들어와도 관리자 화면은 큐 상태, 사유, 심각도, 조치 기록만
              다루고 직접 문항 응답과 원점수는 보여주지 않습니다.
            </p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <ClipboardList aria-hidden="true" size={22} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {moderationQueueReadinessItems.map((item) => (
            <div className="rounded-lg bg-surface-soft p-3" key={item.label}>
              <p className="text-sm font-bold">{item.label}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{item.status}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
