import type { CasinoSpecial } from "./types";

interface CasinoOverlaysProps {
  sirenActive: boolean;
  petWalkAnim: boolean;
  pet: any;
  petFeedAnim: boolean;
  petCleanAnim: boolean;
  lootboxDropAnim: { type: string; data: any } | null;
  catWalk: boolean;
  multiplierAnim: string | null;
  questBonusAnim: string | null;
  newAchievementPopup: { name: string; reward: number } | null;
  activeSpecial: CasinoSpecial | null;
}

export function CasinoOverlays(props: CasinoOverlaysProps) {
  const {
    sirenActive, petWalkAnim, pet, petFeedAnim, petCleanAnim,
    lootboxDropAnim, catWalk, multiplierAnim, questBonusAnim,
    newAchievementPopup, activeSpecial,
  } = props;

  return (
    <>
      {/* Siren flash overlay */}
      {sirenActive && (
        <div className="fixed inset-0 pointer-events-none z-50" style={{ animation: "siren-flash 0.3s ease-in-out infinite" }} />
      )}

      {/* Pet Walk Animation */}
      {petWalkAnim && pet && (
        <div className="fixed bottom-20 left-0 pointer-events-none z-50" style={{ animation: "pet-walk 3s ease-in-out forwards" }}>
          <div className="text-6xl">{(() => { const e: Record<string,string> = {cat:"\uD83D\uDC31",dog:"\uD83D\uDC36",bunny:"\uD83D\uDC30",fox:"\uD83E\uDD8A",panda:"\uD83D\uDC3C",dragon:"\uD83D\uDC09",unicorn:"\uD83E\uDD84",phoenix:"\uD83D\uDD25",alien:"\uD83D\uDC7E",robot:"\uD83E\uDD16",kraken:"\uD83E\uDD91",void:"\uD83D\uDD73️"}; return e[pet.activePetId] ?? "\uD83D\uDC31"; })()}</div>
          <div className="text-sm absolute -bottom-4 left-0" style={{ animation: "paw-print 0.5s ease-out forwards", animationDelay: "0.3s" }}>{"\uD83D\uDC3E"}</div>
          <div className="text-sm absolute -bottom-4 left-6" style={{ animation: "paw-print 0.5s ease-out forwards", animationDelay: "0.6s" }}>{"\uD83D\uDC3E"}</div>
          <div className="text-sm absolute -bottom-4 left-12" style={{ animation: "paw-print 0.5s ease-out forwards", animationDelay: "0.9s" }}>{"\uD83D\uDC3E"}</div>
        </div>
      )}

      {/* Pet Feed Animation */}
      {petFeedAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div style={{ animation: "pet-feed-chomp 0.4s ease-in-out 4" }}>
            <div className="text-7xl">😋{"\uD83C\uDF56"}</div>
          </div>
          <div className="absolute text-3xl" style={{ animation: "pet-feed-hearts 2s ease-out forwards" }}>❤️❤️❤️</div>
        </div>
      )}

      {/* Pet Clean Animation */}
      {petCleanAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-7xl" style={{ animation: "clean-wipe 0.5s ease-in-out 3" }}>{"\uD83E\uDDF9"}✨</div>
        </div>
      )}

      {/* Lootbox Drop Animation */}
      {lootboxDropAnim && (
        <div className="fixed inset-0 flex items-center justify-center z-[55] pointer-events-none">
          <div className="text-center" style={{ animation: "mystery-open 5s ease-out forwards" }}>
            {lootboxDropAnim.type === "pet" ? (
              <>
                <div className="text-8xl mb-4" style={{ animation: "multiplier-pop 3s ease-out", textShadow: "0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.4)" }}>
                  {lootboxDropAnim.data.emoji}
                </div>
                <div className="text-3xl font-black text-yellow-300 mb-2" style={{ textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
                  LEGENDARES PET!
                </div>
                <div className="text-xl font-bold text-white">{lootboxDropAnim.data.name}</div>
                <div className="text-sm text-purple-300 mt-1">Bonus: {lootboxDropAnim.data.bonus} +{(lootboxDropAnim.data.perLevel * 100).toFixed(1)}%/LVL</div>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4" style={{ animation: "multiplier-pop 3s ease-out", textShadow: "0 0 30px rgba(168,85,247,0.8)" }}>
                  {lootboxDropAnim.data.emoji}
                </div>
                <div className="text-2xl font-black text-purple-300 mb-2" style={{ textShadow: "0 0 20px rgba(168,85,247,0.8)" }}>
                  EPISCHES ITEM!
                </div>
                <div className="text-lg font-bold text-white">{lootboxDropAnim.data.name}</div>
                <div className="text-sm text-purple-400 mt-1">+{lootboxDropAnim.data.bonusValue} Bonus</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cat walk */}
      {catWalk && (
        <div className="fixed top-1/2 left-0 pointer-events-none z-50 text-8xl" style={{ animation: "cat-walk 3s linear forwards" }}>
          {"\uD83D\uDC08\u200D\u2B1B"}✨
        </div>
      )}

      {/* Multiplier popup */}
      {multiplierAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="multiplier-anim text-7xl font-black" style={{
            color: "#ffd700", textShadow: "0 0 30px #ffd700, 0 0 60px #ff6600, 0 0 90px #ff0000",
          }}>{multiplierAnim}</div>
        </div>
      )}

      {/* Quest Bonus floating text */}
      {questBonusAnim && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="quest-bonus-anim text-4xl font-black text-green-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.8)" }}>
            {questBonusAnim}
          </div>
        </div>
      )}

      {/* Achievement unlock popup */}
      {newAchievementPopup && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[55]">
          <div className="achievement-burst text-center px-8 py-6 rounded-2xl" style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(168,85,247,0.15))",
            border: "2px solid rgba(255,215,0,0.6)",
            boxShadow: "0 0 60px rgba(255,215,0,0.4)",
          }}>
            <div className="text-5xl mb-2">{"\uD83C\uDFC6"}</div>
            <div className="text-2xl font-black text-yellow-300 mb-1">ACHIEVEMENT FREIGESCHALTET!</div>
            <div className="text-lg text-white font-bold">{newAchievementPopup.name}</div>
            <div className="text-sm text-yellow-400 mt-1">+{newAchievementPopup.reward} Punkte</div>
          </div>
        </div>
      )}

      {/* Active Special Overlay */}
      {activeSpecial && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[55]">
          {activeSpecial.type === "mitleid" && (
            <div className="text-3xl font-black text-blue-400" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(96,165,250,0.8)" }}>
              +5 Mitleids-Punkte!
            </div>
          )}
          {activeSpecial.type === "ragequit" && (
            <div className="px-8 py-4 rounded-2xl font-black text-2xl text-yellow-300" style={{ animation: "special-slide 3s ease-out forwards", background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,100,0,0.1))", border: "2px solid rgba(255,215,0,0.5)", textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
              WILLKOMMEN ZURUCK! +25
            </div>
          )}
          {activeSpecial.type === "beinahe_jackpot" && (
            <div className="text-4xl font-black text-orange-400" style={{ animation: "near-miss-shake 0.5s ease-in-out 3", textShadow: "0 0 20px rgba(251,146,60,0.8)" }}>
              SO KNAPP!
            </div>
          )}
          {activeSpecial.type === "verfluchte_muenze" && (
            <div className="text-6xl" style={{ animation: "fire-flicker 0.5s ease-in-out infinite" }}>
              {"\uD83D\uDD25\uD83E\uDE99\uD83D\uDD25"}
            </div>
          )}
          {activeSpecial.type === "schwarze_katze" && (
            <div className="text-2xl font-black text-purple-300" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(168,85,247,0.8)" }}>
              {"\uD83D\uDC08\u200D\u2B1B"} Schwarze Katze! Nachster = Gewinn!
            </div>
          )}
          {activeSpecial.type === "goldener_regen" && (
            <div className="text-5xl font-black text-yellow-300" style={{ animation: "multiplier-pop 3s ease-out forwards", textShadow: "0 0 40px rgba(255,215,0,0.9)" }}>
              GOLDENER REGEN!
            </div>
          )}
          {activeSpecial.type === "multiplikator" && (
            <div className="text-center">
              <div className="text-6xl mb-2" style={{ animation: "wheel-spin 2s ease-out forwards" }}>{"\uD83C\uDFA1"}</div>
              <div className="text-4xl font-black text-yellow-300" style={{ animation: "multiplier-pop 4s ease-out forwards", textShadow: "0 0 30px rgba(255,215,0,0.9)" }}>
                x{activeSpecial.animationData?.multiplier}! +{activeSpecial.animationData?.bonus} BONUS!
              </div>
            </div>
          )}
          {activeSpecial.type === "jackpot_sirene" && (
            <div className="text-5xl font-black" style={{ animation: "multiplier-pop 3s ease-out forwards", color: "#ff0000", textShadow: "0 0 40px #ff0000, 0 0 80px #ffd700" }}>
              {"\uD83D\uDEA8"} JACKPOT SIRENE! {"\uD83D\uDEA8"}
            </div>
          )}
          {activeSpecial.type === "geschenk_an_chat" && (
            <div className="text-center">
              <div className="text-4xl font-black text-pink-400 mb-2" style={{ animation: "multiplier-pop 3s ease-out forwards" }}>
                GESCHENK AN CHAT!
              </div>
              <div className="text-lg text-pink-300">
                {activeSpecial.animationData?.recipients?.join(", ")} bekommen je +10!
              </div>
            </div>
          )}
          {activeSpecial.type === "mystery_box" && (
            <div className="text-center" style={{ animation: "mystery-open 3s ease-out forwards" }}>
              <div className="text-6xl mb-2">{"\uD83D\uDCE6"}</div>
              <div className="text-3xl font-black text-cyan-300" style={{ textShadow: "0 0 20px rgba(34,211,238,0.8)" }}>
                MYSTERY BOX! +{activeSpecial.points}!
              </div>
            </div>
          )}
          {activeSpecial.type === "boss_damage" && (
            <div className="text-3xl font-black text-red-400" style={{ animation: "special-float 3s ease-out forwards", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>
              -{activeSpecial.animationData?.damage} HP!
            </div>
          )}
          {activeSpecial.type === "boss_kill" && (
            <div className="text-center">
              <div className="text-5xl font-black text-red-500 mb-2" style={{ animation: "multiplier-pop 3s ease-out forwards", textShadow: "0 0 40px rgba(239,68,68,0.8)" }}>
                {"\uD83D\uDC80"} BOSS BESIEGT!
              </div>
              <div className="text-xl text-yellow-300">+50 Bonus an alle Teilnehmer!</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
