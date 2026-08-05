"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import type { BalancePackCatalogItem } from "@/features/together-balance/types";
import styles from "./BalanceGameLanding.module.css";

const packShelfBySlug: Record<
  string,
  "popular" | "taste" | "relationship" | "fun"
> = {
  "forever-one": "fun",
  "funny-extreme": "fun",
  "ideal-person": "relationship",
  "mixed-taste": "popular",
  "what-to-do": "taste",
  "what-to-eat": "popular",
  "what-to-watch": "taste",
  "where-to-go": "popular",
};

const shelfOptions = [
  { id: "all", label: "전체" },
  { id: "popular", label: "지금 많이 하는" },
  { id: "taste", label: "취향" },
  { id: "relationship", label: "관계" },
  { id: "fun", label: "재미" },
] as const;

type ShelfId = (typeof shelfOptions)[number]["id"];

export function BalanceGameLanding({
  packs,
}: {
  packs: readonly BalancePackCatalogItem[];
}) {
  const [activeShelf, setActiveShelf] = useState<ShelfId>("all");
  const shownPacks = useMemo(
    () =>
      activeShelf === "all"
        ? packs
        : packs.filter(
          (pack) => packShelfBySlug[pack.slug] === activeShelf,
        ),
    [activeShelf, packs],
  );

  return (
    <CommunityScreenShell
      backHref="/home?view=together"
      backLabel="검사로 돌아가기"
      title="밸런스 게임"
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <p>2~8명이 함께</p>
          <h2>우리, 얼마나 비슷하게 고를까?</h2>
          <span>
            간단한 게임을 통해 서로의 궁합을 확인할 수 있어요!
          </span>
          <div className={styles.heroPair} aria-hidden="true">
            <span>산</span>
            <b>VS</b>
            <span>바다</span>
          </div>
        </section>

        <JoinByCode />

        <section className={styles.catalog}>
          <header>
            <div>
              <small>{getShelfEyebrow(activeShelf)}</small>
              <h2>{getShelfTitle(activeShelf)}</h2>
            </div>
            <span>{shownPacks.length}개 주제</span>
          </header>

          <nav aria-label="주제팩 분류" className={styles.shelves}>
            {shelfOptions.map((shelf) => (
              <button
                aria-pressed={activeShelf === shelf.id}
                key={shelf.id}
                onClick={() => setActiveShelf(shelf.id)}
                type="button"
              >
                {shelf.label}
              </button>
            ))}
          </nav>

          <div className={styles.packList}>
            {shownPacks.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        </section>

        <details className={styles.howItWorks}>
          <summary>
            <span>함께하는 방법</span>
            <small>방 만들기부터 결과까지</small>
          </summary>
          <ol>
            <li>
              <b>1</b>
              <span>
                <strong>방을 만들고 초대해요</strong>
                <em>인원은 방장 포함 2~8명</em>
              </span>
            </li>
            <li>
              <b>2</b>
              <span>
                <strong>둘 중 더 끌리는 쪽을 골라요</strong>
                <em>선택은 결과가 열릴 때까지 비공개</em>
              </span>
            </li>
            <li>
              <b>3</b>
              <span>
                <strong>둘과 그룹의 취향 궁합을 봐요</strong>
                <em>두 명만 완료해도 현재 결과 공개</em>
              </span>
            </li>
          </ol>
        </details>
      </div>
    </CommunityScreenShell>
  );
}

function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className={styles.codeJoin}
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length !== 6) return;
        router.push(
          `/assessments/together/balance-game/rooms/${encodeURIComponent(code)}`,
        );
      }}
    >
      <label htmlFor="balance-room-code">참여 코드가 있나요?</label>
      <div>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          id="balance-room-code"
          inputMode="text"
          maxLength={6}
          onChange={(event) =>
            setCode(
              event.target.value
                .toUpperCase()
                .replace(/[^2-9A-HJ-NP-Z]/g, "")
                .slice(0, 6),
            )
          }
          placeholder="6자리 코드"
          spellCheck={false}
          value={code}
        />
        <button disabled={code.length !== 6} type="submit">
          입장
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </form>
  );
}

function PackCard({
  pack,
}: {
  pack: BalancePackCatalogItem;
}) {
  const tone = getPackTone(pack.slug);

  return (
    <Link
      className={styles.packCard}
      data-tone={tone}
      href={`/assessments/together/balance-game/setup?pack=${encodeURIComponent(
        pack.slug,
      )}`}
    >
      <span className={styles.packTopline}>
        <small>{getTemplateLabel(pack)}</small>
        <em>
          {pack.defaultQuestionCount}문항 · 약{" "}
          {getEstimatedMinutes(pack.defaultQuestionCount)}분
        </em>
      </span>
      <strong>{pack.title}</strong>
      <p>{pack.description}</p>
      <span className={styles.samplePair}>
        <span>{pack.sampleOptions[0]}</span>
        <b>VS</b>
        <span>{pack.sampleOptions[1]}</span>
      </span>
      <span className={styles.packFooter}>
        <em>전체 {pack.totalQuestionCount}개 질문</em>
        <span>
          이 주제로 시작
          <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </span>
      </span>
    </Link>
  );
}

function getEstimatedMinutes(questionCount: number) {
  if (questionCount <= 8) return 1;
  if (questionCount <= 16) return 2;
  if (questionCount <= 20) return 3;
  return 4;
}

function getTemplateLabel(pack: BalancePackCatalogItem) {
  if (pack.scoringTemplate === "ideal_preference") return "이상형 취향";
  if (pack.scoringTemplate === "dilemma_fun") return "선택 케미";
  return "취향 궁합";
}

function getPackTone(slug: string) {
  const tones: Record<string, string> = {
    "forever-one": "gold",
    "funny-extreme": "coral",
    "ideal-person": "rose",
    "mixed-taste": "violet",
    "what-to-do": "mint",
    "what-to-eat": "orange",
    "what-to-watch": "blue",
    "where-to-go": "green",
  };
  return tones[slug] ?? "violet";
}

function getShelfEyebrow(shelf: ShelfId) {
  if (shelf === "all") return "골라서 바로 시작";
  return shelfOptions.find((option) => option.id === shelf)?.label ?? "";
}

function getShelfTitle(shelf: ShelfId) {
  const titles: Record<ShelfId, string> = {
    all: "오늘은 어떤 걸 맞혀볼까요?",
    fun: "고른 이유까지 웃긴 질문",
    popular: "지금 같이 하기 좋은 주제",
    relationship: "서로의 마음을 더 알아가는 선택",
    taste: "실제로 같이 정하기 좋은 취향",
  };
  return titles[shelf];
}
