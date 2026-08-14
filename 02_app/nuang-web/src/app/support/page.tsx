import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicPageMetadata } from "@/features/seo/site-config";
import styles from "./page.module.css";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "뉴앙 서비스 문의, 개인정보 문의, 계정 삭제와 정책 안내를 한곳에서 확인하세요.",
  path: "/support",
  title: "고객지원",
});

const supportEmail = "woorimprog@gmail.com";
const supportPhone = "010-2515-0939";

export default function SupportPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="뉴앙 홈으로 돌아가기" href="/home">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <h1>고객지원</h1>
        <span aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <p>뉴앙을 이용하다 궁금한 점이 있나요?</p>
        <h2>필요한 도움을 바로 확인하세요.</h2>
        <span>문의는 보통 1~3일 안에 확인해요.</span>
      </section>

      <section aria-labelledby="support-contact-title" className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2 id="support-contact-title">문의하기</h2>
          <p>서비스와 개인정보 문의를 같은 창구에서 받고 있어요.</p>
        </div>
        <div className={styles.contactList}>
          <a href={`mailto:${supportEmail}`}>
            <span className={styles.icon}>
              <Mail aria-hidden="true" size={20} strokeWidth={1.7} />
            </span>
            <span>
              <small>이메일</small>
              <strong>{supportEmail}</strong>
            </span>
          </a>
          <a href="tel:+821025150939">
            <span className={styles.icon}>
              <Phone aria-hidden="true" size={20} strokeWidth={1.7} />
            </span>
            <span>
              <small>전화</small>
              <strong>{supportPhone}</strong>
            </span>
          </a>
        </div>
      </section>

      <section aria-labelledby="support-manage-title" className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2 id="support-manage-title">계정과 개인정보</h2>
          <p>앱을 다시 설치하지 않아도 웹에서 확인할 수 있어요.</p>
        </div>
        <nav aria-label="계정과 개인정보 도움말" className={styles.linkList}>
          <Link href="/help/account-deletion">
            <span>
              <strong>계정과 데이터 삭제</strong>
              <small>삭제 범위와 신청 방법 확인</small>
            </span>
            <ChevronRight aria-hidden="true" size={19} strokeWidth={1.65} />
          </Link>
          <Link href="/policies/privacy">
            <span>
              <strong>개인정보 처리방침</strong>
              <small>수집·이용·보관 기준 확인</small>
            </span>
            <ChevronRight aria-hidden="true" size={19} strokeWidth={1.65} />
          </Link>
          <Link href="/policies/terms">
            <span>
              <strong>서비스 이용약관</strong>
              <small>뉴앙 이용 기준 확인</small>
            </span>
            <ChevronRight aria-hidden="true" size={19} strokeWidth={1.65} />
          </Link>
        </nav>
      </section>

      <section aria-labelledby="support-operator-title" className={styles.operator}>
        <div className={styles.operatorHeading}>
          <Building2 aria-hidden="true" size={20} strokeWidth={1.65} />
          <h2 id="support-operator-title">운영자 정보</h2>
        </div>
        <dl>
          <div>
            <dt>운영 주체</dt>
            <dd>딱좋은라이프</dd>
          </div>
          <div>
            <dt>대표자</dt>
            <dd>박우림</dd>
          </div>
          <div>
            <dt>사업자등록번호</dt>
            <dd>768-75-00424</dd>
          </div>
          <div>
            <dt>사업장 주소</dt>
            <dd>
              경기도 파주시 고봉로 755-27, 201-E280호
              <br />
              (상지석동, 갤러리하우스상가)
            </dd>
          </div>
        </dl>
        <p className={styles.trustLine}>
          <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.7} />
          스토어 등록 정보와 같은 실제 운영 정보를 표시합니다.
        </p>
      </section>
    </main>
  );
}
