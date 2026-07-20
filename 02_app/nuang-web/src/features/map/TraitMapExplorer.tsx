"use client";

import { Bookmark, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
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
  initialCode: string | null;
};

type MapViewerProfile = {
  code: string;
  displayName: string;
  sourceLabel: string;
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
  const [selectedCode, setSelectedCode] = useState(initialCode ?? "-----");
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProfileFilter>("all");
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<MapViewerProfile | null>(
    null,
  );
  const [viewerProfileLoaded, setViewerProfileLoaded] = useState(false);
  const builderRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const selectedProfile = candidateProfileDefinitions[selectedCode] ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadViewerProfile() {
      const [localAttempts, accountResults] = await Promise.all([
        listLocalAttempts().catch(() => []),
        listMapAccountResults(),
      ]);
      const profile = buildMapViewerProfile({ accountResults, localAttempts });

      if (!isMounted) return;
      setViewerProfile(profile);
      setViewerProfileLoaded(true);
      if (!initialCode && profile) setSelectedCode(profile.code);
    }

    void loadViewerProfile();

    return () => {
      isMounted = false;
    };
  }, [initialCode]);

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

  useEffect(() => {
    if (
      !viewerProfileLoaded ||
      initialCode ||
      viewerProfile ||
      selectedCode !== "-----" ||
      savedCodes.length === 0
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSelectedCode(savedCodes[0]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    initialCode,
    savedCodes,
    selectedCode,
    viewerProfile,
    viewerProfileLoaded,
  ]);

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
  const startProfile = selectedProfile
    ? {
        code: selectedProfile.code,
        displayName: selectedProfile.displayName,
        sourceLabel:
          viewerProfile?.code === selectedProfile.code
            ? viewerProfile.sourceLabel
            : savedCodes.includes(selectedProfile.code)
              ? "최근 관심 코드"
              : "지금 선택한 성향",
      }
    : null;

  const moveToBuilder = () => {
    builderRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  };

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
    const letters = Array.from(
      { length: 5 },
      (_, index) => selectedCode[index] ?? "-",
    );
    letters[position] = symbol;
    selectCode(letters.join(""));
  };

  const toggleSavedCode = () => {
    if (!selectedProfile) return;

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

      <MapStartPanel
        isLoading={!initialCode && !viewerProfileLoaded}
        onExplore={moveToBuilder}
        profile={startProfile}
      />

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

      <section
        className={styles.builder}
        aria-labelledby="code-builder-title"
        ref={builderRef}
      >
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

        {selectedProfile ? (
          <ProfileResult
            isSaved={savedCodes.includes(selectedCode)}
            onToggleSaved={toggleSavedCode}
            profile={selectedProfile}
            resultRef={resultRef}
          />
        ) : (
          <EmptyBuilderResult code={selectedCode} resultRef={resultRef} />
        )}
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
            placeholder="5글자 코드 또는 역할 이름"
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

function MapStartPanel({
  isLoading,
  onExplore,
  profile,
}: {
  isLoading: boolean;
  onExplore: () => void;
  profile: MapViewerProfile | null;
}) {
  const definition = profile ? candidateProfileDefinitions[profile.code] : null;
  const title = isLoading
    ? "내게 맞는 시작점을 찾고 있어요"
    : profile
      ? profile.displayName
      : "누구의 성향이 궁금한가요?";

  return (
    <section
      className={styles.startPanel}
      aria-busy={isLoading}
      aria-labelledby="map-start-title"
    >
      <div className={styles.startOverview}>
        <div className={styles.startCopy}>
          <p className={styles.eyebrow}>
            {isLoading
              ? "내 성향을 확인하는 중"
              : (profile?.sourceLabel ?? "성향 탐색 시작")}
          </p>
          <h2 id="map-start-title">{title}</h2>
          {profile ? (
            <div
              aria-label={`선택한 코드 ${profile.code}`}
              className={styles.startCode}
            >
              {profile.code.split("").map((letter, index) => (
                <span data-position={index + 1} key={`${letter}-${index}`}>
                  {letter}
                </span>
              ))}
            </div>
          ) : null}
          <p className={styles.startDescription}>
            {isLoading ? (
              "저장된 검사 결과와 관심 코드를 확인하고 있어요."
            ) : profile ? (
              <>
                <span>
                  이 코드가 어떤 생각과 행동으로 이어지는지 살펴보세요.
                </span>
                <span>
                  궁금한 사람의 코드는 아래에서 직접 조합할 수 있어요.
                </span>
              </>
            ) : (
              <>
                <span>알고 있는 5글자 코드를 직접 조합해 보세요.</span>
                <span>내 코드를 모른다면 빠른 검사로 먼저 찾을 수 있어요.</span>
              </>
            )}
          </p>
        </div>
        <div className={styles.startCharacter}>
          <span aria-hidden="true" className={styles.characterGlow} />
          <NuangCharacter
            className={styles.character}
            motif="purple"
            size="md"
          />
        </div>
      </div>
      {definition ? (
        <ol
          aria-label={`${profile?.code} 다섯 글자 핵심 의미`}
          className={styles.startSignals}
        >
          {definition.codeTokens.map((token, index) => (
            <li data-position={index + 1} key={`${token}-${index}`}>
              <strong>{definition.code[index]}</strong>
              <span>{token}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {!isLoading ? (
        <div className={styles.startActions}>
          {profile ? (
            <>
              <Link href={`/map/${profile.code}`}>
                상세 성향지도 보기
                <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
              </Link>
              <button onClick={onExplore} type="button">
                다른 코드 조합하기
              </button>
            </>
          ) : (
            <button onClick={onExplore} type="button">
              5글자 코드 직접 조합
              <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </button>
          )}
          {!profile ? (
            <Link href="/assessments/nu-core-quick?returnTo=%2Fmap">
              검사로 내 코드 찾기
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function EmptyBuilderResult({
  code,
  resultRef,
}: {
  code: string;
  resultRef: React.RefObject<HTMLElement | null>;
}) {
  const chosenCount = [...code].filter((letter) => letter !== "-").length;
  const remainingCount = 5 - chosenCount;

  return (
    <article className={styles.emptyBuilderResult} ref={resultRef}>
      <p className={styles.resultLabel}>직접 입력하는 코드</p>
      <div
        aria-label={`선택한 글자 ${chosenCount}개`}
        className={styles.emptyCode}
      >
        {code.split("").map((letter, index) => (
          <span
            data-filled={letter !== "-"}
            data-position={index + 1}
            key={`${index}-${letter}`}
          >
            {letter === "-" ? "·" : letter}
          </span>
        ))}
      </div>
      <strong>
        {chosenCount === 0
          ? "한 글자씩 골라 보세요"
          : `${remainingCount}글자만 더 고르면 설명이 열려요`}
      </strong>
      <p>
        각 자리는 좋고 나쁨을 가르는 점수가 아니라, 평소 어느 쪽 모습이 더 자주
        나타나는지를 보여줘요.
      </p>
    </article>
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
        <summary>다섯 글자 한눈에 보기</summary>
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

      <Link className={styles.detailLink} href={`/map/${profile.code}`}>
        상세 성향지도 보기
        <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </Link>
    </article>
  );
}

async function listMapAccountResults(): Promise<AccountResultSummary[]> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });
    if (!response.ok) return [];

    const body = await readJsonResponse<{
      ok?: boolean;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results) ? body.results : [];
  } catch {
    return [];
  }
}

function buildMapViewerProfile({
  accountResults,
  localAttempts,
}: {
  accountResults: AccountResultSummary[];
  localAttempts: LocalAssessmentAttempt[];
}): MapViewerProfile | null {
  const accountCandidates = accountResults.flatMap((result) => {
    const profile = candidateProfileDefinitions[result.profileCode];
    if (!profile) return [];

    return [
      {
        code: profile.code,
        completedAt: result.completedAt,
        displayName: profile.displayName,
        kind: result.kind,
      },
    ];
  });
  const localCandidates = localAttempts.flatMap((attempt) => {
    if (attempt.state !== "completed") return [];

    const score = calculateLocalAttemptScore(attempt);
    const profile = score?.code
      ? candidateProfileDefinitions[score.code]
      : undefined;
    if (!profile) return [];

    return [
      {
        code: profile.code,
        completedAt: attempt.completedAt ?? attempt.updatedAt,
        displayName: profile.displayName,
        kind: attempt.mode,
      },
    ];
  });
  const [representative] = [...accountCandidates, ...localCandidates].sort(
    (left, right) => {
      const kindDifference =
        Number(right.kind === "full") - Number(left.kind === "full");
      if (kindDifference !== 0) return kindDifference;
      return right.completedAt.localeCompare(left.completedAt);
    },
  );

  if (!representative) return null;

  return {
    code: representative.code,
    displayName: representative.displayName,
    sourceLabel:
      representative.kind === "full"
        ? "내 대표 코드 · 정밀 검사 기준"
        : "내 첫 코드 · 빠른 검사 기준",
  };
}
