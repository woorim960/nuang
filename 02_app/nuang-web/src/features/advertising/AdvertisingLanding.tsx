import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AdvertisingPublicHeader } from "./AdvertisingPublicHeader";
import styles from "./AdvertisingLanding.module.css";

const products = [
  {
    index: "01",
    label: "인라인 배너",
    title: "콘텐츠의 흐름을 지키는 브랜드 노출",
    description:
      "핵심 경험을 충분히 본 뒤, 명확히 구분된 위치에서 브랜드를 소개합니다.",
    status: "초기 운영 상품",
  },
  {
    index: "02",
    label: "문맥형 제휴 카드",
    title: "읽는 맥락과 자연스럽게 이어지는 제안",
    description:
      "운영자가 직접 확인한 소재만 사용하며 개인의 성향이나 검사 결과로 상품을 추천하지 않습니다.",
    status: "초기 운영 상품",
  },
  {
    index: "03",
    label: "브랜드 함께하기 팩",
    title: "함께 즐기며 기억되는 참여형 협업",
    description:
      "뉴앙의 함께하기 경험에 어울리는 브랜드 콘텐츠를 공동으로 기획합니다.",
    status: "파트너 공동 기획",
  },
] as const;

const principles = [
  {
    title: "개인 성향 데이터는 광고에 사용하지 않습니다",
    description:
      "검사 답변, 뉴앙 코드, 결과 리포트와 궁합 정보는 광고 타기팅이나 광고주 리포트에 제공하지 않습니다.",
  },
  {
    title: "검사와 결과의 집중을 지킵니다",
    description:
      "검사 문항, 결과 리포트, 함께하기 게임 진행 화면에는 광고를 배치하지 않습니다.",
  },
  {
    title: "모든 협업은 기준을 먼저 확인합니다",
    description:
      "전 연령 서비스에 맞지 않는 업종과 표현을 제한하고, 소재와 이동 페이지를 집행 전에 검수합니다.",
  },
] as const;

const steps = [
  ["01", "문의", "목표와 일정, 예산 범위를 알려주세요."],
  ["02", "검토", "서비스 적합성과 가능한 상품을 확인합니다."],
  ["03", "제안", "위치와 운영 방식, 일정을 구체화합니다."],
  ["04", "검수", "소재와 연결 화면을 안전 기준에 맞춰 확인합니다."],
  ["05", "집행·리포트", "합의한 지표를 집계해 결과를 공유합니다."],
] as const;

const faqs = [
  {
    question: "정해진 최소 예산이 있나요?",
    answer:
      "현재는 초기 파트너와 상품을 함께 설계하고 있어 고정된 최소 예산을 안내하지 않습니다. 목표와 일정, 예산 범위를 보내주시면 가능한 방식을 제안드려요.",
  },
  {
    question: "어떤 성과 자료를 받을 수 있나요?",
    answer:
      "캠페인 단위의 노출과 방문 같은 집계 지표를 제공합니다. 개인의 검사 답변, 뉴앙 코드, 결과 리포트와 같은 성향 데이터는 제공하지 않습니다.",
  },
  {
    question: "소재가 아직 없어도 문의할 수 있나요?",
    answer:
      "가능합니다. 문의 폼에서 ‘공동 기획 필요’를 선택해 주세요. 서비스 맥락과 브랜드 안전 기준에 맞는 표현부터 함께 정리할 수 있습니다.",
  },
  {
    question: "모든 업종이 집행 가능한가요?",
    answer:
      "전 연령 서비스의 안전과 신뢰를 해칠 수 있는 성인, 도박, 담배, 고금리 대출, 과장 의료·다이어트 등은 진행하지 않습니다. 문의 접수 후 제품과 이동 페이지까지 함께 검토합니다.",
  },
] as const;

