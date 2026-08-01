import styles from "./NuangOperatorBadge.module.css";

export function NuangOperatorBadge({
  compact = false,
}: {
  compact?: boolean;
}) {
  const label = compact ? "운영자" : "뉴앙 운영자";

  return (
    <span
      aria-label="뉴앙 공식 운영자 계정"
      className={styles.badge}
      data-compact={compact}
      title="뉴앙 공식 운영자 계정"
    >
      <svg
        aria-hidden="true"
        className={styles.mark}
        viewBox="0 0 20 20"
      >
        <path
          d="M5.2 14.7V5.3l9.6 9.4V5.3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.15"
        />
        <path
          d="M3.35 10A6.65 6.65 0 0 1 10 3.35"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.45"
        />
        <circle cx="15.65" cy="4.35" fill="currentColor" r="1.35" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
