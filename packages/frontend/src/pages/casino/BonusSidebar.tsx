import { api } from "@/api/client";

interface BonusSidebarProps {
  user: any;
  channelName: string;
  bonusSidebar: boolean;
  setBonusSidebar: (v: boolean) => void;
  bonusData: { lines: any[]; totals: Record<string, { label: string; total: string }>; mood: number } | null;
  setBonusData: (v: any) => void;
}

export function BonusSidebar(props: BonusSidebarProps) {
  const { user, channelName, bonusSidebar, setBonusSidebar, bonusData, setBonusData } = props;

  if (!user) return null;

  return (
    <>
      <button onClick={async () => {
        if (!bonusSidebar) {
          try {
            const res = await api.get<any>(`/viewer/${channelName}/casino/bonuses`) as any;
            if (res.data) setBonusData(res.data);
          } catch {}
        }
        setBonusSidebar(!bonusSidebar);
      }} className="fixed right-0 top-1/2 -translate-y-1/2 z-20 px-1.5 py-4 rounded-l-lg text-xs font-bold writing-vertical"
        style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.8), rgba(100,65,165,0.8))", color: "#fff", writingMode: "vertical-rl", textOrientation: "mixed", backdropFilter: "blur(8px)" }}>
        {"\uD83D\uDCCA"} Boni
      </button>
      {bonusSidebar && (
        <div className="fixed right-0 top-0 h-full w-80 z-20 overflow-y-auto" style={{ background: "linear-gradient(180deg, rgba(10,10,26,0.97), rgba(0,0,0,0.98))", borderLeft: "1px solid rgba(168,85,247,0.3)", backdropFilter: "blur(12px)" }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-purple-300">{"\uD83D\uDCCA"} Aktive Boni</h3>
              <button onClick={() => setBonusSidebar(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {bonusData ? (
              <>
                <div className="space-y-1.5 mb-4">
                  {Object.entries(bonusData.totals).map(([cat, info]) => (
                    <div key={cat} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                      <span className="text-xs text-gray-300">{info.label}</span>
                      <span className="text-xs font-bold text-purple-300">{info.total}</span>
                    </div>
                  ))}
                  {bonusData.mood < 100 && (
                    <div className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <span className="text-xs text-gray-300">Pet-Stimmung</span>
                      <span className={`text-xs font-bold ${bonusData.mood > 50 ? "text-yellow-400" : "text-red-400"}`}>{bonusData.mood}% Effektivitat</span>
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-500 mb-2">QUELLEN</h4>
                <div className="space-y-1">
                  {bonusData.lines.map((line: any, i: number) => (
                    <div key={i} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-xs text-white font-medium">{line.source}</div>
                      <div className="text-[10px] text-purple-400">{line.effect}</div>
                    </div>
                  ))}
                  {bonusData.lines.length === 0 && (
                    <p className="text-xs text-gray-600">Noch keine Boni! Investiere in Skills, kaufe ein Pet oder ruste Items aus.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-600">Laden...</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
