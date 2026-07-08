import {
  ClipboardCheck,
  MapPinned,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  listNuangNextActionFlowItems,
  type NuangNextActionFlowItem,
} from "@/features/navigation/nuang-next-action-flow";

const iconByFlowId = {
  assessment: ClipboardCheck,
  map: MapPinned,
  together: UsersRound,
  visibility: ShieldCheck,
} as const;

export function NuangNextActionFlow({
  eyebrow = "시작 흐름",
  title = "검사에서 함께까지",
}: {
  eyebrow?: string;
  title?: string;
}) {
  const items = listNuangNextActionFlowItems();

  return (
    <section
      aria-label="뉴앙 다음 행동 흐름"
      className="rounded-lg border border-line bg-white p-4 shadow-[0_10px_24px_rgb(63_56_118_/_6%)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <StatusPill tone="primary">{eyebrow}</StatusPill>
          <h2 className="mt-3 text-base font-black">{title}</h2>
        </div>
        <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-primary">
          4단계
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <NuangNextActionFlowLink item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function NuangNextActionFlowLink({ item }: { item: NuangNextActionFlowItem }) {
  const Icon = iconByFlowId[item.id];

  return (
    <Link
      aria-label={`${item.stepLabel}단계 ${item.title} 열기`}
      className="flex min-h-20 items-center gap-3 rounded-lg bg-surface-soft p-3 transition-colors hover:bg-[#f5f2ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      href={item.href}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-[0_8px_18px_rgb(63_56_118_/_8%)]">
        <Icon aria-hidden="true" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-white">
            {item.stepLabel}
          </span>
          <span className="text-sm font-black text-foreground">{item.title}</span>
        </span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-muted">
          {item.body}
        </span>
      </span>
    </Link>
  );
}
