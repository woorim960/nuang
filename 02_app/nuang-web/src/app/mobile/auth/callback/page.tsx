import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { follow: false, index: false },
  title: "앱 로그인 연결 | 뉴앙",
};

export default function MobileAuthCallbackFallbackPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.brand}>NUANG</p>
        <p className={styles.eyebrow}>앱 로그인 연결</p>
        <h1>뉴앙 앱에서 로그인을 마무리해 주세요</h1>
        <p className={styles.description}>
          이 주소는 모바일 앱으로 돌아가기 위한 전용 경로예요. 앱이 설치되어
          있지 않거나 연결이 끝나지 않았다면 웹 로그인으로 안전하게 다시 시작할
          수 있어요.
        </p>
        <Link className={styles.primary} href="/login?reason=mobile_auth_fallback">
          웹에서 로그인하기
        </Link>
        <Link className={styles.secondary} href="/home">
          뉴앙 홈으로 가기
        </Link>
        <p className={styles.note}>
          로그인 코드나 계정 정보는 이 화면에 표시하거나 저장하지 않아요.
        </p>
      </section>
    </main>
  );
}
