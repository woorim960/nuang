"use client";

import { Bookmark, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import {
  candidateAxisCopy,
  candidateProfileDefinitions,
  candidatePublicPairOrder,
  type CandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import styles from "./TraitMapExplorer.module.css";

const SAVED_CODE_STORAGE_KEY = "nuang.map.saved-codes.v1";
const INITIAL_PROFILE_COUNT = 8;

type TraitMapExplorerProps = {
  initialCode: string;
};

type ProfileFilter = "all" | "E" | "I";

const profileFilters: readonly { label: string; value: ProfileFilter }[] = [
  { label: "전체", value: "all" },
  { label: "함께 활력 E", value: "E" },
  { label: "혼자 회복 I", value: "I" },
];

const allProfiles = Object.values(candidateProfileDefinitions).sort((a, b) =>
  a.code.localeCompare(b.code),
);

export function TraitMapExplorer({ initialCode }: TraitMapExplorerProps) {
  const [selectedCode, setSelectedCode] = useState(initialCode);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProfileFilter>("all");
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const selectedProfile = candidateProfileDefinitions[selectedCode];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedCodes = JSON.parse(
          window.localStorage.getItem(SAVED_CODE_STORAGE_KEY) ?? "[]",
        );

        if (Array.isArray(storedCodes)) {
          setSavedCodes(
            storedCodes
              .filter(
                (code): code is string =>
                  typeof code === "string" &&
                  Boolean(candidateProfileDefinitions[code]),
              )
              .slice(0, 5),
          );
        }
      } catch {
        window.localStorage.removeItem(SAVED_CODE_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const matchingProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

    return allProfiles.filter((profile) => {
      const matchesFilter = filter === "all" || profile.code.startsWith(filter);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        profile.code.toLocaleLowerCase("ko-KR").includes(normalizedQuery) ||
        profile.displayName
          .toLocaleLowerCase("ko-KR")
          .includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  const visibleProfiles =
    showAllProfiles || query.trim()
      ? matchingProfiles
      : matchingProfiles.slice(0, INITIAL_PROFILE_COUNT);

  const selectCode = (code: string, moveToResult = false) => {
    setSelectedCode(code);

    if (moveToResult) {
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }
  };

  const selectLetter = (position: number, symbol: string) => {
    const letters = selectedCode.split("");
    letters[position] = symbol;
    selectCode(letters.join(""));
  };

  const toggleSavedCode = () => {
    const nextCodes = savedCodes.includes(selectedCode)
      ? savedCodes.filter((code) => code !== selectedCode)
      : [selectedCode, ...savedCodes].slice(0, 5);

    setSavedCodes(nextCodes);
    window.localStorage.setItem(
      SAVED_CODE_STORAGE_KEY,
      JSON.stringify(nextCodes),
    );
  };

  return (
    <div className={styles.map}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span>NUANG</span>
          <h1>성향지도</h1>
        </div>
      </header>

      <section className={styles.mapIntro}>
        <strong>나와 궁금한 사람의 성향을 한곳에서 알아봐요.</strong>
        <p>
          코드를 직접 조합하거나 32개 성향을 둘러보며, 마음에 남는 코드는 따로
          모아 볼 수 있어요.
        </p>
      </section>

      <section className={styles.featured} aria-labelledby="featured-map-title">
        <div className={styles.featuredCopy}>
          <p className={styles.eyebrow}>깊이 읽는 성향지도</p>
          <h2 id="featured-map-title">ENAKQ · 관계를 여는 지휘자</h2>
          <p>
            사람을 만날 때의 모습부터 생각, 일, 감정, 가까운 관계까지 15개
            주제로 자세히 살펴봐요.
          </p>
          <div className={styles.featuredMeta}>
            <span>15개 주제</span>
            <span>원하는 부분부터 읽기</span>
          </div>
          <Link className={styles.featuredLink} href="/map/ENAKQ">
            상세 지도 열기
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
          </Link>
        </div>
        <div className={styles.characterStage}>
          <span className={styles.characterGlow} />
          <NuangCharacter
            className={styles.character}
            motif="purple"
            size="lg"
          />
        </div>
      </section>

      {savedCodes.length > 0 ? (
        <section className={styles.saved} aria-labelledby="saved-code-title">
          <div className={styles.sectionHeadingCompact}>
            <div>
              <p className={styles.eyebrow}>다시 보고 싶은 성향</p>
              <h2 id="saved-code-title">관심 코드</h2>
            </div>
            <span>{savedCodes.length}/5</span>
          </div>
          <div className={styles.savedList}>
            {savedCodes.map((code) => {
              const profile = candidateProfileDefinitions[code];
              return (
                <button
                  className={styles.savedCode}
                  key={code}
                  onClick={() => selectCode(code, true)}
                  type="button"
                >
                  <strong>{code}</strong>
                  <span>{profile.displayName}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.builder} aria-labelledby="code-builder-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>한 글자씩 눌러 바로 확인하기</p>
          <h2 id="code-builder-title">코드 조합해 보기</h2>
          <p>
            내 코드나 궁금한 사람의 코드를 순서대로 골라 보세요. 선택할 때마다
            설명이 바로 바뀌어요.
          </p>
        </div>

        <div className={styles.axes} aria-label="뉴앙 코드 다섯 자리 선택">
          {candidatePublicPairOrder.map((pair, index) => {
            const axis = candidateAxisCopy[index];
            return (
              <div
                className={styles.axisRow}
                data-position={index + 1}
                key={axis.domainId}
              >
                <div className={styles.axisLabel}>
                  <span>{index + 1}번째</span>
                  <strong>{axis.label}</strong>
                </div>
                <div className={styles.axisChoices}>
                  {pair.map((symbol) => {
                    const direction = axis.directions[symbol];
                    const active = selectedCode[index] === symbol;
                    return (
                      <button
                        aria-label={`${index + 1}번째 ${symbol} ${direction.shortToken}`}
                        aria-pressed={active}
                        className={styles.axisChoice}
                        data-active={active}
                        key={symbol}
                        onClick={() => selectLetter(index, symbol)}
                        type="button"
                      >
                        <strong>{symbol}</strong>
                        <span>{direction.shortToken}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <ProfileResult
          isSaved={savedCodes.includes(selectedCode)}
          onToggleSaved={toggleSavedCode}
          profile={selectedProfile}
          resultRef={resultRef}
        />
      </section>

      <section
        className={styles.library}
        aria-labelledby="profile-library-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>모르는 코드는 여기에서</p>
          <h2 id="profile-library-title">32개 성향 둘러보기</h2>
          <p>코드나 역할 이름을 찾아서 간단한 설명부터 살펴보세요.</p>
        </div>

        <label className={styles.search}>
          <Search aria-hidden="true" size={18} strokeWidth={1.7} />
          <span className={styles.srOnly}>코드 또는 역할 이름 검색</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: ENAKQ, 지휘자"
            type="search"
            value={query}
          />
        </label>

        <div className={styles.filters} aria-label="성향 목록 필터">
          {profileFilters.map((item) => (
            <button
              aria-pressed={filter === item.value}
              className={styles.filter}
              data-active={filter === item.value}
              key={item.value}
              onClick={() => {
                setFilter(item.value);
                setShowAllProfiles(false);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleProfiles.length > 0 ? (
          <div className={styles.profileGrid} aria-live="polite">
            {visibleProfiles.map((profile) => (
              <button
                aria-label={`${profile.code} ${profile.displayName} 살펴보기`}
                aria-pressed={selectedCode === profile.code}
                className={styles.profileTile}
                data-selected={selectedCode === profile.code}
                key={profile.code}
                onClick={() => selectCode(profile.code, true)}
                type="button"
              >
                <strong>{profile.code}</strong>
                <span>{profile.displayName}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptySearch}>
            <strong>찾는 코드가 보이지 않아요.</strong>
            <span>코드나 역할 이름의 일부만 입력해 보세요.</span>
          </div>
        )}

        {!query.trim() && matchingProfiles.length > INITIAL_PROFILE_COUNT ? (
          <button
            className={styles.expandButton}
            onClick={() => setShowAllProfiles((current) => !current)}
            type="button"
          >
            {showAllProfiles
              ? "간단히 보기"
              : `${matchingProfiles.length}개 성향 모두 보기`}
          </button>
        ) : null}
      </section>

      <section className={styles.assessmentPrompt}>
        <div>
          <p className={styles.eyebrow}>내 코드를 아직 모른다면</p>
          <h2>몇 가지 질문으로 먼저 알아봐요.</h2>
          <p>
            빠른 코어 검사 후 내 성향에 가까운 5글자 코드를 확인할 수 있어요.
          </p>
        </div>
        <Link
          className={styles.assessmentLink}
          href="/assessments/nu-core-quick?returnTo=%2Fmap"
        >
          내 코드 알아보기
          <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </Link>
      </section>
    </div>
  );
}

function ProfileResult({
  isSaved,
  onToggleSaved,
  profile,
  resultRef,
}: {
  isSaved: boolean;
  onToggleSaved: () => void;
  profile: CandidateProfileDefinition;
  resultRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <article className={styles.profileResult} ref={resultRef}>
      <div className={styles.profileResultTop}>
        <div>
          <p className={styles.resultLabel}>선택한 코드</p>
          <div
            aria-label={`선택한 코드 ${profile.code}`}
            className={styles.selectedCode}
            data-testid="selected-code"
          >
            {profile.code.split("").map((letter, index) => (
              <span data-position={index + 1} key={`${letter}-${index}`}>
                {letter}
              </span>
            ))}
          </div>
        </div>
        <button
          aria-label={isSaved ? "관심 코드에서 빼기" : "관심 코드에 저장"}
          aria-pressed={isSaved}
          className={styles.saveButton}
          data-saved={isSaved}
          onClick={onToggleSaved}
          type="button"
        >
          <Bookmark aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>{isSaved ? "저장됨" : "관심 코드"}</span>
        </button>
      </div>

      <h3>{profile.displayName}</h3>
      <p className={styles.profileSummary}>{profile.summary}</p>

      <details className={styles.codeDetails}>
        <summary>다섯 글자의 뜻 보기</summary>
        <ol>
          {profile.code.split("").map((symbol, index) => {
            const direction = candidateAxisCopy[index].directions[symbol];
            return (
              <li key={`${symbol}-${index}`}>
                <span>{symbol}</span>
                <div>
                  <strong>{direction.detailTitle}</strong>
                  <p>{direction.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </details>

      {profile.code === "ENAKQ" ? (
        <Link className={styles.detailLink} href="/map/ENAKQ">
          ENAKQ 상세 지도 보기
          <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </Link>
      ) : null}
    </article>
  );
}
