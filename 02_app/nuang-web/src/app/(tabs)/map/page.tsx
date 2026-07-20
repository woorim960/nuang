import { NuangCharacter } from "@/components/character/NuangCharacter";
import {
  candidateAxisCopy,
  candidateProfileDefinitions,
} from "@/features/nuang-code/candidate-profile-names";

const profileGroups = [
  {
    description: "함께할 때 활력이 오르고 필요한 말을 먼저 꺼내는 편",
    label: "E로 시작하는 코드",
    symbol: "E",
  },
  {
    description: "혼자 생각을 정리하며 회복하고 상황을 살핀 뒤 표현하는 편",
    label: "I로 시작하는 코드",
    symbol: "I",
  },
] as const;

export default function MapPage() {
  return (
    <div className="grid gap-5">
      <header>
        <div>
          <p className="text-sm font-black text-primary">NUANG MAP</p>
          <h1 className="mt-2 text-2xl font-bold">성향지도</h1>
          <p className="mt-1 text-sm text-muted">
            32개 뉴앙 코드를 둘러보고, 내 성향은 마이에서 자세히 확인해요.
          </p>
        </div>
      </header>

      <section className="border-y border-line py-5">
        <div className="flex items-center justify-between gap-5">
          <div>
            <h2 className="text-lg font-black">5글자 뉴앙 코드로 보는 성향</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              다섯 자리는 차례대로 사람 사이 에너지, 생각과 탐색, 관계에서
              관심이 가는 곳, 일상을 꾸리는 방식, 걱정과 감정 반응을 보여줘요.
            </p>
          </div>
          <NuangCharacter motif="purple" size="md" />
        </div>
      </section>

      <section aria-label="뉴앙 코드 다섯 자리" className="grid gap-3">
        {candidateAxisCopy.map((axis) => {
          const directions = Object.values(axis.directions);

          return (
            <article className="border-b border-line pb-4" key={axis.domainId}>
              <p className="text-xs font-black text-primary">
                {axis.position}번째 자리
              </p>
              <h2 className="mt-1 text-base font-black">{axis.label}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {directions.map((direction) => (
                  <div className="rounded-xl bg-surface-soft p-3" key={direction.symbol}>
                    <p className="text-lg font-black text-ink">
                      {direction.symbol}
                      <span className="ml-2 text-sm text-muted">
                        {direction.shortToken}
                      </span>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {direction.description}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5">
        {profileGroups.map((group) => (
          <div className="border-b border-line pb-5" key={group.symbol}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black">{group.label}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {group.description}
                </p>
              </div>
              <NuangCharacter motif="purple" size="sm" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {Object.values(candidateProfileDefinitions)
                .filter((profile) => profile.code.startsWith(group.symbol))
                .map((profile) => (
                  <div className="min-w-0" key={profile.code}>
                    <p className="text-sm font-black tracking-normal">
                      {profile.code}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {profile.displayName}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
