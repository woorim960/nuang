import { BottomNavigation } from "@/components/layout/BottomNavigation";
import styles from "./loading.module.css";

export default function FeedLoading() {
  return (
    <div className={styles.shell}>
      <main aria-busy="true" className={styles.page}>
        <header className={styles.header}>
          <div>
            <span>NUANG</span>
            <strong>커뮤니티</strong>
          </div>
          <i aria-hidden="true" />
        </header>

        <nav aria-hidden="true" className={styles.tabs}>
          <span>추천</span>
          <span>데칼코마니</span>
          <span>놀이터</span>
          <i />
        </nav>

        <div aria-hidden="true" className={styles.composer}>
          <i />
          <span />
          <b />
        </div>

        <section aria-label="커뮤니티를 불러오는 중" className={styles.feed}>
          {[0, 1].map((item) => (
            <article aria-hidden="true" className={styles.post} key={item}>
              <header>
                <i />
                <span>
                  <b />
                  <em />
                </span>
              </header>
              <p />
              <div />
              <footer>
                <i />
                <i />
                <i />
              </footer>
            </article>
          ))}
        </section>
      </main>
      <BottomNavigation />
    </div>
  );
}
