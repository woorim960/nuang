export default function BalanceGameRoomLoading() {
  return (
    <main
      aria-label="밸런스 게임 방을 불러오는 중"
      aria-live="polite"
      style={{
        display: "grid",
        width: "min(100%, 430px)",
        minHeight: "100dvh",
        margin: "0 auto",
        placeItems: "center",
        color: "var(--nu-color-text-muted)",
        background: "var(--nu-color-app-bg)",
        fontSize: "var(--nu-text-label)",
      }}
    >
      함께 고를 질문을 준비하고 있어요
    </main>
  );
}
