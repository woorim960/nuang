import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "@/features/onboarding/OnboardingGuideCarousel.module.css";

export type GuideScene = "code" | "start" | "together" | "welcome";

const illustrationAssets = {
  code: {
    height: 1200,
    src: "/assets/onboarding-v3/nuang-onboarding-v3-code.webp",
    width: 800,
  },
  start: {
    height: 800,
    src: "/assets/onboarding-v3/nuang-onboarding-v3-start.webp",
    width: 1200,
  },
  together: {
    height: 800,
    src: "/assets/onboarding-v3/nuang-onboarding-v3-together.webp",
    width: 1200,
  },
  welcome: {
    height: 1200,
    src: "/assets/onboarding-v3/nuang-onboarding-v3-welcome.webp",
    width: 800,
  },
} as const;

export function OnboardingGuideScene({
  active,
  scene,
}: {
  active: boolean;
  scene: GuideScene;
}) {
  const asset = illustrationAssets[scene];

  return (
    <div
      aria-hidden="true"
      className={styles.scene}
      data-active={active}
      data-guide-scene={scene}
    >
      <span className={styles.sceneHalo} />
      <span className={styles.sceneOrbit} />
      <Image
        alt=""
        className={styles.illustration}
        draggable={false}
        height={asset.height}
        priority={scene === "welcome"}
        sizes="(max-width: 520px) 86vw, 420px"
        src={asset.src}
        width={asset.width}
      />
      {scene === "code" ? <CodePulse /> : null}
      {scene === "together" ? <ConnectionSpark /> : null}
      {scene === "start" ? <StartTrail /> : null}
    </div>
  );
}

function CodePulse() {
  return (
    <span className={styles.codePulse}>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} style={{ "--pulse-index": index } as CSSProperties} />
      ))}
    </span>
  );
}

function ConnectionSpark() {
  return <span className={styles.connectionSpark}>✦</span>;
}

function StartTrail() {
  return (
    <span className={styles.startTrail}>
      <i />
      <i />
      <i />
    </span>
  );
}
