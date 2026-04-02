import { api } from "@/api/client";
import { casinoSounds } from "@/lib/casino-sounds";
import { formatNumber } from "@/lib/format-number";

const PET_EMOJIS: Record<string,string> = {cat:"🐱",dog:"🐶",bunny:"🐰",fox:"🦊",panda:"🐼",dragon:"🐉",unicorn:"🦄",phoenix:"🔥",alien:"👾",robot:"🤖",kraken:"🦑",void:"🕳️"};

interface PetsTabProps {
  user: any;
  channelName: string;
  pet: any;
  setPet: (v: any) => void;
  shop: any;
  setShop: (v: any) => void;
  showShop: boolean;
  setShowShop: (v: boolean) => void;
  buyingPet: boolean;
  setBuyingPet: (v: boolean) => void;
  renamingPet: boolean;
  setRenamingPet: (v: boolean) => void;
  petNewName: string;
  setPetNewName: (v: string) => void;
  breedData: { breedCount: number; nextCost: number; cooldownLeft: number } | null;
  breedPet1: string;
  setBreedPet1: (v: string) => void;
  breedPet2: string;
  setBreedPet2: (v: string) => void;
  breeding: boolean;
  setBreeding: (v: boolean) => void;
  petBattle: { battle: any | null; history: any[] } | null;
  battleBet: number;
  setBattleBet: (v: number) => void;
  message: string | null;
  setMessage: (v: string | null) => void;
  fetchPoints: () => void;
  fetchPetBattle: () => void;
  fetchBreedData: () => void;
  setPetWalkAnim: (v: boolean) => void;
  setPetFeedAnim: (v: boolean) => void;
  setPetCleanAnim: (v: boolean) => void;
  confettiRef: React.RefObject<HTMLDivElement | null>;
  spawnConfetti: (container: HTMLDivElement, count?: number, goldOnly?: boolean) => void;
}

