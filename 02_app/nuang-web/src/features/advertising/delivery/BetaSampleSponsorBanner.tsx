import Image from "next/image";
import Link from "next/link";
import styles from "./BetaSampleSponsorBanner.module.css";

export function BetaSampleSponsorBanner({
  preview = false,
}: {
  preview?: boolean;
}) {
  return (
    <section
      aria-label="광고 예시"
      className={styles.slot}
      data-preview={preview}
    >
      <div className={styles.slotHeader}>
        <span>광고 · 예시</span>
        <small>베타 화면 미리보기</small>
      </div>
      <Link
        aria-label="뉴앙 광고 안내 보기"
        className={styles.banner}
        href="/advertise"
      >
        <Image
          alt="따뜻한 빛 아래 자두색 차와 차분한 도자기가 놓인 광고 예시"
          className={styles.artwork}
          fill
          loading="lazy"
          quality={75}
          sizes="(max-width: 767px) calc(100vw - 40px), 640px"
          src="/images/advertising/nuang-beta-sample-plum-tea-v1.webp"
        />
        <span className={styles.copy}>
          <small>NUANG BETA SAMPLE</small>
          <strong>잠깐 쉬어가는 한 잔</strong>
          <span>광고가 들어오면 이 자리에 보여요</span>
          <em>광고 안내 보기</em>
        </span>
      </Link>
    </section>
  );
}
