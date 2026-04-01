# Casino Progression System — Anforderungskatalog

## Übersicht

Drei Phasen zur Langzeitmotivation im CriStream Casino:
- **Phase 1**: Tägliche Quests + Achievements
- **Phase 2**: Battle Pass / Saison-System
- **Phase 3**: Heists (Multiplayer)

---

## Phase 1: Tägliche Quests + Achievements

### 1.1 Tägliche Quests

#### Konzept
- Jeden Tag um 00:00 Uhr (CET) werden **3 Quests** aus einem Pool von ~40 zufällig zugewiesen
- Quests sind für jeden Spieler unterschiedlich (Redis-basiert, pro User)
- Jede Quest hat eine Belohnung (Punkte, selten: Lootbox-Item oder Titel)
- Quests verfallen um Mitternacht — nicht abgeschlossene gehen verloren
- Fortschritt wird in Echtzeit auf der Casino-Seite angezeigt

#### Quest-Pool (Beispiele)

**Einfach (Belohnung: 15-30 Punkte)**
- "Spiele 5x Slots"
- "Spiele 3x Rubbellos"
- "Wirf 10x die Münze"
- "Drehe das Glücksrad"
- "Spiele ein beliebiges Spiel"
- "Besuche die Casino-Seite"

**Mittel (Belohnung: 30-75 Punkte)**
- "Gewinne 3x bei Slots"
- "Gewinne 5x beim Münzwurf"
- "Erziele einen Zweier beim Rubbellos"
- "Sammle insgesamt 50 Punkte durch Gewinne"
- "Spiele 3 verschiedene Spiele"
- "Verdopple erfolgreich bei Doppelt-oder-Nichts"
- "Erreiche eine 3er Winning Streak"
- "Kaufe ein Bingo- oder Lotto-Ticket"
- "Besiege den Boss (mind. 1 Damage)"

**Schwer (Belohnung: 75-150 Punkte)**
- "Gewinne 5x hintereinander (beliebiges Spiel)"
- "Erziele einen Triple bei Slots"
- "Erziele einen Triple beim Rubbellos"
- "Sammle insgesamt 200 Punkte durch Gewinne"
- "Verdopple 3x hintereinander bei Doppelt-oder-Nichts"
- "Löse 2 verschiedene Specials aus (Mystery Box, Katze, etc.)"
- "Spiele 20 Runden insgesamt"

**Bonus-Quests (selten, 1 von 3 Slots, besondere Belohnung)**
- "Erziele einen 777 Jackpot" → Exklusiver Titel: [Jackpot-Jäger]
- "Löse die Schwarze Katze aus" → +100 Punkte + Lootbox
- "Gewinne 10x hintereinander" → Exklusiver Titel: [Unaufhaltbar]

#### Technische Umsetzung

**Redis-Struktur:**
```
casino:quests:{channelId}:{userId} = JSON {
  date: "2026-04-01",
  quests: [
    { id: "win_slots_3", name: "Gewinne 3x bei Slots", target: 3, progress: 1, reward: 50, done: false },
    { id: "play_any_5", name: "Spiele 5 Runden", target: 5, progress: 3, reward: 20, done: false },
    { id: "triple_slots", name: "Erziele einen Slots Triple", target: 1, progress: 0, reward: 100, done: false }
  ]
}
TTL: bis Mitternacht CET
```

**Tracking:**
- Nach jedem Spiel (in `postPlaySpecials` oder separater Funktion) werden alle aktiven Quests geprüft
- Quest-Typen brauchen verschiedene Trigger:
  - `play_*`: Zählt jedes Spiel des Typs
  - `win_*`: Zählt nur Gewinne
  - `streak_*`: Prüft aktuelle Streak
  - `special_*`: Prüft ob ein Special ausgelöst wurde
  - `total_points_*`: Summiert Gewinne des Tages
  - `double_*`: Zählt erfolgreiche Doppelungen
