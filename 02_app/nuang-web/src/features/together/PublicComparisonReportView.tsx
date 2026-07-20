"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Info,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import { getCandidateDirectionCopy } from "@/features/nuang-code/candidate-profile-names";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";
import type {
  PublicComparisonAxisInsight,
  PublicComparisonFacetInsight,
  PublicComparisonProfileCard,
  PublicComparisonReportPayload,
} from "@/features/together/public-comparison-contract";
import styles from "@/features/together/PublicComparisonReportView.module.css";

type RelationshipContext =
  "general" | "family" | "friend" | "partner" | "crush" | "work";

const relationshipContexts: Array<{
  id: RelationshipContext;
  label: string;
  note: string;
}> = [
  { id: "general", label: "전체", note: "어떤 관계에서도 참고할 수 있는 장면" },
  {
    id: "family",
    label: "가족",
    note: "연락, 돌봄, 집안의 약속을 맞추는 장면",
  },
  {
    id: "friend",
    label: "친구",
    note: "약속, 답장, 함께 쉬는 방식을 맞추는 장면",
  },
  {
    id: "partner",
    label: "연인",
    note: "표현, 연락, 갈등 뒤 회복을 맞추는 장면",
  },
  {
    id: "crush",
    label: "마음 가는 사람",
    note: "서두르지 않고 서로의 표현 방식을 알아가는 장면",
  },
  {
    id: "work",
    label: "동료",
    note: "일정, 의견, 피드백과 협업을 맞추는 장면",
  },
];

const facetDirectionLabels: Record<string, { high: string; low: string }> = {
  "SE-RE": { high: "함께하며 충전", low: "혼자 정리하며 충전" },
  "SE-AI": { high: "필요한 말을 먼저 꺼냄", low: "상황을 살핀 뒤 표현" },
  "OE-AE": { high: "분위기와 감각에도 관심", low: "구체적인 내용에 집중" },
  "OE-CI": {
    high: "앞뒤 이야기와 가능성을 펼침",
    low: "확인한 장면 안에서 생각",
  },
  "OE-IE": { high: "다른 설명과 원리까지 탐구", low: "필요한 만큼 확인" },
  "RO-EC": { high: "상대 마음이 먼저 보임", low: "원인과 해결이 먼저 보임" },
  "SM-EP": {
    high: "시작하고 꾸준히 이어감",
    low: "상황과 에너지에 따라 달라짐",
  },
  "SM-OS": { high: "정해둔 구조를 유지", low: "상황에 맞춰 구조를 정함" },
  "ER-IR": {
    high: "불편한 감정이 빠르게 커짐",
    low: "감정 변화가 비교적 잔잔함",
  },
  "ER-WD": { high: "걱정과 망설임이 커짐", low: "걱정이 오래 이어지지 않음" },
};

const axisMomentCopy: Record<string, { question: string; scene: string }> = {
  SE: {
    scene: "연락을 시작하거나 함께할 약속을 잡을 때",
    question: "지금 바로 이야기할까, 생각을 정리한 뒤 다시 이야기할까?",
  },
  OE: {
    scene: "함께 볼 것, 갈 곳이나 할 일을 고를 때",
    question: "익숙한 선택부터 볼까, 새로운 선택도 같이 찾아볼까?",
  },
  RO: {
    scene: "한 사람이 속상한 일을 이야기할 때",
    question:
      "지금은 마음을 들어주는 게 좋을까, 해결 방법을 같이 찾는 게 좋을까?",
  },
  SM: {
    scene: "약속이나 함께할 일을 정할 때",
    question: "꼭 지킬 부분과 바뀌어도 괜찮은 부분을 나눠볼까?",
  },
  ER: {
    scene: "답이 늦거나 계획이 어긋났을 때",
    question: "지금 걱정되는 걸 이야기할까, 잠깐 정리한 뒤 다시 이야기할까?",
  },
};

const relationshipSceneOverrides: Record<
  Exclude<RelationshipContext, "general">,
  Record<string, string>
