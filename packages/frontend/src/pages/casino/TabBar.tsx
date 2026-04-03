import { useRef, useEffect, useState } from "react";

export type CasinoTab = "play" | "minigames" | "pets" | "progress" | "social" | "story";

interface TabBarProps {
  activeTab: CasinoTab;
  setActiveTab: (tab: CasinoTab) => void;
}

const TABS = [
  { id: "play" as const, label: "🎰 Spielen", color: "#ffd700" },
  { id: "minigames" as const, label: "🎮 Mini", color: "#4ade80" },
  { id: "pets" as const, label: "🐾 Pets", color: "#f472b6" },
  { id: "progress" as const, label: "🏆 Level", color: "#a78bfa" },
  { id: "social" as const, label: "👥 Social", color: "#60a5fa" },
  { id: "story" as const, label: "📖 Story", color: "#fbbf24" },
];

export function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    const el = tabRefs.current[idx];
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  const activeColor = TABS.find(t => t.id === activeTab)?.color ?? "#ffd700";

  return (
    <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-purple-500/20 mb-4 relative">
      <div ref={containerRef} className="max-w-4xl mx-auto flex relative">
        {/* Animated sliding indicator */}
        <div
          className="absolute bottom-0 h-[2px] transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            background: activeColor,
            boxShadow: `0 0 10px ${activeColor}80`,
          }}
        />
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === tab.id ? "" : "text-gray-500 hover:text-gray-300"
            }`}
            style={activeTab === tab.id ? { color: tab.color } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
