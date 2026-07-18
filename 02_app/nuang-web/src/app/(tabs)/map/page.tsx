import { NuangCharacter } from "@/components/character/NuangCharacter";
import {
  nuangProfileCharacterRules,
  nuangProfileMotifRules,
} from "@/components/character/nuang-profile-character-system";

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
              뉴앙 코드는 앞의 두 글자로 에너지와 마음의 반응을, 뒤의 세 글자로
              일상·관계·생각의 방향을 보여줘요.
            </p>
          </div>
          <NuangCharacter motif="purple" size="md" />
        </div>
      </section>

      <section className="grid gap-3">
        {Object.entries(nuangProfileMotifRules).map(([prefix, rule]) => (
          <div className="border-b border-line pb-4" key={prefix}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black">{prefix}</p>
                <h2 className="mt-1 text-base font-bold">{rule.motifLabel} 계열</h2>
              </div>
              <NuangCharacter motif={rule.motif} size="sm" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {nuangProfileCharacterRules
                .filter((profile) => profile.motifPrefix === prefix)
                .map((profile) => (
                  <div className="min-w-0" key={profile.profileCode}>
                    <p className="text-sm font-black tracking-normal">
                      {profile.profileCode}
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
