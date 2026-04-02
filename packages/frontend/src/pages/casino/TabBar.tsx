export type CasinoTab = "play" | "minigames" | "pets" | "progress" | "social" | "story";

interface TabBarProps {
  activeTab: CasinoTab;
  setActiveTab: (tab: CasinoTab) => void;
}

export function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-purple-500/20 mb-4">
      <div className="max-w-4xl mx-auto flex">
        {([
          { id: "play" as const, label: "\uD83C\uDFB0 Spielen", color: "#ffd700" },
          { id: "minigames" as const, label: "\uD83C\uDFAE Mini", color: "#4ade80" },
          { id: "pets" as const, label: "\uD83D\uDC3E Pets", color: "#f472b6" },
          { id: "progress" as const, label: "\uD83C\uDFC6 Level", color: "#a78bfa" },
          { id: "social" as const, label: "\uD83D\uDC65 Social", color: "#60a5fa" },
          { id: "story" as const, label: "\uD83D\uDCD6 Story", color: "#fbbf24" },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id ? "border-b-2" : "text-gray-500 hover:text-gray-300"}`}
            style={activeTab === tab.id ? { color: tab.color, borderColor: tab.color } : {}}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
