import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardCheck,
  Clock3,
  UsersRound,
} from "lucide-react";
import { AdminCognitiveInterviewSession } from "@/features/admin/AdminCognitiveInterviewSession";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "인지 인터뷰 진행 | NUANG",
};

export default function AdminCognitiveInterviewPage() {
  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>검사 연구 · M05 정성 검토</p>
          <h1>인지 인터뷰 진행</h1>
        </div>
        <Link href="/admin/research?section=validation">
          <ArrowLeft aria-hidden="true" size={15} />
          검증 계획
        </Link>
      </header>

      <section className={`${shared.panel} ${styles.guide}`}>
        <div>
          <UsersRound aria-hidden="true" size={20} strokeWidth={1.7} />
          <strong>참여자가 먼저 혼자 답합니다</strong>
          <p>
            진행자는 문장 뜻이나 목표 성향을 알려주지 않습니다. 자연 응답이 끝난
            뒤에만 한 문항씩 다시 보며 질문합니다.
          </p>
        </div>
        <div>
          <ClipboardCheck aria-hidden="true" size={20} strokeWidth={1.7} />
          <strong>이해 과정과 오해를 기록합니다</strong>
          <p>
            점수가 높고 낮은지를 평가하지 않습니다. 문장을 같은 뜻으로
            이해했는지, 경험·환경·좋아 보이는 답이 선택을 대신 결정했는지
            확인합니다.
          </p>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.researchPlan}`}>
        <div className={styles.planHeader}>
          <div>
            <p>처음 진행하는 운영자를 위한 실행 기준</p>
            <h2>정성검사는 이렇게 진행합니다</h2>
          </div>
          <span>현재 화면: 수정 문항 5개 표적 모듈</span>
        </div>

        <div className={styles.planGrid}>
          <article>
            <UsersRound aria-hidden="true" size={19} strokeWidth={1.7} />
            <strong>누구를 모집하나요?</strong>
            <p>
              한국어 앱을 쓰는 만 20~39세 중 문항 작성에 참여하지 않았고, 같은
              프로토콜의 이전 회차에 참여하지 않은 사람을 모집합니다. 20대·30대,
              학생·비학생, 생활·직업·지역·디지털 이용 환경이 고르게 섞이게
              배정합니다.
            </p>
            <small>
              내부 직원 2~3명은 진행 리허설만 가능하며 외부 사용자 근거로 세지
              않습니다. 진단명이나 장애 공개를 참가 조건으로 요구하지 않습니다.
            </small>
          </article>
          <article>
            <Clock3 aria-hidden="true" size={19} strokeWidth={1.7} />
            <strong>몇 명을 어떻게 만나나요?</strong>
            <p>
              전체 M05는 Round 1 외부 12~15명, 수정 후 Round 2 외부 12~15명,
              문제가 남으면 Round 3 외부 9~12명을 계획합니다. 전체 12문항 세션은
              동의·자연 응답·후속 질문·마무리를 포함해 55~65분을 권장합니다.
            </p>
            <small>
              문항마다 최소 두 회차·합계 8명 이상의 응답 과정 근거가 필요하고,
              큰 수정 뒤에는 새 참여자 최소 4명에게 다시 확인합니다.
            </small>
          </article>
          <article>
            <ClipboardCheck aria-hidden="true" size={19} strokeWidth={1.7} />
            <strong>무엇을 검사하나요?</strong>
            <p>
              뜻을 자기 말로 설명할 수 있는지, 최근 실제 상황을 떠올렸는지, 답의
              판단 기준과 1·3·5점 의미가 일관적인지, 경험·환경·좋아 보이는 답이
              응답을 대신 결정하지 않았는지 확인합니다.
            </p>
            <small>
              참여자에게 정답이나 목표 성향을 설명하지 않습니다. 진행자는 답을
              평가하지 말고 들은 내용과 관찰 근거만 가명으로 기록합니다.
            </small>
          </article>
          <article>
            <BadgeCheck aria-hidden="true" size={19} strokeWidth={1.7} />
            <strong>최종 승인은 누가, 언제 하나요?</strong>
            <p>
              UX 리서처가 회차별 패턴을 정리하고 독립된 측정 책임자가 여러
              참여자 세션을 함께 판정합니다. 반복 S2와 미해결 S3가 없고, 최종
              문구를 새 참여자에게 재확인한 문항만 다음 단계로 넘깁니다.
            </p>
            <small>
              M05 최종 승인은 정량 파일럿 M06을 시작할 수 있다는 뜻일 뿐입니다.
              고객용 검사·점수·리포트를 자동 변경하거나 배포하지 않습니다.
            </small>
          </article>
        </div>
      </section>

      <AdminCognitiveInterviewSession />
    </main>
  );
}
