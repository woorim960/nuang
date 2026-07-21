import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";

type TraitMapResultBridgeProps = { code: string; profileName: string };

/** 결과 리포트와 성향지도를 잇는 공통 요약 블록입니다. */
export function TraitMapResultBridge({
  code,
  profileName,
}: TraitMapResultBridgeProps) {
  const guide = getPublishedTraitMapCustomerGuide(code);
  if (!guide) return null;
  const featuredSlots = ["core_pattern", "role_meaning", "strength_and_growth"];
  const chapters = featuredSlots
    .map((slot) => guide.chapters.find((chapter) => chapter.slot === slot))
    .filter((chapter): chapter is NonNullable<typeof chapter> =>
      Boolean(chapter),
    );

  return (
    <section
      aria-labelledby="trait-map-bridge-title"
      className="border-b border-line bg-[#faf9ff] px-5 py-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#6b5bd5]">
            <BookOpen aria-hidden="true" size={15} strokeWidth={1.7} />
            성향지도에서 이어 읽기
          </p>
          <h2
            id="trait-map-bridge-title"
            className="mt-2 text-lg font-bold text-ink"
          >
            {code} · {profileName}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            결과에서 보인 방향이 일상과 관계에서 어떻게 이어지는지 핵심부터
            살펴봐요.
          </p>
        </div>
        <Link
          aria-label={`${code} 성향지도 상세 열기`}
          className="mt-1 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#5d4fd0]"
          href={`/map/${code}`}
        >
          전체 보기{" "}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>
      <div className="mt-5 grid gap-2.5">
        {chapters.map((chapter) => (
          <Link
            className="group rounded-xl border border-[#e7e2ff] bg-white px-4 py-3.5 transition-colors hover:border-[#bdb3f5]"
            href={`/map/${code}#${chapter.id}`}
            key={chapter.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink">
                {String(chapter.number).padStart(2, "0")} · {chapter.title}
              </p>
              <ArrowRight
                aria-hidden="true"
                className="text-[#9a8dea] transition-transform group-hover:translate-x-0.5"
                size={16}
                strokeWidth={1.8}
              />
            </div>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              {chapter.summary}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
