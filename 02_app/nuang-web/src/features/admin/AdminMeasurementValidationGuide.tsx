import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ClipboardCheck,
  FileLock2,
  MessageSquareText,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";
import type { MeasurementGateStatus } from "@/features/nuang-code/next-code-scheme";
import {
  initialAiMeasurementPrereviewRecords,
  summarizeAiMeasurementPrereview,
} from "@/features/research/ai-measurement-prereview-contract";
import shared from "./AdminShared.module.css";
import styles from "./AdminMeasurementValidationGuide.module.css";

const reviewerSlots = [
  ["R01", "심리측정", "문항 구조·평정 기준·통계 검증"],
  ["R02", "심리측정", "독립 재검토·측정오차·공정성"],
  ["R03", "성격·사회심리", "성향 정의·인접 성향 구분"],
  ["R04", "한국어 문항", "이해 가능성·한 문항 한 반응"],
  ["R05", "2030 UX 리서치", "생활 맥락·모바일 응답 과정"],
  ["R06", "편향·접근성", "문화·직업·관계·접근 차이"],
  ["R07", "보조 검토자", "중도 이탈·불일치 대비"],
  ["R08", "보조 검토자", "중도 이탈·불일치 대비"],
] as const;

const stage1Fields = [
  [
    "첫 번째 구성개념",
    "문항이 가장 직접적으로 묻는 성향을 코드북에서 하나 선택",
  ],
  ["두 번째 구성개념", "강한 겹침이 있을 때만 선택하고 없으면 NONE"],
  ["방향 추정", "HIGH·LOW·구분 어려움 중 선택"],
  ["명확성", "한 번 읽고 이해되는 정도를 1~4로 평가"],
  ["단일 반응성", "두 가지 이상을 한꺼번에 묻지 않는 정도"],
  ["보편성", "다양한 2030 사용자가 경험할 수 있는 장면인지"],
  ["응답척도 적합성", "최근 6개월 빈도 1~5로 답할 수 있는지"],
  ["좋아 보이는 방향", "한쪽이 더 착함·유능함처럼 보이는지"],
  ["위험 신호", "능력·직업·문화·관계·접근·임상·개인정보 오염"],
  ["근거 메모", "왜 그렇게 판단했는지 다른 검토자가 이해할 수 있게 기록"],
] as const;

const stage2Fields = [
  ["목표 관련성", "공개된 목표 성향을 실제로 직접 묻는지 1~4"],
  ["방향 적합성", "HIGH·LOW 방향이 문장 의미와 맞는지 1~4"],
  ["내용 범위 기여", "중복·일부 기여·중요 기여 중 선택"],
  ["인접 성향 분리", "가까운 다른 성향과 구분되는지 1~4"],
  ["최종 권고", "유지·문구 수정·구성개념 재작성·보류·제외"],
  ["최종 근거", "권고를 뒷받침하는 구체적 이유를 반드시 기록"],
] as const;

const reviewerScreeningChecks = [
  "검사 개발·심리측정·해당 전문 역할의 실제 경력과 최근 작업을 확인했나요?",
  "뉴앙 문항 작성·투자·고용·가족 관계 등 이해상충을 서면으로 공개했나요?",
  "다른 검토자 답을 보지 않고 독립적으로 3회 × 50문항을 완료할 수 있나요?",
  "Stage 1 세 회차가 잠길 때까지 목표 성향과 Stage 2를 보지 않기로 동의했나요?",
  "응답 파일·문항·코드북을 제3자에게 전달하지 않는 보관 규칙에 동의했나요?",
  "수정 요청과 마감 시간을 포함한 작업량·보상·중도 철회 조건을 확인했나요?",
] as const;

