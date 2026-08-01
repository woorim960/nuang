import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import styles from "./AdvertisingPublicHeader.module.css";

export function AdvertisingPublicHeader({
  backHref,
  backLabel,
  compact = false,
}: {
  backHref?: string;
  backLabel?: string;
  compact?: boolean;
}) {
  return (
    <header className={styles.header} data-compact={compact || undefined}>
      <div className={styles.inner}>
        {backHref ? (
          <Link
            aria-label={backLabel ?? "광고·제휴 안내로 돌아가기"}
            className={styles.back}
            href={backHref}
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.8} />
          </Link>
        ) : (
          <Link className={styles.brand} href="/home">
            <span aria-hidden="true">N</span>
            <span>
              <strong>NUANG</strong>
              <small>BRAND PARTNERSHIPS</small>
            </span>
          </Link>
        )}

        {backHref ? (
          <Link className={styles.compactBrand} href="/advertise">
            <strong>NUANG</strong>
            <small>광고·제휴</small>
          </Link>
        ) : null}

        {compact ? (
          <span aria-hidden="true" className={styles.headerSpacer} />
        ) : (
          <Link className={styles.inquiry} href="/advertise/inquiry">
            문의하기
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.9} />
          </Link>
        )}
      </div>
    </header>
  );
}
