// ~1000 pre-built lootbox items across all categories

interface SeedItem {
  name: string;
  description: string;
  type: string;
  rarity: string;
  weight: number;
  config: Record<string, any>;
}

function t(name: string, prefix: string, rarity: string, weight: number, desc = ""): SeedItem {
  return { name, description: desc, type: "title", rarity, weight, config: { prefix } };
}

function pts(name: string, amount: number, rarity: string, weight: number): SeedItem {
  return { name, description: `+${amount} Punkte`, type: "bonus_points", rarity, weight, config: { amount } };
}

function card(series: string, num: number, total: number, rarity: string, weight: number): SeedItem {
  return {
    name: `${series} #${String(num).padStart(3, "0")}`,
    description: `${series} Sammelkarte ${num}/${total}`,
    type: "card",
    rarity,
    weight,
    config: { series, number: num, totalInSeries: total },
  };
}

function action(name: string, desc: string, rarity: string, weight: number): SeedItem {
  return { name, description: desc, type: "action_token", rarity, weight, config: { description: desc } };
}

function mult(name: string, multiplier: number, minutes: number, rarity: string, weight: number): SeedItem {
  return {
    name,
    description: `${multiplier}x Punkte für ${minutes} Min`,
    type: "point_multiplier",
    rarity,
    weight,
    config: { multiplier, durationMinutes: minutes },
  };
}

