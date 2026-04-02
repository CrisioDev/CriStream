import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";

interface Player {
  twitchUserId: string;
  displayName: string;
  points: number;
  watchMinutes: number;
}

export function CasinoAdminPage() {
  const { activeChannel } = useAuthStore();
  const channelName = activeChannel?.displayName;

  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Per-player amount inputs
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  // Give-all amount
  const [giveAllAmount, setGiveAllAmount] = useState("");

  const fetchPlayers = useCallback(async () => {
    if (!channelName) return;
    setLoading(true);
    try {
      const res = await api.get<Player[]>(`/viewer/${channelName}/casino/admin/players`);
      if (res.success && res.data) {
        setPlayers(res.data);
      } else {
        setError((res as any).error || "Fehler beim Laden");
      }
    } catch {
      setError("Fehler beim Laden der Spieler");
    } finally {
      setLoading(false);
    }
  }, [channelName]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const addPoints = async (twitchUserId: string, amount: number) => {
    if (!channelName || !amount) return;
    await api.post(`/viewer/${channelName}/casino/admin/points`, { twitchUserId, amount });
    fetchPlayers();
  };

  const setPoints = async (twitchUserId: string, points: number) => {
    if (!channelName) return;
    await api.post(`/viewer/${channelName}/casino/admin/set-points`, { twitchUserId, points });
    fetchPlayers();
  };

  const giveAll = async () => {
    if (!channelName) return;
    const amount = parseInt(giveAllAmount);
    if (!amount || isNaN(amount)) return;
    if (!window.confirm(`Allen Spielern ${amount} Punkte geben?`)) return;
    await api.post(`/viewer/${channelName}/casino/admin/give-all`, { amount });
    setGiveAllAmount("");
    fetchPlayers();
  };

  const resetPlayer = async (twitchUserId: string, displayName: string) => {
    if (!channelName) return;
    if (!window.confirm(`${displayName} wirklich komplett zurücksetzen? Punkte & Watchtime werden auf 0 gesetzt.`)) return;
    await api.post(`/viewer/${channelName}/casino/admin/reset-player`, { twitchUserId });
    fetchPlayers();
  };

  const filtered = players.filter((p) =>
    p.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const getAmount = (id: string) => amounts[id] || "";
  const setAmount = (id: string, val: string) =>
    setAmounts((prev) => ({ ...prev, [id]: val }));

  if (!channelName) {
    return (
      <div className="p-6 text-zinc-400">Kein Channel ausgewählt.</div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Casino Admin</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Give All */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-zinc-300">Allen geben:</span>
        <input
          type="number"
          value={giveAllAmount}
          onChange={(e) => setGiveAllAmount(e.target.value)}
          placeholder="Punkte"
          className="w-32 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500"
        />
        <button
          onClick={giveAll}
          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded transition-colors"
        >
          Allen geben
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Spieler suchen..."
          className="w-full max-w-sm px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500"
        />
      </div>

      {loading ? (
        <div className="text-zinc-500">Laden...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3 text-right">Punkte</th>
                <th className="py-2 px-3 text-right">Watchtime (min)</th>
                <th className="py-2 px-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.twitchUserId}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="py-2 px-3 text-zinc-500">{i + 1}</td>
                  <td className="py-2 px-3 font-medium">{p.displayName}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {Number(p.points).toLocaleString("de-DE")}
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-400">
                    {Number(p.watchMinutes).toLocaleString("de-DE")}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        value={getAmount(p.twitchUserId)}
                        onChange={(e) => setAmount(p.twitchUserId, e.target.value)}
                        placeholder="Menge"
                        className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-100 placeholder-zinc-500"
                      />
                      <button
                        onClick={() => {
                          const amt = parseInt(getAmount(p.twitchUserId));
                          if (amt) addPoints(p.twitchUserId, amt);
                        }}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded transition-colors"
                        title="Punkte hinzufügen"
                      >
                        +
                      </button>
                      <button
                        onClick={() => {
                          const amt = parseInt(getAmount(p.twitchUserId));
                          if (amt) addPoints(p.twitchUserId, -amt);
                        }}
                        className="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded transition-colors"
                        title="Punkte abziehen"
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          const amt = parseInt(getAmount(p.twitchUserId));
                          if (!isNaN(amt) && amt >= 0) {
                            if (window.confirm(`${p.displayName} auf genau ${amt} Punkte setzen?`)) {
                              setPoints(p.twitchUserId, amt);
                            }
                          }
                        }}
                        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                        title="Exakte Punkte setzen"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => resetPlayer(p.twitchUserId, p.displayName)}
                        className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        title="Spieler zurücksetzen"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500">
                    Keine Spieler gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
