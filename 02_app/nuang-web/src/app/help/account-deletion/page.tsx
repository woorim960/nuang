import { ArrowLeft, Check, Mail, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicPageMetadata } from "@/features/seo/site-config";
import styles from "./page.module.css";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "뉴앙 계정과 연결된 데이터를 앱 또는 웹에서 영구 삭제하는 방법과 삭제 범위를 확인하세요.",
  path: "/help/account-deletion",
  title: "계정과 데이터 삭제",
});

export default function AccountDeletionHelpPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="고객지원으로 돌아가기" href="/support">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <h1>계정과 데이터 삭제</h1>
        <span aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <span className={styles.heroIcon}>
          <Trash2 aria-hidden="true" size={24} strokeWidth={1.65} />
        </span>
        <p>뉴앙 계정을 더 이상 이용하지 않는다면</p>
        <h2>앱을 다시 설치하지 않아도 계정을 삭제할 수 있어요.</h2>
      </section>

      <section aria-labelledby="delete-path-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>1</span>
          <div>
            <p>가장 빠른 방법</p>
            <h2 id="delete-path-title">로그인하고 바로 삭제하기</h2>
          </div>
        </div>
        <ol className={styles.steps}>
          <li>뉴앙 계정으로 로그인해요.</li>
          <li>마이 → 설정 → 로그인 계정 → 계정 삭제로 이동해요.</li>
          <li>안내를 읽고 ‘계정 삭제’를 입력해 영구 삭제를 확정해요.</li>
        </ol>
        <Link
          className={styles.primaryAction}
          href="/login?next=/my/settings/account/delete&reason=account_delete"
        >
          로그인하고 계정 삭제
        </Link>
      </section>

      <section aria-labelledby="delete-email-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>2</span>
          <div>
            <p>로그인이 어려울 때</p>
            <h2 id="delete-email-title">이메일로 삭제 요청하기</h2>
          </div>
        </div>
        <p className={styles.bodyCopy}>
          가입에 사용한 로그인 제공자(Google 또는 Kakao)와 연락 가능한 이메일을
          적어 보내주세요. 다른 사람의 계정을 삭제하지 않도록 본인 확인을 요청할
          수 있으며, 확인 후 보통 1~3일 안에 처리 결과를 알려드려요.
        </p>
        <a
          className={styles.secondaryAction}
          href="mailto:woorimprog@gmail.com?subject=%EB%89%B4%EC%95%99%20%EA%B3%84%EC%A0%95%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD"
        >
          <Mail aria-hidden="true" size={18} strokeWidth={1.7} />
          삭제 요청 이메일 보내기
        </a>
        <p className={styles.email}>woorimprog@gmail.com</p>
      </section>

      <section aria-labelledby="delete-scope-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.checkIcon}>
            <ShieldCheck aria-hidden="true" size={19} strokeWidth={1.7} />
          </span>
          <div>
            <p>삭제되는 내용</p>
            <h2 id="delete-scope-title">계정에 연결된 데이터를 함께 지워요</h2>
          </div>
        </div>
        <ul className={styles.scopeList}>
          {[
            "프로필과 로그인 연결 정보",
            "검사 답변·결과·비교 기록",
            "게시물·댓글·반응·관계 기록",
            "비공개 연락처와 동의·분석 기록",
          ].map((item) => (
            <li key={item}>
              <Check aria-hidden="true" size={16} strokeWidth={1.9} />
              {item}
            </li>
          ))}
        </ul>
        <p className={styles.notice}>
          삭제가 끝나면 복구할 수 없어요. 같은 Google·Kakao 계정으로 다시 가입할
          수 있지만 이전 기록은 새 계정에 이어지지 않아요. 실제 결제·민원 기록
          등에 법적 보존 의무가 있는 경우에만 필요한 최소 기록을 다른 데이터와
          분리해 정해진 기간 보관한 뒤 삭제합니다.
        </p>
      </section>

      <footer className={styles.footer}>
        <p>운영 주체 딱좋은라이프 · 뉴앙</p>
        <div>
          <Link href="/policies/privacy">개인정보 처리방침</Link>
          <Link href="/support">고객지원</Link>
        </div>
      </footer>
    </main>
  );
}
