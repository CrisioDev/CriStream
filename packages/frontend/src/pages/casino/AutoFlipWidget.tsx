interface AutoFlipWidgetProps {
  autoFlip: { active: boolean; prestige: number; interval: number; totalFlips: number; totalWon: number } | null;
  autoFlipTick: number;
  soundMuted: boolean;
  setSoundMuted: (v: boolean) => void;
}

export function AutoFlipWidget(props: AutoFlipWidgetProps) {
  const { autoFlip, autoFlipTick, soundMuted, setSoundMuted } = props;

  return (
    <>
      {/* Auto-Flip Widget (fixed bottom-left) */}
      {autoFlip?.active && (
        <div className="fixed bottom-4 left-4 z-20 rounded-2xl p-3" style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.8))",
          border: "1px solid rgba(255,215,0,0.3)",
          backdropFilter: "blur(8px)",
          minWidth: "140px",
        }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl" key={autoFlipTick} style={{ animation: "autoflip-spin 1s ease-out" }}>{"\uD83E\uDE99"}</div>
            <div>
              <div className="text-xs font-bold text-yellow-300">Auto-Flip</div>
              <div className="text-[10px] text-gray-400">P{autoFlip.prestige} · alle {autoFlip.interval}s</div>
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-green-400">{autoFlip.totalWon}W</span>
            <span className="text-red-400">{autoFlip.totalFlips - autoFlip.totalWon}L</span>
            <span className="text-gray-400">{autoFlip.totalFlips} total</span>
          </div>
          <div className="h-1 rounded-full bg-black/40 mt-1 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${autoFlip.totalFlips > 0 ? (autoFlip.totalWon / autoFlip.totalFlips) * 100 : 50}%`,
              background: "linear-gradient(90deg, #4ade80, #fbbf24)",
            }} />
          </div>
        </div>
      )}

      {/* Sound mute/unmute button */}
      <button
        onClick={() => {
          const next = !soundMuted;
          setSoundMuted(next);
          // Sound toggle is handled in index.tsx via the callback
        }}
        className={`fixed ${autoFlip?.active ? "bottom-28" : "bottom-4"} left-4 z-[60] w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110`}
        style={{ background: "rgba(20,20,40,0.85)", border: "1px solid rgba(145,71,255,0.4)", color: soundMuted ? "#666" : "#c084fc" }}
        title={soundMuted ? "Sound einschalten" : "Sound ausschalten"}
      >
        {soundMuted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
      </button>
    </>
  );
}