> = {
  family: {
    SE: "가족 연락을 먼저 하거나 함께 시간을 보낼 때",
    OE: "함께 먹을 것, 갈 곳이나 가족 행사를 정할 때",
    RO: "가족이 속상한 일을 이야기할 때",
    SM: "집안의 역할이나 가족 일정을 나눌 때",
    ER: "연락이 늦거나 가족 계획이 갑자기 바뀔 때",
  },
  friend: {
    SE: "친구에게 먼저 연락하거나 만날 약속을 잡을 때",
    OE: "함께 놀 것과 새로운 장소를 고를 때",
    RO: "친구가 고민이나 속상한 일을 꺼낼 때",
    SM: "약속 시간과 함께 준비할 일을 정할 때",
    ER: "답장이 늦거나 약속이 바뀌었을 때",
  },
  partner: {
    SE: "연락 빈도와 함께 보내는 시간을 맞출 때",
    OE: "데이트나 함께할 경험을 고를 때",
    RO: "한 사람이 서운한 마음을 이야기할 때",
    SM: "공동 일정과 생활의 역할을 맞출 때",
    ER: "답이 늦거나 갈등 뒤 다시 이야기할 때",
  },
  crush: {
    SE: "누가 먼저 연락하고 대화를 이어갈지 살필 때",
    OE: "처음 함께할 장소와 대화 주제를 고를 때",
    RO: "상대가 조심스럽게 고민을 꺼냈을 때",
    SM: "다음 만남과 연락 약속을 정할 때",
    ER: "답장이 늦거나 상대의 반응이 아직 분명하지 않을 때",
  },
  work: {
    SE: "회의에서 의견을 꺼내거나 협업을 시작할 때",
    OE: "익숙한 방법과 새로운 아이디어 중 방향을 고를 때",
    RO: "동료가 어려움이나 문제를 이야기할 때",
    SM: "마감 일정과 맡을 일을 나눌 때",
    ER: "피드백을 받거나 계획이 갑자기 바뀔 때",
  },
};