export function AdvertisingLanding() {
  return (
    <main className={styles.page}>
      <AdvertisingPublicHeader />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>NUANG BRAND PARTNERSHIPS</p>
          <h1>
            뉴앙과 함께,
            <br />
            서로를 이해하는 브랜드 경험을 만들어보세요.
          </h1>
          <p className={styles.heroDescription}>
            뉴앙은 성향 검사와 함께하기 놀이, 커뮤니티를 통해 사람들이
            자신과 서로를 알아가는 서비스입니다. 사용자 경험과 개인정보를
            지키는 범위에서 오래 기억되는 브랜드 접점을 만듭니다.
          </p>
          <div className={styles.heroActions}>
            <Link href="/advertise/inquiry">
              광고·제휴 문의하기
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
            <a href="#partnership-products">상품 살펴보기</a>
          </div>
        </div>

        <aside className={styles.trustPanel} aria-label="뉴앙 협업 원칙 요약">
          <p>PARTNERSHIP STANDARD</p>
          <strong>사용자의 신뢰가 먼저인 광고</strong>
          <ul>
            <li>
              <Check aria-hidden="true" size={16} /> 개인 성향 데이터 미제공
            </li>
            <li>
              <Check aria-hidden="true" size={16} /> 검사·결과 핵심 화면 보호
            </li>
            <li>
              <Check aria-hidden="true" size={16} /> 모든 소재 사전 검수
            </li>
          </ul>
          <p className={styles.earlyPartner}>
            초기 파트너와 뉴앙다운 상품을 함께 설계합니다.
          </p>
        </aside>
      </section>

      <section className={styles.statement}>
        <span>나를 이해하고, 서로를 이해하는 성향 놀이터</span>
        <p>
          브랜드가 크게 보이는 것보다, 사람들의 흐름 안에서 바르게
          기억되는 방식을 고민합니다.
        </p>
      </section>

      <section className={styles.section} id="partnership-products">
        <div className={styles.sectionHeading}>
          <p>PARTNERSHIP PRODUCTS</p>
          <h2>뉴앙의 경험을 해치지 않는 세 가지 협업</h2>
          <span>
            제품과 일정에 따라 가장 적합한 방식부터 함께 검토합니다.
          </span>
        </div>
        <div className={styles.productGrid}>
          {products.map((product) => (
            <article key={product.index}>
              <div>
                <span>{product.index}</span>
                <small>{product.status}</small>
              </div>
              <p>{product.label}</p>
              <h3>{product.title}</h3>
              <span>{product.description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.safetySection}>
        <div className={styles.safetyIntro}>
          <ShieldCheck aria-hidden="true" size={25} strokeWidth={1.55} />
          <p>BRAND SAFETY</p>
          <h2>신뢰를 지키는 기준은 협업 전부터 분명합니다.</h2>
          <span>
            뉴앙의 성향 정보는 사용자가 자신을 이해하기 위한 것입니다.
            광고 효율을 위해 개인을 분류하는 데 사용하지 않습니다.
          </span>
        </div>
        <div className={styles.principleList}>
          {principles.map((principle, index) => (
            <article key={principle.title}>
              <span>0{index + 1}</span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p>PROCESS</p>
          <h2>문의부터 집행까지, 확인 가능한 과정으로 진행합니다.</h2>
        </div>
        <ol className={styles.process}>
          {steps.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.faqHeading}>
          <BadgeCheck aria-hidden="true" size={24} strokeWidth={1.6} />
          <p>FAQ</p>
          <h2>문의 전에 자주 확인하는 내용</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <ChevronDown aria-hidden="true" size={19} strokeWidth={1.7} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.closing}>
        <p>START A CONVERSATION</p>
        <h2>브랜드와 사용자 모두에게 좋은 접점을 함께 찾아보세요.</h2>
        <span>
          문의를 보내주시면 영업일 기준 1~2일 안에 업무 이메일로
          연락드릴게요.
        </span>
        <Link href="/advertise/inquiry">
          문의 작성하기
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
        </Link>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>NUANG</strong>
          <span>나를 이해하고, 서로를 이해하는 성향 놀이터</span>
        </div>
        <nav aria-label="광고 안내 하단 메뉴">
          <Link href="/home">뉴앙 홈</Link>
          <Link href="/policies/privacy">개인정보 처리방침</Link>
          <Link href="/advertise/inquiry">광고·제휴 문의</Link>
        </nav>
      </footer>
    </main>
  );
}
