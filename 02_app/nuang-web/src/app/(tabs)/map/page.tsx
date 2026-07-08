import { LocalMapView } from "@/features/map/LocalMapView";

export default function MapPage() {
  return (
    <div className="grid gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black text-primary">NUANG MAP</p>
          <h1 className="mt-2 text-2xl font-bold">성향지도</h1>
          <p className="mt-1 text-sm text-muted">
            5축과 10축을 오각형·다각형 지표로 확인해요.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#eff0f6] px-3 py-1 text-xs font-bold text-muted">
          정밀 코어 기준
        </span>
      </header>

      <LocalMapView />
    </div>
  );
}