export function PublicComparisonReportView({
  report,
}: {
  report: PublicComparisonReportPayload;
}) {
  const { comparison } = report;
  const sections = comparison.sections;
  const axisComparisons = useMemo(
    () => getAxisComparisons(sections),
    [sections],
  );
  const initiallyOpen = useMemo(
    () =>
      [...axisComparisons].sort((a, b) => b.difference - a.difference)[0]
        ?.domainId ?? null,
    [axisComparisons],
  );
  const [openAxes, setOpenAxes] = useState<string[]>(
    initiallyOpen ? [initiallyOpen] : [],
  );
  const [relationship, setRelationship] =
    useState<RelationshipContext>("general");
  const [relationshipSheetOpen, setRelationshipSheetOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "shared">("idle");
  const summary = sections.summary;
  const targetName = toPersonName(comparison.target.displayName);
  const relationshipLabel = relationshipContexts.find(
    (item) => item.id === relationship,
  )?.label;
  const closestAxis = axisComparisons
    .filter((axis) => axis.difference <= 16)
    .sort((a, b) => a.difference - b.difference)[0];
  const sameDirectionDifferentStrength = axisComparisons
    .filter(
      (axis) => axis.viewerSymbol === axis.targetSymbol && axis.difference > 16,
    )
    .sort((a, b) => b.difference - a.difference)[0];
  const relationshipDifferences = [...axisComparisons]
    .filter(isMeaningfulRelationshipDifference)
    .sort((a, b) => b.difference - a.difference);
  const strongestDifference = relationshipDifferences[0];
  const relationshipMoments =
    relationshipDifferences.length > 0
      ? relationshipDifferences.slice(0, 2)
      : closestAxis
        ? [closestAxis]
        : [];

  const allOpen =
    axisComparisons.length > 0 && openAxes.length === axisComparisons.length;

  async function shareReport() {
    const shareData = {
      text: `${targetName}${andParticle(targetName)} 나의 공개 성향을 나란히 살펴본 뉴앙 비교 리포트예요.`,
      title: `${targetName}${andParticle(targetName)} 나 · 뉴앙 비교 리포트`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
      setShareState("shared");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      setShareState("idle");
    }
  }

  function toggleAxis(domainId: string) {
    setOpenAxes((current) =>
      current.includes(domainId)
        ? current.filter((id) => id !== domainId)
        : [...current, domainId],
    );
  }

  function toggleAllAxes() {
    setOpenAxes(allOpen ? [] : axisComparisons.map((axis) => axis.domainId));
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.eyebrowRow}>
          <p>나와 비교하기</p>
          <button
            aria-label="비교 리포트 공유"
            className={styles.iconButton}
            onClick={shareReport}
            type="button"
          >
            {shareState === "shared" ? (
              <Check size={18} />
            ) : (
              <Share2 size={18} />
            )}
          </button>
        </div>
        <h1>
          {targetName}
          {andParticle(targetName)} 나는 어디가 닮고 다를까요?
        </h1>
        <p className={styles.heroDescription}>
          두 사람이 정밀 코어 검사에서 공개한 성향을 나란히 살펴봤어요.
        </p>

        <div aria-label="비교 대상" className={styles.profilePair}>
          <Profile profile={comparison.viewer} relationLabel="나" />
          <div aria-hidden="true" className={styles.pairConnector}>
            <span />
            <span />
            <span />
          </div>
          <Profile profile={comparison.target} relationLabel={targetName} />
        </div>

        <div className={styles.trustNote}>
          <Info aria-hidden="true" size={16} />
          <p>
            잘 맞고 안 맞는 점수를 매기는 결과가 아니에요. 각자 편한 방식과
            오해가 생길 수 있는 순간을 이해하도록 도와드려요.
          </p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>한눈에 보기</p>
            <h2>둘의 성향을 먼저 짚어봤어요</h2>
          </div>
        </div>
        <div className={styles.summaryList}>
          <SummaryItem
            label="가장 자연스럽게 맞는 부분"
            value={
              closestAxis?.label ??
              summary.closestAxisLabel ??
              "조금 더 살펴볼게요"
            }
            tone="mint"
          />
          {sameDirectionDifferentStrength ? (
            <SummaryItem
              label="같은 방향이지만 정도가 다른 부분"
              value={sameDirectionDifferentStrength.label}
              tone="lavender"
            />
          ) : null}
          <SummaryItem
            label="먼저 맞춰보면 좋은 부분"
            value={
              strongestDifference?.label ??
              "현재 공개된 자리에서는 큰 차이가 없어요"
            }
            tone="peach"
          />
        </div>
      </section>

      <section className={styles.contextSection}>
        <button
          className={styles.contextButton}
          onClick={() => setRelationshipSheetOpen(true)}
          type="button"
        >
          <span>
            <SlidersHorizontal aria-hidden="true" size={16} />
            관계에 맞춰 보기
          </span>
          <strong>{relationshipLabel}</strong>
          <ChevronDown aria-hidden="true" size={17} />
        </button>
        <p>
          성향 수치는 그대로 두고, 이 관계에서 자주 마주칠 상황과 질문을 먼저
          보여드려요.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>5개 코드 자리</p>
            <h2>각자 편한 방식은 이만큼 달라요</h2>
          </div>
          <button
            className={styles.textButton}
            onClick={toggleAllAxes}
            type="button"
          >
            {allOpen ? "모두 접기" : "모두 펼치기"}
          </button>
        </div>
        <p className={styles.sectionDescription}>
          각 %는 전체 사용자 중 순위가 아니라, 내 응답에서 어느 방향이 더 자주
          나타났는지 보여주는 값이에요.
        </p>
        <div className={styles.axisList}>
          {axisComparisons.map((axis) => (
            <AxisComparison
              axis={axis}
              facets={(sections.facetComparisons ?? []).filter(
                (facet) => facet.domainId === axis.domainId,
              )}
              isOpen={openAxes.includes(axis.domainId)}
              key={axis.domainId}
              onToggle={() => toggleAxis(axis.domainId)}
              targetName={targetName}
            />
          ))}
        </div>
        <div className={styles.scoreGuide}>
          <Info aria-hidden="true" size={15} />
          <p>
            50%에 가까울수록 두 모습이 비슷하게 나타날 수 있어요. 두 사람의
            수치는 서로 합쳐 100%가 아니며, 차이가 관계의 좋고 나쁨이나 잘 맞을
            확률을 뜻하지 않아요.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>
              {relationship === "general"
                ? "관계 전반에서"
                : `${relationshipLabel} 관계에서`}
            </p>
            <h2>
              {relationshipDifferences.length > 0
                ? "함께 있을 때 이런 차이가 보일 수 있어요"
                : "비슷해도 한 번 확인하면 좋은 순간이에요"}
            </h2>
          </div>
        </div>
        <div className={styles.momentList}>
          {relationshipMoments.map((axis) => (
            <RelationshipMoment
              axis={axis}
              context={relationship}
              key={axis.domainId}
            />
          ))}
        </div>
      </section>

      <details className={styles.privacyDetails}>
        <summary>서로 공개한 성향 정보만 사용했어요</summary>
        <p>
          직접 응답, 원점수, 민감 항목과 비공개 정보는 사용하지 않았어요. 공개
          범위가 바뀌면 이 리포트도 다시 확인해요.
        </p>
      </details>

      {relationshipSheetOpen ? (
        <RelationshipSheet
          onClose={() => setRelationshipSheetOpen(false)}
          onSelect={(value) => {
            setRelationship(value);
            setRelationshipSheetOpen(false);
          }}
          selected={relationship}
        />
      ) : null}
    </section>
  );
}