- Bei Completion: Punkte direkt in DB, Quest als `done` markieren
- Activity Feed Eintrag: "🎯 Quest abgeschlossen: ..."

**API-Endpoints:**
- `GET /api/viewer/:channelName/casino/quests` — Aktuelle 3 Quests mit Fortschritt
- Quest-Fortschritt wird auch in der Gamble-Response zurückgegeben (optional, für Live-Updates)

**Frontend:**
- Quest-Panel auf der Casino-Seite (zwischen Header und Spielautomaten)
- 3 Quest-Cards nebeneinander mit Fortschrittsbalken
- Abgeschlossene Quests: grüner Haken, Glow-Animation, Confetti
- Belohnung wird sofort angezeigt: "+50 Quest Bonus!"
- Countdown bis Reset: "Neue Quests in 3h 42m"

---

### 1.2 Achievements

#### Konzept
- Permanente Errungenschaften die einmalig freigeschaltet werden
- ~60-80 Achievements in Kategorien
- Jedes Achievement gibt eine einmalige Belohnung (Punkte, Titel, Lootbox)
- Achievements werden auf der Profilseite angezeigt
- Seltene Achievements haben besondere Rahmen/Farben

#### Achievement-Kategorien und Beispiele

**Erste Schritte (8 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| Erstes Mal | Spiele dein erstes Spiel | 10 Pts |
| Anfängerglück | Gewinne dein erstes Spiel | 15 Pts |
| Münzmeister | Spiele 10x Münzwurf | 20 Pts |
| Slot-Neuling | Spiele 10x Slots | 20 Pts |
| Rubbelkönig | Spiele 10x Rubbellos | 20 Pts |
| Allrounder | Spiele alle 3 Spiele mindestens 1x | 25 Pts |
| Glücksrad-Debüt | Drehe das Glücksrad | 10 Pts |
| Ticket-Käufer | Kaufe ein Bingo oder Lotto Ticket | 15 Pts |

**Meilensteine (12 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| 100er Club | Spiele 100 Runden insgesamt | 50 Pts |
| 500er Club | Spiele 500 Runden insgesamt | 150 Pts |
| 1000er Club | Spiele 1000 Runden insgesamt | 300 Pts + Titel [Veteran] |
| Punktesammler | Verdiene insgesamt 1.000 Punkte | 50 Pts |
| Reicher Sack | Verdiene insgesamt 10.000 Punkte | 200 Pts + Titel [Reicher Sack] |
| Millionär | Habe 5.000 Punkte gleichzeitig | 100 Pts |
| Marathon | Spiele 50 Runden an einem Tag | 75 Pts |
| Dauerbrenner | Spiele an 7 verschiedenen Tagen | 100 Pts |
| Stammgast | Spiele an 30 verschiedenen Tagen | 300 Pts + Titel [Stammgast] |
| Quest-Meister | Schließe 10 Quests ab | 75 Pts |
| Quest-Legende | Schließe 50 Quests ab | 200 Pts |
| Perfekter Tag | Schließe alle 3 Tagesquests ab | 50 Pts |

**Glück (10 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| Doppelt hält besser | Erziele einen Zweier (Slots oder Scratch) | 15 Pts |
| Triple Threat | Erziele einen Triple | 50 Pts |
| Diamant-Jäger | Erziele einen Diamant Triple | 100 Pts |
| 777 | Erziele den 777 Jackpot | 200 Pts + Titel [777] |
| Mega Gewinn | Gewinne 500+ Punkte in einem Spiel | 100 Pts |
| Glückskeks | Gewinne 10x hintereinander | 150 Pts + Titel [Glückskeks] |
| Unaufhaltbar | Gewinne 20x hintereinander | 500 Pts + Titel [Unaufhaltbar] |
| Lucky Seven | Gewinne 7x am Glücksrad | 75 Pts |
| Lotto König | Gewinne beim Lotto (3+ Richtige) | 100 Pts |
| Bingo! | Gewinne beim Bingo (3+ Treffer) | 75 Pts |

**Pech (8 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| Erste Niederlage | Verliere dein erstes Spiel | 5 Pts |
| Pechsträhne | Verliere 5x hintereinander | 25 Pts |
| Hartgesotten | Verliere 10x hintereinander | 75 Pts + Titel [Hartgesotten] |
| Verfluchter | Löse die Verfluchte Münze aus | 30 Pts |
| Katzenfinder | Löse die Schwarze Katze aus | 30 Pts |
| Trostpreis-Sammler | Erhalte 20x Trostpreis | 40 Pts |
| Comeback | Gewinne nach 5er Pechsträhne | 50 Pts |
| Mitleids-Empfänger | Erhalte 10x Mitleids-Punkte | 40 Pts |

**Specials (10 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| Mystery! | Erhalte eine Mystery Box | 25 Pts |
| Mystery-Sammler | Erhalte 10 Mystery Boxen | 100 Pts |
| Multiplikator | Löse das Multiplikator-Rad aus | 30 Pts |
| x5! | Erhalte einen x5 Multiplikator | 150 Pts |
| Sirenen-Alarm | Löse die Jackpot-Sirene aus | 50 Pts |
| Geschenk-Geber | Löse "Geschenk an Chat" aus | 75 Pts |
| Boss-Kämpfer | Deale Damage an einen Boss | 25 Pts |
| Boss-Killer | Sei dabei wenn ein Boss stirbt | 75 Pts |
| Boss-Veteran | Besiege 5 Bosse | 200 Pts + Titel [Drachentöter] |
| Rage-Quitter | Erhalte den Rage Quit Bonus | 20 Pts |

**Doppelt-oder-Nichts (6 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| Nervenkitzel | Verdopple zum ersten Mal | 15 Pts |
| Risiko-Spieler | Verdopple 3x hintereinander | 50 Pts |
| High Roller | Verdopple auf 500+ Punkte | 100 Pts |
| Zocker-König | Verdopple 5x hintereinander | 300 Pts + Titel [Zocker-König] |
| Kluge Entscheidung | Sacke 200+ Punkte ein | 50 Pts |
| Gierig | Verliere bei Doppeln mit 200+ Einsatz | 30 Pts |

**Sozial (6 Achievements)**
| Achievement | Bedingung | Belohnung |
|---|---|---|
| Großzügig | Löse "Geschenk an Chat" 3x aus | 100 Pts |
| Teamplayer | Nimm an 3 Boss Fights teil | 50 Pts |
| Beschenkter | Erhalte Punkte durch "Geschenk an Chat" eines anderen | 20 Pts |
| Handelsmeister | Schließe 5 Trades ab | 75 Pts |
| Markt-Hai | Verkaufe 10 Items auf dem Marktplatz | 75 Pts |
| Sammler | Besitze 20 verschiedene Items | 100 Pts |

#### Technische Umsetzung

**Datenbank:**
```prisma
model ViewerAchievement {
  id            String   @id @default(uuid())
  channelId     String
  twitchUserId  String
  achievementId String   // z.B. "first_play", "triple_threat", "777"
  unlockedAt    DateTime @default(now())

  channel       Channel  @relation(fields: [channelId], references: [id])
  @@unique([channelId, twitchUserId, achievementId])
  @@index([channelId, twitchUserId])
}
```

**Achievement-Registry (Code):**
```typescript
interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: "start" | "milestone" | "luck" | "pech" | "specials" | "double" | "social";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  reward: { points?: number; title?: string; lootbox?: boolean };
  // Tracking
  check: (stats: PlayerStats) => boolean;
}
```

**Stat-Tracking (Redis + DB hybrid):**
```
casino:stats:{channelId}:{userId} = JSON {
  totalPlays: 1234,
  totalWins: 567,
  totalLost: 667,
  totalPointsWon: 12345,
  currentStreak: 3,
  maxStreak: 12,
  lossStreak: 0,
  maxLossStreak: 8,
  slotsPlayed: 400,
  slotsWon: 180,
  scratchPlayed: 300,
  flipPlayed: 534,
  triplesHit: 12,
  jackpots777: 1,
  doublesWon: 45,
  maxDoubleStreak: 4,
  maxDoubleAmount: 350,
  mysteryBoxes: 8,
  bossesKilled: 2,
  bossDamageDealt: 234,
  specialsTriggered: 67,
  questsCompleted: 23,
  daysPlayed: 15,
  gluecksradSpins: 12,
  giftsTriggered: 3,
  lastPlayDate: "2026-04-01"
}
```
- Stats werden nach jedem Spiel aktualisiert
- `daysPlayed` wird erhöht wenn `lastPlayDate !== today`
- Stats persistent in Redis (kein TTL), optional periodisch in DB sichern

**API-Endpoints:**
- `GET /api/viewer/:channelName/casino/achievements` — Alle Achievements mit Status (locked/unlocked)
- `GET /api/viewer/:channelName/casino/stats` — Spielerstatistiken
- Achievement-Unlocks werden auch in der Gamble-Response zurückgegeben

**Frontend:**
- Achievement-Panel auf der Casino-Seite (unterhalb der Spiele, vor dem Feed)
- Grid mit Achievement-Icons, gesperrte sind ausgegraut
- Unlock-Animation: goldener Burst + Achievement-Name + Belohnung
- Fortschrittsanzeige bei noch nicht freigeschalteten (z.B. "7/10 Runden")
- Achievements auf der Profilseite (/viewer/:channel/profile/:id) anzeigen
- Rarity-Farben: Common=grau, Uncommon=grün, Rare=blau, Epic=lila, Legendary=gold
- Achievement-Counter im Header: "🏆 23/60"

---

## Phase 2: Battle Pass / Saison-System

### Konzept
- 30-Tage-Saison mit Thema (z.B. "Saison 1: Goldfieber", "Saison 2: Drachenjagd")
- XP-System: jedes Spiel gibt XP, Quests geben Bonus-XP
- 50 Stufen pro Saison
- Jede Stufe hat eine Belohnung (Free Track)
- Optional: Premium Track für 500 Punkte (bessere Belohnungen)
- Saison-Leaderboard: wer hat die meiste XP?
- Am Saisonende: Reset, neue Belohnungen, Top 3 bekommen exklusive Titel

### XP-Quellen
| Aktion | XP |
|---|---|
| Spiel spielen | 5 XP |
| Spiel gewinnen | 10 XP |
| Triple | 25 XP |
| Jackpot 777 | 100 XP |
| Quest abschließen | 30 XP |
| Alle 3 Quests an einem Tag | 50 XP Bonus |
| Boss Damage | 5 XP pro 10 Damage |
| Boss Kill (dabei sein) | 50 XP |
| Achievement freischalten | 20 XP |
| Glücksrad drehen | 10 XP |
| Täglicher Login | 15 XP |

### Stufen-Belohnungen (Beispiel Saison 1)

**Free Track:**
- Stufe 1: 25 Punkte
- Stufe 5: Titel [Saison 1]
- Stufe 10: 100 Punkte
- Stufe 15: Lootbox
- Stufe 20: 200 Punkte
- Stufe 25: Titel [Goldgräber]
- Stufe 30: 300 Punkte
- Stufe 35: 2x Lootbox
- Stufe 40: 500 Punkte
- Stufe 45: Titel [Saison 1 Veteran]
- Stufe 50: 1000 Punkte + Exklusiver Titel [Goldfieber-Champion] + Profilrahmen

**Premium Track (zusätzlich):**
- Stufe 1: +25 Punkte
- Stufe 5: Exklusives Item
- Stufe 10: +100 Punkte
- ... (doppelte Belohnungen + exklusive Cosmetics)

### Technische Umsetzung

**Datenbank:**
```prisma
model Season {
  id        String   @id @default(uuid())
  channelId String
  name      String   // "Saison 1: Goldfieber"
  number    Int
  startDate DateTime
  endDate   DateTime
  active    Boolean  @default(true)
  rewards   Json     // Array von { level, freeReward, premiumReward }

  channel   Channel  @relation(fields: [channelId], references: [id])
  @@unique([channelId, number])
}

model SeasonProgress {
  id           String  @id @default(uuid())
  channelId    String
  twitchUserId String
  seasonId     String
  xp           Int     @default(0)
  level        Int     @default(0)
  premium      Boolean @default(false)
  claimedLevels Int[]  @default([])

  season       Season  @relation(fields: [seasonId], references: [id])
  @@unique([channelId, twitchUserId, seasonId])
}
```

**Frontend:**
- Battle Pass Seite oder Section auf Casino-Seite
- Horizontale Stufenleiste mit Belohnungen (scrollbar)
- Aktuelle Stufe hervorgehoben, XP-Balken zur nächsten Stufe
- Saison-Countdown: "Endet in 12 Tagen"
- "Premium kaufen" Button (500 Punkte)
- Saison-Leaderboard Tab

---

## Phase 3: Heists (Multiplayer)

### Konzept
- Ein Spieler startet einen "Heist" (Kosten: 50 Punkte)
- 2-4 weitere Spieler können beitreten (je 25 Punkte Eintritt)
- Lobby-Phase: 2 Minuten Wartezeit zum Beitreten
- Spiel-Phase: Jeder Spieler spielt nacheinander 3 Runden (beliebiges Spiel)
- Alle Gewinne fließen in den gemeinsamen Heist-Topf
- Am Ende wird der Topf aufgeteilt:
  - Alle gewinnen: Topf x1.5, gleichmäßig verteilt
  - Mindestens einer verliert: Topf x1.0, gleichmäßig verteilt
  - Alle verlieren: Topf x0.5 zurück

### Twist: Verrat
- Nach der Spiel-Phase kann jeder Spieler "Verraten" wählen (10 Sekunden Fenster)
- Verrät niemand: normaler Split
- Verrät einer: Verräter bekommt 80% vom Topf, Rest teilt sich 20%
- Verraten mehrere: Alle Verräter verlieren ihren Anteil, treue Spieler teilen den ganzen Topf
- Gibt Achievement: "Verräter" und "Treue Seele"

### Technische Umsetzung
- WebSocket-basiert (Echtzeit Lobby + Spielrunden)
- Redis für Heist-State (kurzlebig, 10 Min TTL)
- Heist-Historie in DB für Leaderboard
- Socket Events: `heist:create`, `heist:join`, `heist:play`, `heist:betray`, `heist:result`

---

## Prioritäten und Abhängigkeiten

```
Phase 1a: Stat-Tracking (Grundlage für alles)
    ↓
Phase 1b: Achievements (braucht Stats)
    ↓
Phase 1c: Tägliche Quests (braucht Stats + Achievement-Infrastruktur)
    ↓
Phase 2: Battle Pass (braucht XP, das auf Stats + Quests aufbaut)
    ↓
Phase 3: Heists (eigenständig, braucht WebSocket-Erweiterungen)
```

## Nicht-funktionale Anforderungen
- Alle Progression-Daten überleben Server-Neustarts (Redis persistent oder DB-backed)
- Stats-Updates dürfen das Spiel nicht verlangsamen (async wo möglich)
- Achievement-Checks müssen effizient sein (nicht alle 60 nach jedem Spiel prüfen, sondern nur relevante)
- Frontend-Updates in Echtzeit (Fortschrittsbalken, Achievement-Popups)
- Alle Texte auf Deutsch
- Mobile-responsive (Quest-Cards stacken vertikal)
- Twitch Chat Integration: "🏆 @User hat Achievement 'Triple Threat' freigeschaltet!"
