import { ArrowLeft } from "lucide-react";
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

      <section className={styles.letterGuide} aria-labelledby="letter-title">
        <div className={styles.sectionHeading}>
          <h2 id="letter-title">검사에서 확인한 다섯 가지 모습</h2>
          <p>
            지금은 답변에서 직접 확인할 수 있는 내용만 보여드려요. 관계나 일에
            대한 자세한 해석은 문장별 검토를 마친 뒤 추가합니다. 성향 이름은
            지도를 쉽게 찾기 위한 별칭이며 직업이나 능력을 뜻하지 않아요.
          </p>
        </div>
        <ol>
          {profile.code.split("").map((symbol, index) => {
            const direction = candidateAxisCopy[index].directions[symbol];
            return (
              <li data-position={index + 1} key={`${symbol}-${index}`}>
                <span>{symbol}</span>
                <div>
                  <small>{candidateAxisCopy[index].label}</small>
                  <strong>
                    {symbol} · {direction.publicTypeName}
                  </strong>
                  <p>{direction.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}