function Profile({
  profile,
  relationLabel,
}: {
  profile: PublicComparisonProfileCard;
  relationLabel: string;
}) {
  return (
    <article className={styles.profile}>
      <PublicProfileImageView
        className={styles.profileImage}
        image={profile.profileImage}
        size="md"
      />
      <p>{relationLabel}</p>
      <strong>{profile.code}</strong>
      <span>{profile.profileName}</span>
    </article>
  );
}

function SummaryItem({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "lavender" | "mint" | "peach";
  value: string;
}) {
  return (
    <div className={styles.summaryItem} data-tone={tone}>
      <span aria-hidden="true" />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function AxisComparison({
  axis,
  facets,
  isOpen,
  onToggle,
  targetName,
}: {
  axis: PublicComparisonAxisInsight;
  facets: PublicComparisonFacetInsight[];
  isOpen: boolean;
  onToggle: () => void;
  targetName: string;
}) {
  const position = nextNuangCodeScheme.positions.find(
    (item) => item.domainId === axis.domainId,
  );
  const status = getAxisStatus(axis);
  const hasSharedDirection =
    Boolean(axis.viewerSymbol) && axis.viewerSymbol === axis.targetSymbol;

  return (
    <article className={styles.axis} data-open={isOpen}>
      <button
        aria-expanded={isOpen}
        className={styles.axisToggle}
        onClick={onToggle}
        type="button"
      >
        <span>
          <strong>{axis.label}</strong>
          <small>{status}</small>
        </span>
        <ChevronDown aria-hidden="true" size={19} />
      </button>

      <div className={styles.axisScores}>
        <ScoreTrack
          highSymbol={position?.highSymbol ?? ""}
          lowSymbol={position?.lowSymbol ?? ""}
          name="나"
          score={axis.viewerScore}
          symbol={axis.viewerSymbol}
          tone="viewer"
        />
        <ScoreTrack
          highSymbol={position?.highSymbol ?? ""}
          lowSymbol={position?.lowSymbol ?? ""}
          name={targetName}
          score={axis.targetScore}
          symbol={axis.targetSymbol}
          tone="target"
        />
      </div>

      {isOpen ? (
        <div className={styles.axisDetails}>
          {hasSharedDirection ? (
            <SharedPattern
              difference={axis.difference}
              text={axis.viewerPattern}
            />
          ) : (
            <>
              <p className={styles.axisInterpretation}>
                {axis.interpretation}
              </p>
              <div className={styles.patternGrid}>
                <Pattern label="나" text={axis.viewerPattern} />
                <Pattern label={targetName} text={axis.targetPattern} />
              </div>
            </>
          )}
          {facets.length > 0 ? (
            <div className={styles.facetGroup}>
              <h3>세부 모습 {facets.length}개</h3>
              {facets.map((facet) => (
                <FacetComparison
                  facet={facet}
                  key={facet.facetId}
                  targetName={targetName}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ScoreTrack({
  highSymbol,
  lowSymbol,
  name,
  score,
  symbol,
  tone,
}: {
  highSymbol: string;
  lowSymbol: string;
  name: string;
  score: number;
  symbol?: string | null;
  tone: "target" | "viewer";
}) {
  const normalizedScore = clampScore(score);
  const directionStrength =
    symbol === lowSymbol ? 100 - normalizedScore : normalizedScore;

  return (
    <div className={styles.scoreTrack} data-tone={tone}>
      <div className={styles.scoreMeta}>
        <span>{name}</span>
        <strong>
          {symbol ?? "-"} {Math.round(directionStrength)}%
        </strong>
      </div>
      <div className={styles.trackLabels}>
        <span>{lowSymbol}</span>
        <span>{highSymbol}</span>
      </div>
      <div className={styles.track}>
        <span style={{ left: `${normalizedScore}%` }} />
      </div>
    </div>
  );
}

function Pattern({ label, text }: { label: string; text: string }) {
  const [title, ...body] = text.split(". ");

  return (
    <div className={styles.pattern}>
      <span>{label}</span>
      <strong>{title}</strong>
      {body.length > 0 ? <p>{body.join(". ")}</p> : null}
    </div>
  );
}

function SharedPattern({
  difference,
  text,
}: {
  difference: number;
  text: string;
}) {
  const [title, ...body] = text.split(". ");

  return (
    <div className={styles.sharedPattern}>
      <span>두 사람에게 공통으로 나타난 방향</span>
      <strong>{title}</strong>
      {body.length > 0 ? <p>{body.join(". ")}</p> : null}
      {difference > 16 ? (
        <small>방향은 같지만 이 모습이 나타나는 정도에는 차이가 있어요.</small>
      ) : null}
    </div>
  );
}

function FacetComparison({
  facet,
  targetName,
}: {
  facet: PublicComparisonFacetInsight;
  targetName: string;
}) {
  const directions = facetDirectionLabels[facet.facetId];

  return (
    <div className={styles.facet}>
      <h4>{facet.label}</h4>
      {directions ? (
        <div className={styles.facetDirections}>
          <span>{directions.low}</span>
          <span>{directions.high}</span>
        </div>
      ) : null}
      <MiniTrack label="나" score={facet.viewerScore} tone="viewer" />
      <MiniTrack label={targetName} score={facet.targetScore} tone="target" />
      <p>{facet.interpretation}</p>
    </div>
  );
}

function MiniTrack({
  label,
  score,
  tone,
}: {
  label: string;
  score: number;
  tone: "target" | "viewer";
}) {
  const normalizedScore = clampScore(score);

  return (
    <div className={styles.miniTrack} data-tone={tone}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${normalizedScore}%` }} />
      </div>
      <strong>{Math.round(normalizedScore)}%</strong>
    </div>
  );
}

function RelationshipMoment({
  axis,
  context,
}: {
  axis: PublicComparisonAxisInsight;
  context: RelationshipContext;
}) {
  const moment = axisMomentCopy[axis.domainId];
  if (!moment) return null;
  const scene =
    context === "general"
      ? moment.scene
      : (relationshipSceneOverrides[context][axis.domainId] ?? moment.scene);
  const hasMeaningfulDifference = isMeaningfulRelationshipDifference(axis);

  return (
    <article className={styles.moment}>
      <p className={styles.momentContext}>{getContextPrefix(context)}</p>
      <h3>{scene}</h3>
      <p className={styles.momentInsight}>
        <span>
          {hasMeaningfulDifference
            ? "다르게 느낄 수 있는 지점"
            : "비슷해도 확인할 지점"}
        </span>
        {hasMeaningfulDifference
          ? axis.possibleMisread
          : "비슷한 성향이어도 그날의 상황과 관계에 따라 원하는 속도는 달라질 수 있어요."}
      </p>
      <p className={styles.momentQuestion}>
        <span>이렇게 물어보세요</span>
        {moment.question}
      </p>
    </article>
  );
}

function RelationshipSheet({
  onClose,
  onSelect,
  selected,
}: {
  onClose: () => void;
  onSelect: (value: RelationshipContext) => void;
  selected: RelationshipContext;
}) {
  return (
    <div className={styles.sheetBackdrop} onClick={onClose} role="presentation">
      <section
        aria-label="관계 선택"
        aria-modal="true"
        className={styles.sheet}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <p>관계에 맞춰 보기</p>
            <h2>어떤 관계에서 살펴볼까요?</h2>
          </div>
          <button aria-label="닫기" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>
        <p className={styles.sheetGuide}>
          점수와 코드는 바뀌지 않고, 자주 마주칠 상황만 달라져요. 선택한 관계는
          상대에게 알려지지 않아요.
        </p>
        <div className={styles.contextOptions}>
          {relationshipContexts.map((item) => (
            <button
              aria-pressed={selected === item.id}
              key={item.id}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </span>
              {selected === item.id ? (
                <Check aria-hidden="true" size={18} />
              ) : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function getAxisComparisons(
  sections: PublicComparisonReportPayload["comparison"]["sections"],
) {
  if (sections.axisComparisons?.length > 0) return sections.axisComparisons;

  return [...sections.commonGround, ...sections.differences].map((axis) => ({
    ...axis,
    adjustmentTip: "서로 편한 속도와 표현 방식을 먼저 확인해보세요.",
    closeness: axis.difference <= 16 ? "close" : "different",
    interpretation:
      axis.difference <= 16
        ? `${axis.label}에서는 서로 기대하는 흐름이 가까운 편이에요.`
        : `${axis.label}에서는 편한 방식이 다를 수 있어요.`,
    possibleMisread:
      "한 사람은 충분하다고 느끼고, 다른 사람은 설명이 더 필요하다고 느낄 수 있어요.",
    targetPattern: buildFallbackPattern(
      "상대",
      axis.domainId,
      axis.targetSymbol,
    ),
    viewerPattern: buildFallbackPattern("나", axis.domainId, axis.viewerSymbol),
  })) satisfies PublicComparisonAxisInsight[];
}

function buildFallbackPattern(
  subject: "나" | "상대",
  domainId: string,
  symbol?: string | null,
) {
  const position = nextNuangCodeScheme.positions.find(
    (entry) => entry.domainId === domainId,
  );
  const insight = position
    ? getCandidateDirectionCopy(position.codePosition, symbol ?? "")
    : null;

  return insight
    ? `${insight.detailTitle}. ${insight.description}`
    : `${subject}의 공개된 뉴앙 코드 정보를 더 확인해야 해요.`;
}

function getAxisStatus(axis: PublicComparisonAxisInsight) {
  const sameSymbol =
    Boolean(axis.viewerSymbol) && axis.viewerSymbol === axis.targetSymbol;

  if (sameSymbol && axis.difference <= 8) return "같은 방향 · 매우 가까워요";
  if (sameSymbol && axis.difference <= 16) return "같은 방향 · 가까워요";
  if (sameSymbol) return "같은 방향 · 선명도는 달라요";
  if (axis.difference <= 16 || axis.hasBoundarySignal) {
    return "글자는 다르지만 두 모습이 함께 나타날 수 있어요";
  }
  return "편한 방식이 달라요";
}

function clampScore(score: number) {
  return Math.max(2, Math.min(98, score));
}

function isMeaningfulRelationshipDifference(
  axis: PublicComparisonAxisInsight,
) {
  return (
    axis.viewerSymbol !== axis.targetSymbol ||
    axis.difference > 16 ||
    axis.hasBoundarySignal
  );
}

function toPersonName(name: string) {
  if (name === "상대") return "상대";
  return name.endsWith("님") ? name : `${name}님`;
}

function andParticle(value: string) {
  const last = Array.from(value.trim()).at(-1);
  if (!last) return "와";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "와";
  return (code - 0xac00) % 28 === 0 ? "와" : "과";
}

function getContextPrefix(context: RelationshipContext) {
  const copy: Record<RelationshipContext, string> = {
    general: "일상에서",
    family: "가족과 생활하며",
    friend: "친구와 시간을 보내며",
    partner: "연인과 마음을 나누며",
    crush: "서로를 알아가며",
    work: "함께 일하거나 공부하며",
  };

  return copy[context];
}
