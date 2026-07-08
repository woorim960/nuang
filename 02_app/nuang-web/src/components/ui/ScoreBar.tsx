import { cn } from "@/lib/utils/cn";

type ScoreBarProps = {
  label: string;
  value: number;
  tone?: "primary" | "flame" | "sun" | "water" | "forest";
};

const toneClass = {
  primary: "bg-primary",
  flame: "bg-flame",
  sun: "bg-sun",
  water: "bg-water",
  forest: "bg-forest",
};

export function ScoreBar({ label, value, tone = "primary" }: ScoreBarProps) {
  const boundedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-label={`${label} 점수`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={boundedValue}
      aria-valuetext={`${boundedValue}점`}
      className="grid gap-2"
      role="meter"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted">{boundedValue}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#eceaf4]">
        <div
          aria-hidden="true"
          className={cn("h-full rounded-full", toneClass[tone])}
          style={{ width: `${boundedValue}%` }}
        />
      </div>
    </div>
  );
}
