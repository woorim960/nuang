import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import detailStyles from "@/features/map/EnakqTraitMapTemplate.module.css";
import styles from "@/features/map/TraitMapPreviewTemplate.module.css";
import {
  candidateAxisCopy,
  type CandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";

export function TraitMapPreviewTemplate({
  profile,
}: {
  profile: CandidateProfileDefinition;
}) {
  return (
    <article className={detailStyles.page}>
      <header className={detailStyles.header}>
        <Link aria-label="성향지도로 돌아가기" href="/map">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.65} />
        </Link>
        <span>상세 성향지도</span>
        <span aria-hidden="true" className={detailStyles.headerSpacer} />
      </header>

      <section className={detailStyles.hero}>
        <div className={detailStyles.heroCopy}>
          <p className={detailStyles.eyebrow}>5글자 뉴앙 코드</p>
          <p
            aria-label={`뉴앙 코드 ${profile.code}`}
            className={detailStyles.codeLetters}
          >
            {profile.code.split("").map((letter, index) => (
              <span data-position={index + 1} key={`${letter}-${index}`}>
                {letter}
              </span>
            ))}
          </p>
          <h1>{profile.displayName}</h1>
          <p>{profile.summary}</p>
        </div>
        <div className={detailStyles.characterWrap}>
          <span aria-hidden="true" />
          <NuangCharacter motif="purple" size="lg" />
        </div>
      </section>

      <section className={styles.updateNotice} aria-labelledby="update-title">
        <p>상세 성향지도 준비 중</p>
        <h2 id="update-title">정확한 상세 정보는 곧 업데이트돼요</h2>
        <span>
          지금은 다섯 글자에서 확인할 수 있는 핵심 모습을 먼저 보여드려요.
          관계와 상황에 따른 생각과 행동은 검토가 끝나는 대로 이 화면에
          추가할게요.
        </span>
      </section>

      <section className={styles.letterGuide} aria-labelledby="letter-title">
        <div className={styles.sectionHeading}>
          <p>현재 확인할 수 있는 내용</p>
          <h2 id="letter-title">다섯 글자가 보여주는 핵심 모습</h2>
        </div>
        <ol>
          {profile.code.split("").map((symbol, index) => {
            const direction = candidateAxisCopy[index].directions[symbol];
            return (
              <li data-position={index + 1} key={`${symbol}-${index}`}>
                <span>{symbol}</span>
                <div>
                  <small>{candidateAxisCopy[index].label}</small>
                  <strong>{direction.detailTitle}</strong>
                  <p>{direction.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.referenceGuide}>
        <div>
          <p>완성된 상세 지도가 궁금하다면</p>
          <h2>ENAKQ 안내서에서 전체 구성을 확인해 보세요</h2>
          <span>
            핵심 가치부터 가족·친구·연인·마음 가는 사람, 일, 부담과 회복, 신뢰
            근거까지 어떻게 설명되는지 먼저 살펴볼 수 있어요.
          </span>
        </div>
        <Link href="/map/ENAKQ">
          ENAKQ 상세 지도 참고하기
          <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </Link>
      </section>
    </article>
  );
}
