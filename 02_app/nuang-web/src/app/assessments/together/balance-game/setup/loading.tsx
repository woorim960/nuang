export default function BalanceGameSetupLoading() {
  return (
    <main
      aria-label="방 설정을 불러오는 중"
      aria-live="polite"
      style={{
        display: "grid",
        minHeight: "100dvh",
        placeItems: "center",
        color: "var(--nu-color-text-muted)",
        background: "var(--nu-color-app-bg)",
        fontSize: "var(--nu-text-label)",
      }}
    >
      방 설정을 준비하고 있어요
    </main>
  );
}