export function generateSeedItems(): SeedItem[] {
  const items: SeedItem[] = [];

  // ═══════════════════════════════════════
  // CHAT TITLES (~150)
  // ═══════════════════════════════════════

  // Common Titles (50 weight)
  const commonTitles: [string, string][] = [
    ["Zuschauer", "[👀 Zuschauer]"],
    ["Lurker", "[🫥 Lurker]"],
    ["Newbie", "[🐣 Newbie]"],
    ["Chatter", "[💬 Chatter]"],
    ["Stammgast", "[🏠 Stammgast]"],
    ["Nachteuler", "[🦉 Nachteuler]"],
    ["Frühaufsteher", "[🌅 Frühaufsteher]"],
    ["Kaffeejunkie", "[☕ Kaffeejunkie]"],
    ["Snack-König", "[🍿 Snack-König]"],
    ["Chill Typ", "[😎 Chill Typ]"],
    ["Gamer", "[🎮 Gamer]"],
    ["Tryhard", "[💪 Tryhard]"],
    ["Noob", "[🤡 Noob]"],
    ["Bot", "[🤖 Bot]"],
    ["NPC", "[🧍 NPC]"],
    ["Kartoffel", "[🥔 Kartoffel]"],
    ["Toaster", "[🍞 Toaster]"],
    ["Gurke", "[🥒 Gurke]"],
    ["Pixel", "[🟩 Pixel]"],
    ["Schatten", "[👤 Schatten]"],
    ["Mumie", "[🧟 Mumie]"],
    ["Geist", "[👻 Geist]"],
    ["Kaktus", "[🌵 Kaktus]"],
    ["Regenwurm", "[🪱 Regenwurm]"],
    ["Biene", "[🐝 Biene]"],
    ["Schnecke", "[🐌 Schnecke]"],
    ["Frosch", "[🐸 Frosch]"],
    ["Ente", "[🦆 Ente]"],
    ["Hamster", "[🐹 Hamster]"],
    ["Panda", "[🐼 Panda]"],
    ["Donut", "[🍩 Donut]"],
    ["Banane", "[🍌 Banane]"],
    ["Avocado", "[🥑 Avocado]"],
    ["Pilz", "[🍄 Pilz]"],
    ["Stern", "[⭐ Stern]"],
    ["Wolke", "[☁️ Wolke]"],
    ["Rakete", "[🚀 Rakete]"],
    ["Clown", "[🤡 Clown]"],
    ["Papagei", "[🦜 Papagei]"],
    ["Faultier", "[🦥 Faultier]"],
    ["Eichhörnchen", "[🐿️ Eichhörnchen]"],
    ["Pinguin", "[🐧 Pinguin]"],
    ["Schildkröte", "[🐢 Schildkröte]"],
    ["Hai", "[🦈 Hai]"],
    ["Flamingo", "[🦩 Flamingo]"],
    ["Ananas", "[🍍 Ananas]"],
    ["Popcorn", "[🍿 Popcorn]"],
    ["Diamant", "[💎 Diamant]"],
    ["Vulkan", "[🌋 Vulkan]"],
  ];
  for (const [name, prefix] of commonTitles) {
    items.push(t(name, prefix, "common", 50));
  }

  // Uncommon Titles (25 weight)
  const uncommonTitles: [string, string][] = [
    ["Ritter", "[⚔️ Ritter]"],
    ["Magier", "[🧙 Magier]"],
    ["Pirat", "[🏴‍☠️ Pirat]"],
    ["Ninja", "[🥷 Ninja]"],
    ["Samurai", "[⛩️ Samurai]"],
    ["Wikinger", "[🪓 Wikinger]"],
    ["Gladiator", "[🗡️ Gladiator]"],
    ["Alchemist", "[⚗️ Alchemist]"],
    ["Wanderer", "[🗺️ Wanderer]"],
    ["Jäger", "[🏹 Jäger]"],
    ["Schmied", "[🔨 Schmied]"],
    ["Barde", "[🎵 Barde]"],
    ["Heiler", "[💚 Heiler]"],
    ["Dieb", "[🦝 Dieb]"],
    ["Koch", "[👨‍🍳 Koch]"],
    ["Detektiv", "[🔍 Detektiv]"],
    ["Pilot", "[✈️ Pilot]"],
    ["Astronaut", "[🧑‍🚀 Astronaut]"],
    ["DJ", "[🎧 DJ]"],
    ["Künstler", "[🎨 Künstler]"],
    ["Erfinder", "[💡 Erfinder]"],
    ["Forscher", "[🔬 Forscher]"],
    ["Hacker", "[💻 Hacker]"],
    ["Zombie Jäger", "[🧟‍♂️ Zombie Jäger]"],
    ["Schatzsucher", "[💰 Schatzsucher]"],
    ["Zeitreisender", "[⏰ Zeitreisender]"],
    ["Mondmensch", "[🌙 Mondmensch]"],
    ["Sturmjäger", "[🌪️ Sturmjäger]"],
    ["Feuerläufer", "[🔥 Feuerläufer]"],
    ["Eiskönig", "[❄️ Eiskönig]"],
  ];
  for (const [name, prefix] of uncommonTitles) {
    items.push(t(name, prefix, "uncommon", 25));
  }

  // Rare Titles (15 weight)
  const rareTitles: [string, string][] = [
    ["Drachentöter", "[🐉 Drachentöter]"],
    ["Phönix", "[🔥 Phönix]"],
    ["Titanenschmied", "[⚒️ Titanenschmied]"],
    ["Sternenwächter", "[⭐ Sternenwächter]"],
    ["Schattenmeister", "[🌑 Schattenmeister]"],
    ["Kristallmagier", "[💎 Kristallmagier]"],
    ["Donnerherz", "[⚡ Donnerherz]"],
    ["Flammenseele", "[🔥 Flammenseele]"],
    ["Sturmbrecher", "[🌊 Sturmbrecher]"],
    ["Nachtkönig", "[👑 Nachtkönig]"],
    ["Blutmond", "[🌕 Blutmond]"],
    ["Nebelwandler", "[🌫️ Nebelwandler]"],
    ["Runenträger", "[🪨 Runenträger]"],
    ["Seelenleser", "[👁️ Seelenleser]"],
    ["Weltenwanderer", "[🌍 Weltenwanderer]"],
    ["Dunkler Ritter", "[🖤 Dunkler Ritter]"],
    ["Lichtbringer", "[✨ Lichtbringer]"],
    ["Donnergott", "[⛈️ Donnergott]"],
    ["Frostherz", "[🧊 Frostherz]"],
    ["Schicksalsschmied", "[🔮 Schicksalsschmied]"],
  ];
  for (const [name, prefix] of rareTitles) {
    items.push(t(name, prefix, "rare", 15));
  }

  // Epic Titles (8 weight)
  const epicTitles: [string, string][] = [
    ["Legende", "[🏆 Legende]"],
    ["Unsterblicher", "[♾️ Unsterblicher]"],
    ["Dimensionsbrecher", "[🌌 Dimensionsbrecher]"],
    ["Götterflüsterer", "[🙏 Götterflüsterer]"],
    ["Schattenkönig", "[👿 Schattenkönig]"],
    ["Elementarherrscher", "[🌪️ Elementarherrscher]"],
    ["Zeitwächter", "[⌛ Zeitwächter]"],
    ["Sternenkrieger", "[💫 Sternenkrieger]"],
    ["Seelenbrecher", "[💀 Seelenbrecher]"],
    ["Weltenherrscher", "[🌐 Weltenherrscher]"],
    ["Erzmagier", "[🔮 Erzmagier]"],
    ["Drachenlord", "[🐲 Drachenlord]"],
    ["Götterschmied", "[⚡ Götterschmied]"],
    ["Ewiger Wächter", "[🛡️ Ewiger Wächter]"],
    ["Chaos Champion", "[💥 Chaos Champion]"],
  ];
  for (const [name, prefix] of epicTitles) {
    items.push(t(name, prefix, "epic", 8));
  }

  // Legendary Titles (2 weight)
  const legendaryTitles: [string, string][] = [
    ["Gott des Chats", "[⚜️ Gott des Chats]"],
    ["Der Auserwählte", "[🌟 Der Auserwählte]"],
    ["Allmächtiger", "[👑 Allmächtiger]"],
    ["Omega", "[Ω Omega]"],
    ["Der Unbesiegbare", "[🏅 Der Unbesiegbare]"],
    ["Meister aller Klassen", "[🎖️ Meister aller Klassen]"],
    ["Ewige Flamme", "[🔥 Ewige Flamme]"],
    ["Alpha & Omega", "[α Ω Alpha & Omega]"],
    ["Schöpfer", "[✦ Schöpfer]"],
    ["Transzendent", "[∞ Transzendent]"],
  ];
  for (const [name, prefix] of legendaryTitles) {
    items.push(t(name, prefix, "legendary", 2));
  }

  // ═══════════════════════════════════════
  // COLLECTIBLE CARDS (~500)
  // ═══════════════════════════════════════

  const cardSeries: { name: string; total: number; rarityDist: Record<string, [number, number][]> }[] = [
    {
      name: "Drachen",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Waffen",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Monster",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Helden",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Planeten",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Tiere",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Edelsteine",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Zauber",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Runen",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Artefakte",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Biome",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Legenden",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
    {
      name: "Fahrzeuge",
      total: 50,
      rarityDist: {
        common: [[1, 20]],
        uncommon: [[21, 35]],
        rare: [[36, 44]],
        epic: [[45, 48]],
        legendary: [[49, 50]],
      },
    },
  ];

  const rarityWeights: Record<string, number> = { common: 50, uncommon: 25, rare: 15, epic: 8, legendary: 2 };

  for (const series of cardSeries) {
    for (let num = 1; num <= series.total; num++) {
      let rarity = "common";
      for (const [r, ranges] of Object.entries(series.rarityDist)) {
        for (const [from, to] of ranges) {
          if (num >= from && num <= to) rarity = r;
        }
      }
      items.push(card(series.name, num, series.total, rarity, rarityWeights[rarity]!));
    }
  }

  // ═══════════════════════════════════════
  // BONUS POINTS (~50)
  // ═══════════════════════════════════════
  items.push(pts("Kleingeld", 10, "common", 50));
  items.push(pts("Taschengeld", 25, "common", 50));
  items.push(pts("Trinkgeld", 50, "common", 50));
  items.push(pts("Münzbeutel", 75, "common", 50));
  items.push(pts("Spardose", 100, "common", 50));
  items.push(pts("Geldbörse", 150, "common", 50));
  items.push(pts("Sparstrumpf", 200, "uncommon", 25));
  items.push(pts("Silberbarren", 250, "uncommon", 25));
  items.push(pts("Goldmünze", 300, "uncommon", 25));
  items.push(pts("Geldkoffer", 400, "uncommon", 25));
  items.push(pts("Schatztruhe", 500, "uncommon", 25));
  items.push(pts("Goldbarren", 600, "uncommon", 25));
  items.push(pts("Edelstein-Beutel", 750, "rare", 15));
  items.push(pts("Diamant-Koffer", 1000, "rare", 15));
  items.push(pts("Drachenhort", 1500, "rare", 15));
  items.push(pts("Königsschatz", 2000, "rare", 15));
  items.push(pts("Piratenschatz", 2500, "rare", 15));
  items.push(pts("Pharaonengold", 3000, "epic", 8));
  items.push(pts("Aztekenschatz", 4000, "epic", 8));
  items.push(pts("El Dorado", 5000, "epic", 8));
  items.push(pts("Heiliger Gral", 7500, "epic", 8));
  items.push(pts("Unendlicher Reichtum", 10000, "legendary", 2));
  items.push(pts("Jeff Bezos Konto", 15000, "legendary", 2));
  items.push(pts("Elon Musk Budget", 20000, "legendary", 2));
  items.push(pts("Jackpot", 25000, "legendary", 2));
  items.push(pts("Lottogewinn", 50000, "legendary", 2));
  items.push(pts("Kupfermünze", 5, "common", 50));
  items.push(pts("Silbermünze", 15, "common", 50));
  items.push(pts("Bronzebarren", 30, "common", 50));
  items.push(pts("Goldstaub", 40, "common", 50));
  items.push(pts("Edelstein", 125, "common", 50));
  items.push(pts("Kristallsplitter", 175, "uncommon", 25));
  items.push(pts("Rubinbeutel", 350, "uncommon", 25));
  items.push(pts("Smaragd-Cache", 450, "uncommon", 25));
  items.push(pts("Saphirhort", 550, "uncommon", 25));
  items.push(pts("Platin-Reserve", 800, "rare", 15));
  items.push(pts("Mythril-Schatz", 1250, "rare", 15));
  items.push(pts("Adamantium-Barren", 1750, "rare", 15));
  items.push(pts("Orichalcum", 2250, "rare", 15));
  items.push(pts("Unobtanium", 3500, "epic", 8));
  items.push(pts("Vibranium-Block", 4500, "epic", 8));
  items.push(pts("Infinity Stone", 6000, "epic", 8));
  items.push(pts("Philosoph. Stein", 8000, "epic", 8));
  items.push(pts("Kryptonit-Schatz", 12000, "legendary", 2));
  items.push(pts("Weltbank-Zugang", 30000, "legendary", 2));

  // ═══════════════════════════════════════
  // ACTION TOKENS (~100)
  // ═══════════════════════════════════════
  const commonActions: [string, string][] = [
    ["Wassertrinken", "Streamer muss ein Glas Wasser trinken"],
    ["Daumen hoch", "Streamer muss Daumen hoch in die Kamera zeigen"],
    ["Winken", "Streamer muss in die Kamera winken"],
    ["Lächeln", "Streamer muss 10 Sekunden breit grinsen"],
    ["Strecken", "Streamer muss sich einmal strecken"],
    ["High Five", "Streamer gibt der Kamera ein High Five"],
    ["Kaffee trinken", "Streamer nimmt einen Schluck Kaffee/Tee"],
    ["Snack essen", "Streamer muss einen Snack essen"],
    ["Musik wechseln", "Streamer muss den nächsten Song skippen"],
    ["Kopfstand", "Streamer muss so tun als würde er Kopfstand machen"],
    ["Beatbox", "Streamer muss 10 Sekunden beatboxen"],
    ["Tier-Geräusch", "Streamer muss ein Tier nachmachen"],
    ["Robot Dance", "Streamer muss 10 Sekunden Roboter tanzen"],
    ["Air Guitar", "Streamer muss Luftgitarre spielen"],
    ["Zungenbrecher", "Streamer muss einen Zungenbrecher sagen"],
    ["Rückwärts reden", "Streamer muss seinen Namen rückwärts sagen"],
    ["Akzent", "Streamer muss 1 Minute mit Akzent reden"],
    ["Flüstern", "Streamer muss 30 Sekunden flüstern"],
    ["Schreien", "Streamer muss einmal laut YEET rufen"],
    ["Kompliment", "Streamer muss dem Chat ein Kompliment machen"],
  ];
  for (const [name, desc] of commonActions) {
    items.push(action(name, desc, "common", 50));
  }

  const uncommonActions: [string, string][] = [
    ["10 Liegestütze", "Streamer muss 10 Liegestütze machen"],
    ["20 Kniebeugen", "Streamer muss 20 Kniebeugen machen"],
    ["Plank 30s", "Streamer muss 30 Sekunden Plank halten"],
    ["Freestyle Rap", "Streamer muss 30 Sekunden freestyle rappen"],
    ["Geschichte erzählen", "Streamer muss eine peinliche Geschichte erzählen"],
    ["Lied singen", "Streamer muss ein Lied singen (Chat wählt)"],
    ["Handstand", "Streamer versucht einen Handstand"],
    ["Moonwalk", "Streamer muss einen Moonwalk versuchen"],
    ["Zungenbrecher x3", "Streamer muss 3 Zungenbrecher hintereinander sagen"],
    ["Voice Impressions", "Streamer muss 3 Stimmen nachmachen"],
    ["Runde drehen", "Streamer muss sich 5x im Kreis drehen"],
    ["Invisible Box", "Streamer muss die Invisible Box Challenge machen"],
    ["Dab", "Streamer muss 5 verschiedene Dabs machen"],
    ["Yoga Pose", "Streamer muss eine Yoga-Pose 30 Sekunden halten"],
    ["Origami", "Streamer muss ein Papierflugzeug falten"],
    ["Speed Draw", "Streamer muss in 30 Sekunden etwas zeichnen"],
    ["Kompliment-Runde", "Streamer muss 5 Viewer individuell complimenten"],
    ["Story Time", "Streamer erzählt die lustigste Stream-Story"],
    ["Witz erzählen", "Streamer muss einen Witz erzählen"],
    ["Accent Challenge", "Streamer muss 2 Minuten mit Akzent streamen"],
    ["Tanzeinlage", "Streamer tanzt 15 Sekunden zu einem Chat-Song"],
    ["Spiegelbild", "Streamer macht alles 1 Min lang spiegelverkehrt"],
    ["Geräusche-Quiz", "Streamer muss 5 Geräusche nachmachen, Chat rät"],
    ["Pantomime", "Streamer spielt 3 Begriffe pantomimisch vor"],
    ["Emoji Challenge", "Streamer darf 2 Min nur mit Emojis kommunizieren"],
    ["Kompliment-Battle", "Streamer und Chat battlen sich in Komplimenten"],
    ["Tongue Twister EN", "Streamer sagt 3 englische Zungenbrecher"],
    ["Rückwärts essen", "Streamer isst einen Snack in komischer Reihenfolge"],
    ["Desktop Tour", "Streamer zeigt seinen Desktop (aufräumen nicht erlaubt!)"],
    ["Tierquiz", "Streamer muss 10 Tier-Geräusche erraten"],
    ["Blind Typing", "Streamer tippt eine Nachricht blind und sendet sie"],
    ["One-Hand Gaming", "Streamer spielt 5 Minuten mit nur einer Hand"],
    ["No Jumping", "Streamer darf 10 Minuten im Spiel nicht springen"],
    ["Whispering", "Streamer muss 5 Minuten nur flüstern"],
    ["Backwards Walking", "Streamer läuft im Spiel nur rückwärts (5 Min)"],
    ["No Kill Run", "Streamer darf 5 Minuten niemanden eliminieren"],
    ["Left Hand Only", "Streamer nutzt nur die linke Hand (Maus+Tastatur)"],
    ["Chat Decides", "Chat entscheidet 3 Minuten jede Entscheidung"],
    ["Speed Commentary", "Streamer kommentiert alles wie ein Sportreporter"],
  ];
  for (const [name, desc] of uncommonActions) {
    items.push(action(name, desc, "uncommon", 25));
  }

  const rareActions: [string, string][] = [
    ["50 Liegestütze", "Streamer muss 50 Liegestütze machen (mit Pausen)"],
    ["Ice Bucket Lite", "Streamer muss sich kaltes Wasser ins Gesicht spritzen"],
    ["Gesichtsmaske", "Streamer streamt 10 Minuten mit einer Maske"],
    ["Hut-Pflicht", "Streamer muss nächste 30 Min einen lustigen Hut tragen"],
    ["Name Change", "Viewer darf den nächsten Game-Charakter benennen"],
    ["Song Request VIP", "Viewer darf einen Song wünschen (kein Skip)"],
    ["Wallpaper Swap", "Streamer muss Desktop-Hintergrund für 1h ändern (Chat wählt)"],
    ["Speed Run", "Streamer muss den aktuellen Level auf Speed versuchen"],
    ["Blindfold Round", "Streamer spielt eine Runde mit verbundenen Augen"],
    ["Challenge accepted", "Chat darf eine In-Game-Challenge stellen"],
    ["Rückwärts spielen", "Streamer spielt 5 Min mit invertierter Steuerung"],
    ["Nur mit Pistole", "Streamer darf nur die schlechteste Waffe benutzen"],
    ["Pacifist Run", "Streamer darf 5 Minuten niemanden töten"],
    ["No HUD", "Streamer spielt 10 Minuten ohne HUD"],
    ["Handicap Match", "Streamer muss mit einer Hand spielen"],
  ];
  for (const [name, desc] of rareActions) {
    items.push(action(name, desc, "rare", 15));
  }

  const epicActions: [string, string][] = [
    ["100 Liegestütze", "Streamer muss 100 Liegestütze machen (über den Stream verteilt)"],
    ["Cosplay Lite", "Streamer muss ein improvisiertes Cosplay anziehen"],
    ["Karaoke Session", "Streamer singt 3 Songs die der Chat wählt"],
    ["Cooking Stream", "Streamer muss etwas kochen (Chat wählt Rezept)"],
    ["Spenden-Match", "Streamer verdoppelt die nächste Spende (symbolisch)"],
    ["Sub-only OFF", "Streamer schaltet Sub-only Mode für 1h aus"],
    ["Viewer Game", "Streamer spielt eine Runde mit einem Viewer"],
    ["Stream Verlängerung", "Stream wird um 30 Minuten verlängert"],
    ["Rage Quit Verbot", "Streamer darf 1 Stunde nicht rage quitten"],
    ["Nur Chat entscheidet", "Chat bestimmt 15 Min lang alle Game-Entscheidungen"],
  ];
  for (const [name, desc] of epicActions) {
    items.push(action(name, desc, "epic", 8));
  }

  const legendaryActions: [string, string][] = [
    ["24h Stream Token", "Streamer plant einen 24-Stunden-Stream"],
    ["Mod für einen Tag", "Viewer wird für 24h zum Moderator"],
    ["Custom Emote", "Streamer erstellt ein Custom Emote nach Viewer-Wunsch"],
    ["Duo Stream", "Streamer macht einen Duo-Stream mit dem Viewer"],
    ["Wunsch-Game", "Viewer wählt das nächste Spiel für den gesamten Stream"],
  ];
  for (const [name, desc] of legendaryActions) {
    items.push(action(name, desc, "legendary", 2));
  }

  // ═══════════════════════════════════════
  // POINT MULTIPLIERS (~30)
  // ═══════════════════════════════════════
  items.push(mult("Mini Boost", 1.5, 15, "common", 50));
  items.push(mult("Kleiner Boost", 1.5, 30, "common", 50));
  items.push(mult("Boost", 2, 15, "uncommon", 25));
  items.push(mult("Doppel-XP", 2, 30, "uncommon", 25));
  items.push(mult("Power Boost", 2, 60, "uncommon", 25));
  items.push(mult("Großer Boost", 2.5, 30, "rare", 15));
  items.push(mult("Super Boost", 3, 30, "rare", 15));
  items.push(mult("Mega Boost", 3, 60, "rare", 15));
  items.push(mult("Ultra Boost", 4, 30, "epic", 8));
  items.push(mult("Hyper Boost", 5, 30, "epic", 8));
  items.push(mult("Godmode XP", 5, 60, "epic", 8));
  items.push(mult("Infinity Boost", 10, 30, "legendary", 2));
  items.push(mult("Absoluter Wahnsinn", 10, 60, "legendary", 2));

  return items;
}
