import { useId } from "react";

export type TraitRadarAxis = {
  id: string;
  label: string;
  shortLabel?: string;
  value: number | null;
};

type TraitRadarChartProps = {
  axes: TraitRadarAxis[];
  ariaLabel: string;
  caption?: string;
  centerLabel?: string;
};

const size = 300;
const center = size / 2;
const radius = 92;
const labelRadius = 124;
const rings = [0.2, 0.4, 0.6, 0.8, 1];
const axisColors = [
  "var(--flame)",
  "var(--sun)",
  "var(--water)",
  "var(--forest)",
  "var(--primary)",
  "var(--flame)",
  "var(--sun)",
  "var(--water)",
  "var(--forest)",
  "var(--primary)",
];

export function TraitRadarChart({
  axes,
  ariaLabel,
  caption,
  centerLabel,
}: TraitRadarChartProps) {
  const gradientId = useId();
  const glowId = useId();
  const points = axes.map((axis, index) => {
    const ratio = clampScore(axis.value) / 100;
    return toPoint(index, axes.length, radius * ratio);
  });
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const fallbackText = axes
    .map((axis) => `${axis.label} ${Math.round(clampScore(axis.value))}점`)
    .join(", ");

  return (
    <figure className="grid gap-2">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto w-full max-w-[330px]"
        role="img"
        viewBox={`0 0 ${size} ${size}`}
      >
        <desc>{fallbackText}</desc>
        <defs>
          <radialGradient id={glowId} cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="56%" stopColor="var(--water)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={gradientId} x1="54" x2="246" y1="45" y2="250">
            <stop offset="0%" stopColor="var(--flame)" stopOpacity="0.38" />
            <stop offset="28%" stopColor="var(--sun)" stopOpacity="0.32" />
            <stop offset="58%" stopColor="var(--water)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} fill={`url(#${glowId})`} r="120" />

        {rings.map((ring) => (
          <polygon
            className="fill-white/60 stroke-line"
            key={ring}
            points={axes
              .map((_, index) => {
                const point = toPoint(index, axes.length, radius * ring);
                return `${point.x},${point.y}`;
              })
              .join(" ")}
            strokeDasharray={ring === 1 ? undefined : "3 4"}
            strokeWidth={ring === 1 ? 1.6 : 1}
          />
        ))}

        {axes.map((axis, index) => {
          const end = toPoint(index, axes.length, radius);
          const labelPoint = toPoint(index, axes.length, labelRadius);
          const color = axisColors[index % axisColors.length];
          const anchor = getTextAnchor(labelPoint.x);
          const valueLabel =
            axis.value === null ? "대기" : `${Math.round(clampScore(axis.value))}`;

          return (
            <g key={axis.id}>
              <line
                className="stroke-line"
                strokeWidth="1"
                x1={center}
                x2={end.x}
                y1={center}
                y2={end.y}
              />
              <circle cx={end.x} cy={end.y} fill={color} r="3.5" />
              <text
                className="fill-foreground text-[10px] font-black"
                dominantBaseline="middle"
                textAnchor={anchor}
                x={labelPoint.x}
                y={labelPoint.y - 5}
              >
                {axis.shortLabel ?? axis.label}
              </text>
              <text
                className="fill-muted text-[8px] font-bold"
                dominantBaseline="middle"
                textAnchor={anchor}
                x={labelPoint.x}
                y={labelPoint.y + 8}
              >
                {valueLabel}
              </text>
            </g>
          );
        })}

        <polygon
          className="nuang-radar-area stroke-primary"
          fill={`url(#${gradientId})`}
          points={polygonPoints}
          strokeLinejoin="round"
          strokeWidth="2.5"
        />

        <circle
          className="fill-white stroke-line"
          cx={center}
          cy={center}
          r="22"
          strokeWidth="1"
        />
        <text
          className="fill-primary text-[10px] font-black"
          dominantBaseline="middle"
          textAnchor="middle"
          x={center}
          y={center}
        >
          {centerLabel ?? `${axes.length}축`}
        </text>

        {points.map((point, index) => (
          <circle
            className="nuang-radar-point fill-white"
            cx={point.x}
            cy={point.y}
            key={axes[index].id}
            r="4"
            stroke={axisColors[index % axisColors.length]}
            strokeWidth="2"
          />
        ))}
      </svg>
      {caption && (
        <figcaption className="text-center text-xs leading-5 text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function toPoint(index: number, total: number, pointRadius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;

  return {
    x: center + pointRadius * Math.cos(angle),
    y: center + pointRadius * Math.sin(angle),
  };
}

function clampScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return 0;

  return Math.min(100, Math.max(0, value));
}

function getTextAnchor(x: number) {
  if (x < center - 10) return "end";
  if (x > center + 10) return "start";

  return "middle";
}