export function PetsTab(props: PetsTabProps) {
  const {
    user, channelName, pet, setPet, shop, setShop, showShop, setShowShop,
    buyingPet, setBuyingPet, renamingPet, setRenamingPet, petNewName, setPetNewName,
    breedData, breedPet1, setBreedPet1, breedPet2, setBreedPet2, breeding, setBreeding,
    petBattle, battleBet, setBattleBet, message, setMessage,
    fetchPoints, fetchPetBattle, fetchBreedData,
    setPetWalkAnim, setPetFeedAnim, setPetCleanAnim,
    confettiRef, spawnConfetti,
  } = props;

  if (!user) return null;

  return (
    <>
      {/* ── PET BATTLES ── */}
      {pet && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(180deg, rgba(251,146,60,0.08), rgba(220,38,38,0.05))",
            border: "1px solid rgba(251,146,60,0.3)",
          }}>
            <h3 className="font-black text-lg text-orange-400 mb-3">⚔️ PET BATTLE</h3>
            {!petBattle?.battle ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-3">Fordere andere Spieler mit deinem Pet heraus!</p>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <label className="text-xs text-gray-500">Einsatz:</label>
                  <input type="number" value={battleBet} onChange={e => setBattleBet(Math.max(10, Number(e.target.value)))}
                    className="bg-black/40 border border-orange-500/30 rounded-lg px-3 py-1.5 text-sm text-center w-24 text-white" min={10} />
                  <span className="text-xs text-gray-500">Pts</span>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await api.post<any>(`/viewer/${channelName}/casino/battle`, { bet: battleBet }) as any;
                    if (res.success) { fetchPetBattle(); fetchPoints(); }
                    else setMessage(res.error ?? "Fehler!");
                  } catch { setMessage("Fehler!"); }
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}>
                  ⚔️ HERAUSFORDERN
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-6 mb-3">
                  <div className="text-center">
                    <div className="text-3xl mb-1">⚔️</div>
                    <div className="text-sm font-bold text-orange-300">{petBattle.battle.challengerName}</div>
                    <div className="text-xs text-gray-500">Power: {petBattle.battle.challengerPetPower}</div>
                  </div>
                  <div className="text-yellow-400 font-black text-lg">{petBattle.battle.bet} Pts</div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">❓</div>
                    <div className="text-sm text-gray-500">Wartet...</div>
                  </div>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await api.post<any>(`/viewer/${channelName}/casino/battle/accept`, {}) as any;
                    if (res.success) {
                      fetchPetBattle(); fetchPoints();
                      if (res.data?.winner && confettiRef.current) spawnConfetti(confettiRef.current, 60);
                    } else setMessage(res.error ?? "Fehler!");
                  } catch { setMessage("Fehler!"); }
                }} className="casino-btn px-8 py-3 rounded-xl font-black text-lg text-white"
                  style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                  ⚔️ ANNEHMEN
                </button>
              </div>
            )}
            {petBattle?.history && petBattle.history.length > 0 && (
              <div className="mt-4 border-t border-orange-500/20 pt-3">
                <h4 className="text-xs font-bold text-gray-500 mb-2">LETZTE KAMPFE</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {petBattle.history.slice(0, 5).map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-gray-300">{h.challengerName} vs {h.opponentName}</span>
                      <span className={`font-bold ${h.winnerName === user?.displayName ? "text-green-400" : "text-red-400"}`}>
                        {h.winnerName} +{h.bet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── V-PET + SHOP + BREED + RENAME ── */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, rgba(255,182,193,0.06), rgba(0,0,0,0.2))", border: "1px solid rgba(255,182,193,0.2)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg text-pink-300">{"\uD83D\uDC3E"} V-PET</h3>
            {pet && <span className="text-xs text-gray-500">LVL {pet.level} · {formatNumber(pet.totalSpent ?? 0)} Pts ausgegeben</span>}
          </div>

          {!pet ? (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-4">Du hast noch kein Pet! Wahle dein erstes:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {!shop ? (
                  <button onClick={async () => {
                    const res = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any;
                    if (res.data) setShop(res.data);
                  }} className="casino-btn px-6 py-2 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #f472b6, #ec4899)" }}>
                    {"\uD83D\uDED2"} Shop offnen
                  </button>
                ) : (
                  shop.pets.map((p: any) => (
                    <button key={p.id} onClick={async () => {
                      setBuyingPet(true);
                      const res = await api.post<any>(`/viewer/${channelName}/casino/pet/buy`, { petId: p.id }) as any;
                      if (res.success) { setPet(res.data); fetchPoints(); }
                      else setMessage(res.error ?? "Fehler!");
                      setBuyingPet(false);
                    }} disabled={buyingPet} className="rounded-xl p-3 text-center hover:scale-105 transition-transform" style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                      minWidth: "80px",
                    }}>
                      <div className="text-3xl mb-1">{p.emoji}</div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-yellow-400">{formatNumber(p.price)} Pts</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (() => {
              const activePet = pet.pets?.find((p:any) => p.petId === pet.activePetId);
              return activePet ? (
            <div>
              {/* Active Pet Display */}
              <div className="flex items-center gap-6 mb-4">
                <div className="relative text-center">
                  {pet.equipped?.aura && <div className="absolute -inset-2 text-4xl opacity-30 animate-pulse flex items-center justify-center">{pet.equipped.aura}</div>}
                  <div className="text-6xl relative">
                    {pet.equipped?.hat && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">{pet.equipped.hat}</div>}
                    {pet.equipped?.glasses && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-lg">{pet.equipped.glasses}</div>}
                    {PET_EMOJIS[activePet.petId] ?? "🐱"}
                    {pet.equipped?.weapon && <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-2xl">{pet.equipped.weapon}</div>}
                    {pet.equipped?.cape && <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-xl">{pet.equipped.cape}</div>}
                  </div>
                  {pet.equipped?.food && <div className="text-lg mt-1">{pet.equipped.food}</div>}
                </div>
                <div className="flex-1">
                  <div className="font-black text-white text-lg flex items-center gap-2">
                    {renamingPet ? (
                      <div className="flex items-center gap-1">
                        <input value={petNewName} onChange={e => setPetNewName(e.target.value)}
                          className="bg-black/40 border border-pink-500/40 rounded px-2 py-0.5 text-sm text-white w-28" maxLength={16}
                          onKeyDown={async e => {
                            if (e.key === "Enter" && petNewName.trim()) {
                              const res = await api.post<any>(`/viewer/${channelName}/casino/pet/rename`, { name: petNewName.trim() }) as any;
                              if (res.success) { const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data); }
                              else setMessage(res.error ?? "Fehler!");
                              setRenamingPet(false);
                            }
                            if (e.key === "Escape") setRenamingPet(false);
                          }}
                          autoFocus />
                        <button onClick={async () => {
                          if (petNewName.trim()) {
                            const res = await api.post<any>(`/viewer/${channelName}/casino/pet/rename`, { name: petNewName.trim() }) as any;
                            if (res.success) { const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data); }
                            else setMessage(res.error ?? "Fehler!");
                          }
                          setRenamingPet(false);
                        }} className="text-green-400 text-xs hover:text-green-300">✓</button>
                        <button onClick={() => setRenamingPet(false)} className="text-red-400 text-xs hover:text-red-300">✕</button>
                      </div>
                    ) : (
                      <>
                        {activePet.petName}
                        <button onClick={() => { setPetNewName(activePet.petName); setRenamingPet(true); }}
                          className="text-pink-400 hover:text-pink-300 text-sm" title="Umbenennen">✏️</button>
                      </>
                    )}
                    <span className="text-xs text-pink-400 font-normal">(aktiv)</span>
                  </div>
                  <div className="text-xs text-gray-400">Level {activePet.level} · {activePet.xp}/{Math.floor(50 * Math.pow(1.5, activePet.level - 1))} XP</div>
                  <div className="h-2 rounded-full bg-black/40 mt-1 overflow-hidden" style={{ border: "1px solid rgba(255,182,193,0.2)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(activePet.xp / (Math.floor(50 * Math.pow(1.5, activePet.level - 1)))) * 100}%`, background: "linear-gradient(90deg, #f472b6, #ec4899)" }} />
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={() => { setShowShop(!showShop); if (!showShop && !shop) { api.get<any>(`/viewer/${channelName}/casino/pet/shop`).then((r: any) => { if (r.data) setShop(r.data); }); } }}
                      className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "linear-gradient(135deg, rgba(244,114,182,0.2), rgba(236,72,153,0.1))", border: "1px solid rgba(244,114,182,0.4)", color: "#f472b6" }}>
                      {showShop ? "Shop schliessen" : "\uD83D\uDED2 Shop"}
                    </button>
                    <button onClick={async () => {
                      const res = await api.post<any>(`/viewer/${channelName}/casino/pet/walk`, {}) as any;
                      if (res.success) {
                        casinoSounds.walk();
                        setPetWalkAnim(true); setTimeout(() => setPetWalkAnim(false), 3000);
                        const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                      } else setMessage(res.error ?? "Fehler!");
                    }} className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ade80" }}>
                      {"\uD83D\uDC3E"} Gassi
                    </button>
                    <button onClick={async () => {
                      const res = await api.post<any>(`/viewer/${channelName}/casino/pet/feed`, {}) as any;
                      if (res.success) {
                        casinoSounds.feed();
                        setPetFeedAnim(true); setTimeout(() => setPetFeedAnim(false), 2000);
                        const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                      } else setMessage(res.error ?? "Fehler!");
                    }} className="casino-btn px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.4)", color: "#fb923c" }}>
                      {"\uD83C\uDF56"} Futtern
                    </button>
                    {pet.careState?.needsPoop && (
                      <button onClick={async () => {
                        casinoSounds.poop();
                        setPetCleanAnim(true); setTimeout(() => setPetCleanAnim(false), 1500);
                        await api.post<any>(`/viewer/${channelName}/casino/pet/clean`, {});
                        const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                      }} className="casino-btn px-3 py-1 rounded-lg text-xs font-bold animate-bounce" style={{ background: "rgba(139,92,46,0.3)", border: "1px solid rgba(139,92,46,0.6)", color: "#d4a574" }}>
                        {"\uD83D\uDCA9"} Aufraumen!
                      </button>
                    )}
                  </div>
                  {/* Mood & Care bars */}
                  {pet.careState && (
                    <div className="flex gap-3 mt-2 text-[10px]">
                      <div className="flex-1">
                        <div className="flex justify-between text-gray-500"><span>😊 Gluck</span><span>{pet.careState.happiness}%</span></div>
                        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pet.careState.happiness}%`, background: pet.careState.happiness > 50 ? "#4ade80" : pet.careState.happiness > 20 ? "#fbbf24" : "#ef4444" }} /></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-gray-500"><span>{"\uD83C\uDF56"} Hunger</span><span>{pet.careState.hunger}%</span></div>
                        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pet.careState.hunger}%`, background: pet.careState.hunger > 50 ? "#fb923c" : pet.careState.hunger > 20 ? "#fbbf24" : "#ef4444" }} /></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-gray-500"><span>✨ Sauber</span><span>{pet.careState.cleanliness}%</span></div>
                        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pet.careState.cleanliness}%`, background: pet.careState.cleanliness > 50 ? "#60a5fa" : pet.careState.cleanliness > 20 ? "#fbbf24" : "#ef4444" }} /></div>
                      </div>
                      <div className="shrink-0 text-center">
                        <span className="text-gray-500">Stimmung</span>
                        <div className={`font-bold ${(pet.mood ?? 100) > 70 ? "text-green-400" : (pet.mood ?? 100) > 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {pet.mood ?? 100}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Owned Pets Row */}
              {pet.pets.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {pet.pets.map((p: any) => (
                    <div key={p.petId} className="relative">
                      <button onClick={async () => {
                        await api.post<any>(`/viewer/${channelName}/casino/pet/activate`, { petId: p.petId });
                        const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                      }} className={`rounded-lg px-3 py-2 text-center transition-all ${p.petId === pet.activePetId ? "ring-2 ring-pink-500 bg-pink-500/10" : "bg-white/3 hover:bg-white/5"}`}
                        style={{ border: `1px solid ${p.petId === pet.activePetId ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.08)"}` }}>
                        <div className="text-2xl">{PET_EMOJIS[p.petId] ?? "🐱"}</div>
                        <div className="text-[10px] text-gray-400">LVL {p.level}</div>
                      </button>
                      {p.petId !== pet.activePetId && pet.pets.length > 1 && (
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`${p.petName ?? p.petId} verkaufen?`)) return;
                          const res = await api.post<any>(`/viewer/${channelName}/casino/pet/sell`, { petId: p.petId }) as any;
                          if (res.success) {
                            setMessage(`Verkauft! +${res.data.points} Pts`);
                            const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                            fetchPoints();
                          } else setMessage(res.error ?? "Fehler!");
                        }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center hover:bg-red-500" title="Verkaufen">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pet Breeding */}
              {pet.pets.length >= 2 && (
                <div className="border-t border-pink-500/20 pt-4 mb-4">
                  <h4 className="font-bold text-sm text-pink-300 mb-2">💕 PET ZUCHT</h4>
                  <div className="rounded-xl p-3" style={{ background: "rgba(244,114,182,0.05)", border: "1px solid rgba(244,114,182,0.15)" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <select value={breedPet1} onChange={e => setBreedPet1(e.target.value)}
                        className="bg-black/40 border border-pink-500/30 rounded-lg px-2 py-1.5 text-xs text-white flex-1">
                        <option value="">Pet 1 wahlen...</option>
                        {pet.pets.map((p: any) => (
                          <option key={p.petId} value={p.petId}>{PET_EMOJIS[p.petId] ?? "🐱"} {p.petName} (LVL {p.level})</option>
                        ))}
                      </select>
                      <span className="text-pink-400 text-lg">💕</span>
                      <select value={breedPet2} onChange={e => setBreedPet2(e.target.value)}
                        className="bg-black/40 border border-pink-500/30 rounded-lg px-2 py-1.5 text-xs text-white flex-1">
                        <option value="">Pet 2 wahlen...</option>
                        {pet.pets.filter((p: any) => p.petId !== breedPet1).map((p: any) => (
                          <option key={p.petId} value={p.petId}>{PET_EMOJIS[p.petId] ?? "🐱"} {p.petName} (LVL {p.level})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {breedData ? (
                          <>
                            <span>Kosten: <span className="text-yellow-400 font-bold">{formatNumber(breedData.nextCost)} Pts</span></span>
                            <span className="ml-3">Zuchtungen: {breedData.breedCount}</span>
                            {breedData.cooldownLeft > 0 && <span className="ml-3 text-red-400">Cooldown: {Math.ceil(breedData.cooldownLeft / 60)}m</span>}
                          </>
                        ) : <span>Laden...</span>}
                      </div>
                      <button onClick={async () => {
                        if (!breedPet1 || !breedPet2 || breeding) return;
                        setBreeding(true);
                        try {
                          const res = await api.post<any>(`/viewer/${channelName}/casino/breed`, { pet1Id: breedPet1, pet2Id: breedPet2 }) as any;
                          if (res.success) {
                            if (confettiRef.current) spawnConfetti(confettiRef.current, 60);
                            const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                            fetchBreedData(); fetchPoints();
                            setBreedPet1(""); setBreedPet2("");
                          } else setMessage(res.error ?? "Fehler!");
                        } catch { setMessage("Fehler!"); }
                        setBreeding(false);
                      }} disabled={!breedPet1 || !breedPet2 || breeding || (breedData?.cooldownLeft ?? 0) > 0}
                        className="casino-btn px-4 py-1.5 rounded-lg text-xs font-bold text-black" style={{
                          background: breeding || !breedPet1 || !breedPet2 ? "#666" : "linear-gradient(135deg, #f472b6, #ec4899)",
                        }}>
                        {breeding ? "..." : "💕 Zuchten"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Item Shop */}
              {showShop && shop && (
                <div className="border-t border-pink-500/20 pt-4 space-y-4">
                  {shop.pets.some((p: any) => !p.owned) && (
                    <div>
                      <h4 className="font-bold text-sm text-pink-300 mb-2">{"\uD83D\uDC3E"} Weitere Pets kaufen</h4>
                      <div className="flex flex-wrap gap-2">
                        {shop.pets.filter((p: any) => !p.owned).map((p: any) => (
                          <button key={p.id} onClick={async () => {
                            setBuyingPet(true);
                            const res = await api.post<any>(`/viewer/${channelName}/casino/pet/buy`, { petId: p.id }) as any;
                            if (res.success) {
                              const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                              const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                              fetchPoints();
                            } else setMessage(res.error ?? "Fehler!");
                            setBuyingPet(false);
                          }} disabled={buyingPet} className="rounded-lg p-2 text-center hover:scale-105 transition-transform" style={{
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", minWidth: "75px",
                          }}>
                            <div className="text-2xl">{p.emoji}</div>
                            <div className="text-[10px] text-gray-300">{p.name}</div>
                            <div className="text-[9px] text-yellow-400">{formatNumber(p.price)}</div>
                            <div className="text-[8px] text-purple-400">{p.bonusDesc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {shop.pets.some((p: any) => p.owned) && (
                    <div>
                      <h4 className="font-bold text-sm text-pink-300 mb-2">✅ Deine Pets</h4>
                      <div className="flex flex-wrap gap-2">
                        {shop.pets.filter((p: any) => p.owned).map((p: any) => (
                          <div key={p.id} className={`rounded-lg p-2 text-center ${p.active ? "ring-2 ring-pink-500" : ""}`} style={{
                            background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", minWidth: "75px",
                          }}>
                            <div className="text-2xl">{p.emoji}</div>
                            <div className="text-[10px] text-white">{p.name}</div>
                            <div className="text-[9px] text-purple-400">LVL {p.level}</div>
                            {p.active ? <div className="text-[8px] text-green-400">Aktiv</div> : (
                              <div className="flex gap-1">
                                <button onClick={async () => {
                                  await api.post<any>(`/viewer/${channelName}/casino/pet/activate`, { petId: p.id });
                                  const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                  const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                }} className="text-[8px] text-pink-300 hover:text-pink-200">Aktivieren</button>
                                <button onClick={async () => {
                                  if (!confirm(`${p.name} verkaufen?`)) return;
                                  const res = await api.post<any>(`/viewer/${channelName}/casino/pet/sell`, { petId: p.id }) as any;
                                  if (res.success) {
                                    setMessage(`${p.name} verkauft! +${res.data.points} Pts`);
                                    const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                    const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                    fetchPoints();
                                  } else setMessage(res.error ?? "Fehler!");
                                }} className="text-[8px] text-red-400 hover:text-red-300">Verkaufen</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {shop.categories.map((cat: any) => (
                    <div key={cat.category}>
                      <h4 className="font-bold text-sm text-pink-300 mb-2">{cat.emoji} {cat.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {cat.tiers.map((item: any) => (
                          <div key={item.index} className={`rounded-lg p-2 text-center min-w-[70px] ${item.equipped ? "ring-2 ring-pink-500" : ""}`} style={{
                            background: item.owned ? "rgba(244,114,182,0.1)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${item.owned ? "rgba(244,114,182,0.4)" : "rgba(255,255,255,0.08)"}`,
                          }}>
                            <div className="text-xl">{item.emoji}</div>
                            <div className="text-[10px] text-gray-300">{item.name}</div>
                            <div className="text-[9px] text-purple-400">{item.bonusDesc}: +{item.scaledBonus}</div>
                            {item.owned && <div className="text-[9px] text-pink-400">x{item.ownedCount}</div>}
                            <div className="mt-1 flex gap-1 justify-center">
                              {!item.equipped && item.owned && (
                                <button onClick={async () => {
                                  await api.post<any>(`/viewer/${channelName}/casino/pet/equip`, { category: cat.category, itemIndex: item.index });
                                  const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                  const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                }} className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 hover:bg-pink-500/30">
                                  Anlegen
                                </button>
                              )}
                              {item.equipped && (
                                <button onClick={async () => {
                                  await api.post<any>(`/viewer/${channelName}/casino/pet/unequip`, { category: cat.category });
                                  const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                  const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                }} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">
                                  Ablegen
                                </button>
                              )}
                              <button onClick={async () => {
                                const res = await api.post<any>(`/viewer/${channelName}/casino/pet/buy-item`, { category: cat.category, itemIndex: item.index }) as any;
                                if (res.success) {
                                  fetchPoints();
                                  const r = await api.get<any>(`/viewer/${channelName}/casino/pet`) as any; setPet(r.data);
                                  const s = await api.get<any>(`/viewer/${channelName}/casino/pet/shop`) as any; if (s.data) setShop(s.data);
                                } else setMessage(res.error ?? "Fehler!");
                              }} className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30">
                                {formatNumber(item.price)} Pts
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null;
            })()}
        </div>
      </div>
    </>
  );
}
