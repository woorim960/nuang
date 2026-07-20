import Image from "next/image";
import styles from "@/components/navigation/NuangRouteLoadingScreen.module.css";

export function NuangRouteLoadingScreen({
  overlay = false,
}: {
  overlay?: boolean;
}) {
  return (
    <div
      aria-busy="true"
      className={`${styles.root} ${overlay ? styles.overlay : styles.page}`}
      data-nuang-route-loading="true"
    >
      <div className={styles.surface}>
        <div aria-hidden="true" className={styles.progressTrack}>
          <span />
        </div>

        <section className={styles.content}>
          <div aria-hidden="true" className={styles.visual}>
            <span className={styles.glow} />
            <span className={`${styles.signal} ${styles.signalOne}`} />
            <span className={`${styles.signal} ${styles.signalTwo}`} />
            <span className={`${styles.signal} ${styles.signalThree}`} />
            <span className={`${styles.signal} ${styles.signalFour}`} />
            <span className={`${styles.signal} ${styles.signalFive}`} />
            <span className={styles.mascotShadow} />
            <Image
              alt=""
              className={styles.mascot}
              height={512}
              priority
              src="/assets/assessment/nuang-loading-mascot-v2.png"
              width={512}
            />
          </div>

          <div className={styles.copy}>
            <p className={styles.wordmark}>NUANG</p>
            <h1>다음 화면을 준비하고 있어요</h1>
            <p>준비가 끝나면 바로 이어서 보여드릴게요.</p>
            <div aria-live="polite" className={styles.status} role="status">
              <span aria-hidden="true" className={styles.statusDot} />
              화면 연결 중
              <span aria-hidden="true" className={styles.ellipsis}>
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
