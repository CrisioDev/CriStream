import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";

export function CasinoPage() {
  const { user } = useAuthStore();
  const [result, setResult] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [channelInput, setChannelInput] = useState("");

  // Try to guess channel from URL referrer or use input
  const channelName = channelInput || "TheCrisio";

  const play = async (game: string) => {
    if (!user) { setResult("Bitte zuerst einloggen!"); return; }
    setPlaying(true);
    try {
      const res = await api.post<any>(`/viewer/${channelName}/gamble`, { game }) as any;
      if (!res.success) { setResult(res.error ?? "Fehler!"); setPlaying(false); return; }
      const d = res.data;
      if (game === "flip") setResult(`🪙 ${d.result}! ${d.win ? "Gewonnen! +1 Punkt" : "Verloren! -1 Punkt"}`);
      else if (game === "slots") { const p = d.payout-d.cost; setResult(`🎰 [ ${d.reels.join(" | ")} ] → ${d.label} → ${d.payout} Pts (${p>=0?"+":""}${p})`); }
      else if (game === "scratch") { const p = d.payout-d.cost; setResult(`🎟️ ${d.symbols.join(" ")} → ${d.label} → ${d.payout} Pts (${p>=0?"+":""}${p})`); }
    } catch { setResult("Fehler — bist du eingeloggt?"); }
    setPlaying(false);
  };

  return (
    <div className="min-h-screen text-white overflow-auto" style={{
      background: "radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d1a 50%, #050508 100%)",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div className="text-center pt-10 pb-6">
        <h1 className="text-5xl font-black tracking-wider" style={{
          background: "linear-gradient(180deg, #ffd700 0%, #ff8c00 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 0 40px rgba(255,215,0,0.3)",
        }}>
          CriStream Casino
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Punkte einsetzen. Spaß haben. Gewinnen.</p>
      </div>

      {/* Play Section */}
      <div className="max-w-2xl mx-auto px-6 pb-8">
        <div className="rounded-2xl p-6 text-center" style={{
          background: "linear-gradient(180deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.02) 100%)",
          border: "1px solid rgba(255,215,0,0.2)",
        }}>
          {user ? (
            <>
              <p className="text-sm text-gray-400 mb-1">Eingeloggt als <span className="text-white font-semibold">{user.displayName}</span></p>
              <div className="flex flex-wrap justify-center gap-3 mb-4 mt-3">
                <button onClick={() => play("flip")} disabled={playing} className="rounded-xl px-5 py-2.5 font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000" }}>🪙 Flip (1 Pt)</button>
                <button onClick={() => play("slots")} disabled={playing} className="rounded-xl px-5 py-2.5 font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff" }}>🎰 Slots (25 Pts)</button>
                <button onClick={() => play("scratch")} disabled={playing} className="rounded-xl px-5 py-2.5 font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #00cc88, #009966)", color: "#fff" }}>🎟️ Rubbellos (50 Pts)</button>
              </div>
              {result && (
                <div className="rounded-lg px-4 py-3 text-lg font-bold" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,215,0,0.3)" }}>
                  {result}
                </div>
              )}
              <div className="mt-3">
                <input
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="Channel (default: TheCrisio)"
                  className="rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 text-xs text-center text-gray-400 w-48"
                />
              </div>
            </>
          ) : (
            <div>
              <p className="text-gray-400 mb-3">Logge dich ein um zu spielen</p>
              <a href="/api/auth/twitch/viewer" className="rounded-xl px-6 py-2.5 font-semibold text-sm inline-block" style={{ background: "linear-gradient(135deg, #9146ff, #6441a5)", color: "#fff" }}>Login mit Twitch</a>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Flip */}
        <GameCard
          emoji="🪙"
          name="Münzwurf"
          command="!flip"
          aliases="!münze · !coinflip"
          cost={1}
          cooldown="kein"
          ev="+10%"
          evColor="#4ade80"
          rows={[
            ["Gewonnen", "55%", "+1", "#4ade80"],
            ["Verloren", "45%", "-1", "#f87171"],
          ]}
        />

        {/* Slots */}
        <GameCard
          emoji="🎰"
          name="Slot Machine"
          command="!slots"
          aliases="!slot"
          cost={25}
          cooldown="10s"
          ev="+16%"
          evColor="#4ade80"
          rows={[
            ["7️⃣7️⃣7️⃣", "0.04%", "777", "#ffd700"],
            ["💎💎💎", "0.36%", "300", "#a78bfa"],
            ["⭐⭐⭐", "1.0%", "150", "#fbbf24"],
            ["Frucht ×3", "~17%", "40-75", "#fb923c"],
            ["Doppelt", "~39%", "30", "#60a5fa"],
            ["Nix", "~42%", "10", "#6b7280"],
          ]}
        />

        {/* Rubbellos */}
        <GameCard
          emoji="🎟️"
          name="Rubbellos"
          command="!rubbellos"
          aliases="!scratch · !rubbel"
          cost={50}
          cooldown="15s"
          ev="+8%"
          evColor="#4ade80"
          rows={[
            ["🌟🌟🌟", "0.25%", "1000", "#ffd700"],
            ["💎💎💎", "0.64%", "500", "#a78bfa"],
            ["👑👑👑", "1.44%", "250", "#fbbf24"],
            ["🎁🎁🎁", "4.0%", "150", "#f472b6"],
            ["💰💰💰", "6.25%", "100", "#4ade80"],
            ["🍀🍀🍀", "9.0%", "75", "#34d399"],
            ["Zweier", "~40%", "45", "#60a5fa"],
            ["Nix", "~38%", "25", "#6b7280"],
          ]}
        />

        {/* Bingo */}
        <GameCard
          emoji="🎱"
          name="Tägliches Bingo"
          command="!bingo"
          aliases="Ziehung 07:00"
          cost={10}
          cooldown="1×/Tag"
          ev="-50%"
          evColor="#fbbf24"
          description="5 Zahlen aus 1-30 · 10 Gewinnzahlen"
          rows={[
            ["5 Treffer", "~0.03%", "500", "#ffd700"],
            ["4 Treffer", "~1.4%", "100", "#a78bfa"],
            ["3 Treffer", "~14%", "25", "#60a5fa"],
            ["0-2", "~85%", "0", "#6b7280"],
          ]}
        />

        {/* Lotto */}
        <GameCard
          emoji="🍀"
          name="Wöchentliches Lotto"
          command="!lotto"
          aliases="Ziehung Sonntag 10:00"
          cost={50}
          cooldown="1×/Woche"
          ev="-64%"
          evColor="#f87171"
          description="6 Zahlen aus 1-49 · 6 Gewinnzahlen"
          rows={[
            ["6 Richtige", "0.00007%", "10.000", "#ffd700"],
            ["5 Richtige", "0.018%", "2.500", "#a78bfa"],
            ["4 Richtige", "0.97%", "500", "#f472b6"],
            ["3 Richtige", "12.2%", "100", "#60a5fa"],
            ["0-2", "~87%", "0", "#6b7280"],
          ]}
        />

        {/* Lootbox */}
        <GameCard
          emoji="📦"
          name="Lootbox"
          command="!lootbox"
          aliases="!lb"
          cost={100}
          cooldown="30s"
          ev="variabel"
          evColor="#60a5fa"
          description="~950 Items · Titel · Karten · Sounds · Actions"
          rows={[
            ["LEGENDÄR 🟨", "~2%", "Jackpot", "#ffd700"],
            ["EPISCH 🟪", "~8%", "Episch", "#a78bfa"],
            ["SELTEN 🟦", "~15%", "Selten", "#3b82f6"],
            ["UNGEWÖHNL. 🟩", "~25%", "Ungewöhnlich", "#22c55e"],
            ["GEWÖHNLICH ⬜", "~50%", "Gewöhnlich", "#6b7280"],
          ]}
        />
      </div>

      {/* Bottom summary */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-center text-lg font-bold mb-4" style={{ color: "#ffd700" }}>Übersicht</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-sm">
            <MiniStat label="Flip" cost="1" ev="+10%" color="#4ade80" />
            <MiniStat label="Slots" cost="25" ev="+16%" color="#4ade80" />
            <MiniStat label="Rubbellos" cost="50" ev="+8%" color="#4ade80" />
            <MiniStat label="Bingo" cost="10" ev="-50%" color="#fbbf24" />
            <MiniStat label="Lotto" cost="50" ev="-64%" color="#f87171" />
            <MiniStat label="Lootbox" cost="100" ev="var." color="#60a5fa" />
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            Flip, Slots & Rubbellos sind netto positiv — Viewer gewinnen langfristig.
            Bingo & Lotto sind Event-Spiele mit Jackpot-Chance.
          </p>
        </div>
      </div>

      {/* Other commands */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-center text-lg font-bold mb-4" style={{ color: "#a78bfa" }}>Weitere Commands</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {[
              ["!points", "Punkte anzeigen"],
              ["!inventory", "Inventar anzeigen"],
              ["!equip <name>", "Titel anlegen"],
              ["!unequip", "Titel entfernen"],
              ["!profil", "Viewer-Profil"],
              ["!markt", "Marktplatz"],
              ["!trade", "Trades"],
              ["!link", "Twitch ↔ Discord"],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                <code className="text-purple-400 font-mono text-xs">{cmd}</code>
                <span className="text-gray-500 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameCard({
  emoji, name, command, aliases, cost, cooldown, ev, evColor, description, rows,
}: {
  emoji: string;
  name: string;
  command: string;
  aliases: string;
  cost: number;
  cooldown: string;
  ev: string;
  evColor: string;
  description?: string;
  rows: [string, string, string, string][];
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      backdropFilter: "blur(8px)",
    }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <h3 className="font-bold text-lg">{name}</h3>
              <code className="text-purple-400 text-sm font-mono">{command}</code>
              <span className="text-gray-600 text-xs ml-2">{aliases}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">EV</div>
            <div className="font-bold text-lg" style={{ color: evColor }}>{ev}</div>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <div>
            <span className="text-gray-500">Kosten: </span>
            <span className="font-semibold" style={{ color: "#ffd700" }}>{cost} Pts</span>
          </div>
          <div>
            <span className="text-gray-500">Cooldown: </span>
            <span className="font-semibold">{cooldown}</span>
          </div>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </div>

      {/* Table */}
      <div className="px-4 pb-4">
        <div className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="grid grid-cols-3 text-xs text-gray-500 px-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span>Ergebnis</span>
            <span className="text-center">Chance</span>
            <span className="text-right">Gewinn</span>
          </div>
          {rows.map(([result, chance, payout, color], i) => (
            <div
              key={i}
              className="grid grid-cols-3 text-xs px-3 py-1.5"
              style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}
            >
              <span style={{ color }}>{result}</span>
              <span className="text-center text-gray-400">{chance}</span>
              <span className="text-right font-semibold" style={{ color }}>{payout}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, cost, ev, color }: { label: string; cost: string; ev: string; color: string }) {
  return (
    <div className="rounded-xl py-3 px-2" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-gray-500">{cost} Pts</div>
      <div className="font-bold mt-1" style={{ color }}>{ev}</div>
    </div>
  );
}