export function AdminMeasurementValidationGuide() {
  const gates = nextNuangCodeScheme.validationGates;
  const aiPrereview = summarizeAiMeasurementPrereview(
    initialAiMeasurementPrereviewRecords,
  );
  return (
    <>
      <section className={`${shared.panel} ${styles.releaseState}`}>
        <div className={styles.releaseHeadline}>
          <span className={styles.stateIcon}>
            <FileLock2 aria-hidden="true" size={22} strokeWidth={1.7} />
          </span>
          <div>
            <p>현재 측정 릴리스</p>
            <h2>{nextNuangCodeScheme.version}</h2>
            <span>
              후보 상태 · 실제 전문가·사용자·정량 근거가 승인되기 전 고객용 대표
              코드로 활성화되지 않습니다.
            </span>
          </div>
          <em>출시 차단 중</em>
        </div>
        <div className={styles.gates}>
          <Gate
            label="전문가·인지 검토"
            passed={isPassed(gates.cognitiveReview)}
          />
          <Gate
            label="공정성·측정불변성"
            passed={isPassed(gates.fairnessAndInvariance)}
          />
          <Gate
            label="정량 파일럿"
            passed={isPassed(gates.quantitativePilot)}
          />
          <Gate
            label="신뢰도·요인구조"
            passed={isPassed(gates.reliabilityAndStructure)}
          />
        </div>
      </section>

      <section className={`${shared.panel} ${styles.boundary}`}>
        <ShieldAlert aria-hidden="true" size={21} strokeWidth={1.7} />
        <div>
          <strong>기존 ‘문항 지표’ 화면과 전문가 검토는 다른 작업입니다</strong>
          <p>
            문항 지표는 일반 참여자의 판단 어려움·문구 불명확·답 변경 비율을
            봅니다. M04 전문가는 목표를 숨긴 문항을 독립적으로 분류하고, M05
            참여자는 문장을 어떻게 이해했는지 면담합니다. 셋 중 하나로 다른
            검증을 대신할 수 없습니다.
          </p>
        </div>
      </section>

      <section
        aria-label="AI 사전검토 상태"
        className={`${shared.panel} ${styles.boundary}`}
      >
        <ShieldAlert aria-hidden="true" size={21} strokeWidth={1.7} />
        <div>
          <strong>AI 사전검토 · 인간 검토나 승인이 아닙니다</strong>
          <p>
            현재 상태는 ‘{aiPrereview.label}’입니다. AI는 네 검토 트랙의
            체크리스트와 산출물 형식을 미리 점검하고 위험 가설을 정리할 수
            있지만, 위의 사람 검증 gate를 통과·승인·활성 상태로 바꾸지
            않습니다.
          </p>
        </div>
      </section>

      <section className={styles.workflow} aria-label="검사 검증 단계">
        <WorkflowStep
          action="전문가별 비공개 검토 폼"
          description="여섯 명 이상이 150문항을 독립 검토합니다. 세 blind 회차를 먼저 잠근 뒤 목표를 공개합니다."
          effect="완료되면 인지 인터뷰로 보낼 문항을 고를 수 있습니다. 운영 검사는 아직 바뀌지 않습니다."
          icon={UsersRound}
          label="M04 · 독립 전문가 검토"
          status="지금 시작할 단계"
        />
        <WorkflowStep
          action="관리자 → 인지 인터뷰 진행"
          description="참여자가 먼저 모바일 문항에 답하고, 진행자가 뜻·상황·판단 이유·편향을 질문합니다."
          effect="반복 오해가 없는 문항만 정량 파일럿 후보가 됩니다. 한 세션 승인만으로 통과하지 않습니다."
          href="/admin/research/cognitive-interview"
          icon={MessageSquareText}
          label="M05 · 사용자 인지 인터뷰"
          status="M04 판정 뒤 실행"
        />
        <WorkflowStep
          action="일반 참여 폼 + 문항 지표"
          description="개발·확인 표본을 분리해 응답 분포, 이탈, 판단 어려움과 문항 성능을 수집합니다."
          effect="충분한 표본과 사전 분석 계획이 확보됩니다. 자동 지표만으로 문항을 승인하지 않습니다."
          href="/research/gate-c"
          icon={BarChart3}
          label="M06 · 정량 파일럿"
          status="M05 통과 문항 확정 뒤"
        />
        <WorkflowStep
          action="측정 책임자 분석 보고서"
          description="EFA·CFA·오메가·재검사·DIF·집단별 측정불변성과 경계 코드 안정성을 검토합니다."
          effect="네 측정 gate와 결과 문구 근거가 모두 통과해야 validated 후보가 됩니다. 배포 승인은 별도입니다."
          icon={BadgeCheck}
          label="M07~M09 · 구조·공정성·채점 승인"
          status="정량 데이터 확보 뒤"
        />
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>M04 검토자 구성</h2>
          <span>8개 슬롯 · 최소 유효 6명</span>
        </div>
        <div className={styles.reviewerTable}>
          <div className={styles.tableHead}>
            <span>슬롯</span>
            <span>필요 역할</span>
            <span>주요 책임</span>
            <span>현재</span>
          </div>
          {reviewerSlots.map(([slot, role, responsibility]) => (
            <div className={styles.tableRow} key={slot}>
              <strong>{slot}</strong>
              <span>{role}</span>
              <small>{responsibility}</small>
              <em>섭외 전</em>
            </div>
          ))}
        </div>
        <p className={styles.tableNote}>
          검토자가 뉴앙 문항을 직접 작성했거나 다른 검토자 답을 볼 수 있다면
          독립 검토자 수에 포함하지 않습니다. 이름·연락처·보상 정보는 문항 응답
          파일과 분리해 보관합니다.
        </p>
        <div className={styles.reviewerScreening}>
          <div>
            <strong>후보에게 보내기 전 확인할 6가지</strong>
            <p>
              대학·연구기관, 검사 개발 실무자, UX 리서치·접근성 전문가
              네트워크에서 후보를 찾되 소속보다 실제 역할 경험과 독립성을
              확인합니다.
            </p>
          </div>
          <ol>
            {reviewerScreeningChecks.map((check, index) => (
              <li key={check}>
                <span>{index + 1}</span>
                {check}
              </li>
            ))}
          </ol>
          <small>
            검토자는 문항별 권고와 근거를 제출합니다. 운영 배포를 승인하는
            사람은 검토자가 아니라, 모든 독립 응답과 소수 위험 의견을 확인한
            측정 책임자입니다. 문항 작성자가 유일한 최종 승인자가 되어서는 안
            됩니다.
          </small>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.reviewProtocol}`}>
        <div className={shared.panelHeader}>
          <h2>검토자가 실제로 보는 화면과 항목</h2>
          <span>상황 라벨 + 질문 · 50문항씩 3회</span>
        </div>
        <div className={styles.stageGrid}>
          <section>
            <header>
              <span>1</span>
              <div>
                <strong>Stage 1 · 목표를 숨긴 검토</strong>
                <small>목표 축·정답 방향·내부 역할을 보여주지 않습니다.</small>
              </div>
            </header>
            <FieldList fields={stage1Fields} />
            <p>
              W1·W2·W3를 모두 제출하고 원본 해시를 잠글 때까지 Stage 2 파일을
              보내지 않습니다.
            </p>
          </section>
          <section>
            <header>
              <span>2</span>
              <div>
                <strong>Stage 2 · 목표 공개 후 검토</strong>
                <small>
                  잠긴 Stage 1을 수정하지 않은 상태에서 다시 판단합니다.
                </small>
              </div>
            </header>
            <FieldList fields={stage2Fields} />
            <p>
              여섯 명 이상이 모두 완료해도 개별 권고가 곧 최종 승인은 아닙니다.
              측정 책임자가 불일치와 소수 위험까지 판정합니다.
            </p>
          </section>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.formDelivery}`}>
        <div className={shared.panelHeader}>
          <h2>외부 검토자 화면 준비 방법</h2>
          <span>관리자 계정 공유 금지 · 검토자별 오프라인 웹 폼</span>
        </div>
        <div>
          <p>
            외부 검토자는 뉴앙 관리자에 로그인하지 않습니다. 운영자가 아래
            명령으로 검토자별 HTML 폼을 만들고, 해당 슬롯·회차 파일 하나만
            안전한 방식으로 전달합니다. 폼은 브라우저 안에만 자동 저장되고 완료
            시 응답 CSV를 내려받습니다.
          </p>
          <code>
            npm run research:core:review-web-forms -- --output-root
            /검토폼을-보관할-절대경로
          </code>
          <p>
            세 Stage 1 응답을 모두 검증하고 잠근 뒤에만 Stage 2를 생성합니다.
          </p>
          <code>
            npm run research:core:review-web-forms:stage2 -- --output-root
            /검토폼을-보관할-절대경로
          </code>
          <small>
            Stage 2 폼에는 목표 성향과 방향이 들어 있습니다. 폴더 전체를 보내지
            말고 같은 검토자의 같은 회차 파일만 전달하세요.
          </small>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.operatorRunbook}`}>
        <div className={shared.panelHeader}>
          <h2>운영자가 그대로 따라 하는 순서</h2>
          <span>순서를 바꾸면 blind 검토가 무효가 될 수 있습니다</span>
        </div>
        <ol>
          <RunbookRow
            index="01"
            title="책임자·검토자 후보 확인"
            description="경력, 역할, 문항 작성 참여 여부, 이해상충을 확인합니다. 검토 시작 전 사전등록과 데이터 보관 규칙을 측정 책임자가 승인합니다."
          />
          <RunbookRow
            index="02"
            title="검토자별 Stage 1 폼 전달"
            description="R01~R08 중 한 슬롯만 배정하고 W1부터 하나씩 보냅니다. 다른 슬롯, 정답표, 내부 폴더는 공유하지 않습니다."
          />
          <RunbookRow
            index="03"
            title="필수 입력·파일 해시 확인 후 잠금"
            description="50문항 모든 필드가 채워졌는지 검사하고 원본 SHA-256을 기록합니다. 받은 파일을 고쳐서 다시 저장하지 않습니다."
          />
          <RunbookRow
            index="04"
            title="세 회차가 모두 잠긴 사람만 Stage 2 공개"
            description="R01의 W1·W2·W3가 모두 잠기면 R01의 Stage 2만 보냅니다. 다른 검토자 결과나 집계는 보여주지 않습니다."
          />
          <RunbookRow
            index="05"
            title="유효 검토자 6명 이상 집계·최종 판정"
            description="자동 집계는 제안일 뿐입니다. 접근성·낙인·개인정보 위험과 소수 의견을 측정 책임자가 원문까지 확인합니다."
          />
        </ol>
      </section>

      <section className={`${shared.panel} ${styles.approvalEffect}`}>
        <ClipboardCheck aria-hidden="true" size={22} strokeWidth={1.7} />
        <div>
          <strong>‘최종 승인’ 버튼이 의미해야 하는 것</strong>
          <p>
            M04 승인은 통과·수정된 문항을 M05 사용자 인터뷰로 넘길 수 있다는
            뜻입니다. M05 승인은 정량 파일럿 모집을 열 수 있다는 뜻입니다.
            M07~M09 보고서와 법률·개인정보·운영 QA까지 끝나기 전에는 고객용
            코드·점수·리포트가 자동 발행되지 않습니다.
          </p>
        </div>
      </section>
    </>
  );
}

function isPassed(status: MeasurementGateStatus) {
  return status === "passed";
}

function Gate({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div data-passed={passed}>
      <span aria-hidden="true">{passed ? "통과" : "대기"}</span>
      <strong>{label}</strong>
      <small>{passed ? "승인 완료" : "검증 전"}</small>
    </div>
  );
}

function WorkflowStep({
  action,
  description,
  effect,
  href,
  icon: Icon,
  label,
  status,
}: {
  action: string;
  description: string;
  effect: string;
  href?: string;
  icon: typeof UsersRound;
  label: string;
  status: string;
}) {
  const content = (
    <>
      <div className={styles.workflowIcon}>
        <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
      </div>
      <div className={styles.workflowCopy}>
        <span>{status}</span>
        <strong>{label}</strong>
        <p>{description}</p>
        <dl>
          <div>
            <dt>사용 화면</dt>
            <dd>{action}</dd>
          </div>
          <div>
            <dt>승인하면</dt>
            <dd>{effect}</dd>
          </div>
        </dl>
      </div>
      {href ? <ArrowRight aria-hidden="true" size={18} /> : null}
    </>
  );
  return href ? (
    <Link className={styles.workflowStep} href={href}>
      {content}
    </Link>
  ) : (
    <article className={styles.workflowStep}>{content}</article>
  );
}

function FieldList({
  fields,
}: {
  fields: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <dl className={styles.fieldList}>
      {fields.map(([label, description]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function RunbookRow({
  description,
  index,
  title,
}: {
  description: string;
  index: string;
  title: string;
}) {
  return (
    <li>
      <span>{index}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </li>
  );
}
