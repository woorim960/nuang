import styles from "@/features/admin/AdminShell.module.css";

export default function AdminLoading() {
  return (
    <div aria-live="polite" className={styles.loading}>
      <span aria-hidden="true" />
      <strong>운영 정보를 불러오는 중</strong>
    </div>
  );
}
