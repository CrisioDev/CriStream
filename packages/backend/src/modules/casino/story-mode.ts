// Story Mode — "Die Legende des Goldenen Chips"
// Act 1: "Der Anfang" (Chapters 1-10)
// Act 2: "Die Verschwörung" (Chapters 11-20)
// Act 3: "Der Aufstieg" (Chapters 21-30)
// Act 4: "Das Finale" (Chapters 31-40)
import { redis } from "../../lib/redis.js";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export interface StoryScene {
  id: string;
  text: string;
  character?: string;
  game?: { type: string; description: string; mustWin?: boolean; reward?: number };
  choice?: { prompt: string; options: { id: string; text: string }[] };
  boss?: { name: string; emoji: string; game: string; reward: number; dialog: string };
  giveItem?: string;
  nextScene?: string;
}

export interface StoryChapter {
  number: number;
  title: string;
  scenes: StoryScene[];
}

export interface StoryState {
  chapter: number;
  scene: number;
  points: number;
  inventory: string[];
  choices: Record<string, string>;
  stats: { wins: number; losses: number; puzzlesSolved: number; bossesDefeated: number };
  attempts: number;
  startedAt: number;
  lastPlayed: number;
}

/* ──────────────────────────────────────────────
   Chapters
   ────────────────────────────────────────────── */

const chapters: StoryChapter[] = [
  // ═══════════════════════════════════════════
  // CHAPTER 1: Die letzte Münze
  // ═══════════════════════════════════════════
  {
    number: 1,
    title: "Die letzte Münze",
    scenes: [
      {
        id: "c1s1",
        text: `Die Neonlichter des CRISINO durchbrechen die Dunkelheit wie ein Leuchtturm für Verzweifelte. Über dem Eingang flackert ein gigantisches Schild — halb Hollywood, halb Kirmes — und die Buchstaben wechseln alle paar Sekunden die Farbe. Irgendwo drinnen spielt ein Saxophon eine Melodie, die klingt wie ein Lottogewinn, der sich in eine Steuererklärung verwandelt.

Du stehst davor. Pleite. Absolut, komplett, mathematisch gesehen bei exakt Null. In deiner rechten Hosentasche klimpern die letzten drei Cent, die nicht mal für einen Kaugummi reichen würden. In deiner linken Hosentasche ist ein Loch. Poetisch, irgendwie.

Aber heute Nacht wird alles anders. Das spürst du. Oder das ist der Hunger. Schwer zu unterscheiden.`,
      },
      {
        id: "c1s2",
        text: `Die Bar ist das Erste, was du siehst — ein Tresen aus poliertem Mahagoni, der länger ist als deine letzte Beziehung. Dahinter steht ein Fuchs. Ja, ein echter Fuchs. Naja, ein Typ im Fuchskostüm. Oder ein Fuchs, der gelernt hat Cocktails zu mixen. In diesem Casino fragst du besser nicht nach.

Er poliert ein Glas mit der Gelassenheit eines buddhistischen Mönchs und mustert dich von oben bis unten. Sein Blick sagt: "Ich habe schon tausend wie dich gesehen." Sein Mund sagt etwas anderes.

"Na, wieder einer der denkt er schlägt das Haus? Hier, nimm einen Drink aufs Haus. Du siehst aus als hättest du den nötiger als ich meine Trinkgeldkasse." Er schiebt dir ein schimmerndes Getränk rüber, das in mindestens drei Farben leuchtet, die es eigentlich nicht geben sollte.`,
        character: "🦊 Crisio",
      },
      {
        id: "c1s3",
        text: `Crisio lehnt sich über den Tresen und dreht eine einzelne, goldene Münze zwischen seinen Fingern. Sie glitzert im Neonlicht wie ein kleines, rundes Versprechen. Oder eine kleine, runde Falle — je nach Perspektive.

"Weißt du was? Ich mag dein Gesicht. Es hat was... Verzweifeltes. Das ist gut hier. Verzweiflung ist die Mutter der Gewinne." Er grinst und wirft dir die Münze zu. "Fangen wir einfach an. Ein Münzwurf. Kopf oder Zahl. Wenn du nicht mal DAS gewinnst, geh lieber wieder nach Hause und überdenke deine Lebensentscheidungen."

Die Münze landet in deiner Hand. Sie ist schwerer als erwartet. Und wärmer. Fast als hätte sie auf dich gewartet.`,
        character: "🦊 Crisio",
        game: { type: "flip", description: "Crisios Münzwurf — dein allererster Test im CRISINO!", mustWin: true, reward: 50 },
      },
      {
        id: "c1s4",
        text: `Die Münze landet. Du gewinnst. Crisio hebt eine Augenbraue — und für einen Moment, nur einen kurzen Moment, sieht er fast... beeindruckt aus. Fast.

"Huh. Nicht schlecht für jemanden, der aussieht als hätte er seine letzten Chips im Automaten am Bahnhof verloren." Er greift unter den Tresen und zieht einen zerknitterten Umschlag hervor. Er ist alt, das Papier vergilbt, und darauf steht in goldener Tinte nur ein einziges Wort: DEIN NAME. Okay, nicht dein echter Name, aber du verstehst was gemeint ist.

"Jemand hat das hier vor drei Tagen abgegeben. Hat gesagt, du würdest kommen. Ich hab gelacht. Und jetzt..." Er schiebt dir den Umschlag rüber und wendet sich ab. "Jetzt lache ich nicht mehr."`,
        character: "🦊 Crisio",
        giveItem: "Mysteriöser Umschlag",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 2: Der mysteriöse Brief
  // ═══════════════════════════════════════════
  {
    number: 2,
    title: "Der mysteriöse Brief",
    scenes: [
      {
        id: "c2s1",
        text: `Du öffnest den Umschlag mit zitternden Fingern. Drin liegt eine Karte — und was für eine! Gold, schwer, graviert mit Ornamenten, die aussehen wie eine Mischung aus Versailles und einem sehr teuren Tattoo-Studio. In der Mitte, eingestanzt in das Metall (ja, die Karte ist aus METALL), stehen die Worte:

"DER GOLDENE CHIP WARTET. BEWEISE DICH."

Darunter, in kleinerer Schrift: "Keine Rückerstattung. Keine Umtauschgarantie. Keine Haftung für verlorene Seelen, gebrochene Herzen oder leere Konten." Das klingt wie die AGB einer sehr fragwürdigen Dating-App, aber mit mehr... Schicksal.

Die Karte schimmert in deiner Hand. Sie fühlt sich an wie ein Versprechen. Oder wie eine Drohung. Im CRISINO ist das oft dasselbe.`,
      },
      {
        id: "c2s2",
        text: `Crisio spuckt fast seinen eigenen Cocktail aus — und der Mann trinkt normalerweise Sachen, die Lack von Autos entfernen könnten. Seine Augen werden groß wie Roulette-Räder.

"Der Goldene Chip?! Das ist nur eine Legende... oder?" Er senkt die Stimme. Der Typ am Ende der Bar dreht sich um. Crisio winkt ab. "Nein, NICHT für dich, Gerald." Gerald dreht sich beleidigt wieder weg.

"Hör zu," flüstert Crisio, "sie sagen, der Goldene Chip macht seinen Besitzer unbesiegbar. Jedes Spiel. Jeder Einsatz. Immer gewinnen. Aber der Preis..." Er schluckt. "Keiner der danach gesucht hat, ist je wiedergekommen. Also entweder haben sie ihn gefunden und sich eine Villa auf den Bahamas gekauft, oder..." Er macht eine Geste, die nichts Gutes bedeutet. "Aber hey, du hast einen Münzwurf gewonnen! Das qualifiziert dich bestimmt."`,
        character: "🦊 Crisio",
      },
      {
        id: "c2s3",
        text: `Crisio schnappt sich ein Handtuch und wischt den Tresen mit mehr Energie als nötig. Das macht er wenn er nervös ist — du kennst ihn seit zehn Minuten und weißt das schon. Sagt viel über Crisio aus.

"Okay, hör zu Held. Bevor du den Chip suchst, brauchst du eins: Geld. Chips. Startkapital. Wie auch immer du es nennen willst." Er zeigt auf die Slot-Automaten an der Wand. Sie blinken und piepsen einladend, wie eine Angler-Falle für Erwachsene. "Ab an die Automaten! Drei Runden, mindestens einmal gewinnen. Das ist dein Training. Dein Aufwärmspiel. Dein Tutorial-Level, wenn du so willst."

Er lehnt sich zurück. "Und wenn du dreimal verlierst? Naja... dann war die Geschichte hier leider sehr kurz. Quasi ein Kurzfilm statt einem Epos."`,
        character: "🦊 Crisio",
        game: { type: "slots", description: "Crisios Slot-Training — gewinne mindestens einmal in 3 Versuchen!", reward: 100 },
      },
      {
        id: "c2s4",
        text: `Die Walzen drehen sich, die Lichter blinken, und — DING DING DING — der Automat spuckt Chips aus wie ein Goldfisch sein Futter. Na gut, es ist kein Jackpot, aber es ist ETWAS. Und "etwas" ist unendlich mehr als "nichts", das sagt dir jeder Mathematiker.

Crisio nickt anerkennend und zieht etwas unter dem Tresen hervor. Eine weitere Karte, diesmal golden schimmernd wie die erste, aber mit einem zusätzlichen Siegel. "Deine Goldene Einladung. Damit kommst du in den Keller. Ja, der Keller. Ich weiß, klingt wie der Anfang eines Horrorfilms, und ehrlich gesagt... bin ich mir nicht sicher ob es keiner ist."

Er klopft dir auf die Schulter. "Aber sei vorsichtig da unten. Die Leute im Keller spielen nicht zum Spaß. Die spielen um..." Er überlegt. "Naja, auch zum Spaß. Aber um GEFÄHRLICHEN Spaß."`,
        character: "🦊 Crisio",
        giveItem: "Goldene Einladung",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 3: Kellertreffen
  // ═══════════════════════════════════════════
  {
    number: 3,
    title: "Kellertreffen",
    scenes: [
      {
        id: "c3s1",
        text: `Die Treppe nach unten ist steil, dunkel und riecht nach einer Mischung aus Räucherstäbchen, altem Geld und dem Hauch von Schicksal. Oder Schimmel. Einer von beiden. Die Stufen knarren unter deinen Füßen, als wollten sie die ganze Unterwelt warnen: "ACHTUNG! ANFÄNGER IM ANMARSCH!"

Unten angekommen öffnet sich ein Raum, der aussieht wie das Wohnzimmer eines exzentrischen Millionärs, der zu viele Filme über das viktorianische England gesehen hat. Kerzen überall — nicht die romantischen IKEA-Kerzen, sondern die Art von Kerzen, bei denen man fragt ob hier gleich ein Ritual stattfindet. Schwerer Samtvorhang. Kristallkugeln. Ein Totenschädel auf dem Kaminsims, der verdächtig echt aussieht.

Die Luft ist dick vor Rauch. Es riecht nach altem Geld und schlechten Entscheidungen — der offizielle Duft des CRISINO, wie du langsam feststellst.`,
      },
      {
        id: "c3s2",
        text: `Aus dem Rauch materialisiert sich eine Gestalt. Nein, wirklich — sie MATERIALISIERT sich. Der eine Moment: Rauch. Der nächste Moment: eine Frau in einem Kleid, das mehr Sterne hat als das Planetarium. Auf ihrem Kopf thront ein Turban, der sein eigenes Gravitationsfeld zu haben scheint. Ihre Augen glühen... okay, das sind wahrscheinlich Kontaktlinsen, aber der Effekt ist trotzdem beeindruckend.

"Ich habe dich erwartet..." sagt sie mit einer Stimme, die klingt wie Samt über Donner. "Die Karten haben mir dein Gesicht gezeigt. Oder war das jemand anders? Egal! Die Karten zeigen viele Gesichter. Die meisten davon schulden mir noch Geld."

Sie breitet ihre Karten auf dem Tisch aus. Jede einzelne leuchtet schwach. "Ich bin Cheshire Kimchi. Seherin. Wahrsagerin. Inhaberin einer gültigen Gewerbeanmeldung. Und DU... du bist entweder der Auserwählte oder der größte Trottel den ich je gesehen habe. Die Statistik spricht für Letzteres, aber hey — Statistik hat auch gesagt die Titanic sei unsinkbar."`,
        character: "🔮 Cheshire Kimchi",
      },
      {
        id: "c3s3",
        text: `Cheshire Kimchi schiebt die Kristallkugel beiseite (sie war sowieso nur Deko, flüstert sie dir zu — die echte Magie steckt in den Karten) und breitet ein frisches Deck auf dem Samt aus. Die Karten sind alt, die Ränder abgegriffen von tausend Spielen und tausend Schicksalen.

"Zeig mir dass du würdig bist! Die Karten lügen nie... meistens. Okay, manchmal lügen sie. Die Kreuz-Dame ist eine notorische Lügnerin. Aber im Großen und Ganzen kann man sich auf sie verlassen." Sie fixiert dich mit einem Blick, der durch deine Seele schneidet wie ein Laser durch Butter.

"Poker. Du. Ich. Jetzt. Und wenn du verlierst, musst du meine Kristallkugel-Sammlung abstauben. Alle 47 Stück. Mit einem Wattestäbchen."`,
        character: "🔮 Cheshire Kimchi",
        game: { type: "poker", description: "Poker gegen Cheshire Kimchi — beweise deine Würdigkeit!", reward: 150 },
      },
      {
        id: "c3s4",
        text: `Cheshire Kimchi starrt auf die Karten. Dann auf dich. Dann wieder auf die Karten. Ihr linkes Auge zuckt. Das passiert nur bei wichtigen Prophezeiungen, oder wenn sie zu viel Kaffee getrunken hat.

"Interessant. SEHR interessant." Sie steht auf und ihr Kleid wirbelt dramatisch — auch wenn kein Wind weht. Professionelle Dramaqueen. "Der Goldene Chip ist real. Oh ja. Realer als die Miete und genau so schmerzhaft wenn man ihn nicht hat. ABER—" Sie hebt einen Finger, der mit mindestens fünf Ringen bestückt ist. "Kurainu der Schatten wird ihn nicht freiwillig hergeben."

Sie beugt sich vor. "Er war einmal wie du. Ein Niemand mit einem Traum. Dann hat er den Chip gefunden und der Chip hat IHN gefunden und jetzt... jetzt ist er der Schatten selbst." Sie pustet eine Kerze aus, für den dramatischen Effekt. "Geh. Steig auf. Aber vergiss nicht: Im CRISINO ist nichts umsonst. Nicht mal der Aufzug. Vor allem nicht der Aufzug."`,
        character: "🔮 Cheshire Kimchi",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 4: Die erste Prüfung
  // ═══════════════════════════════════════════
  {
    number: 4,
    title: "Die erste Prüfung",
    scenes: [
      {
        id: "c4s1",
        text: `Am Ende des Kellergangs steht eine Tür. Aber nicht irgendeine Tür — diese Tür sieht aus, als hätte ein Tresor ein Kind mit einem Escape Room bekommen. Stahl, Kupfer, und in der Mitte ein Zahlenfeld, das leuchtet wie die Anzeige eines Raumschiffs. Davor steht ein Wächter. Klein, Brille, Strickpullover. Er sieht aus wie ein Mathelehrer auf einem Schulausflug.

"Halt," sagt er, und seine Stimme ist überraschend tief für jemanden, der aussieht als würde er Sudoku zum Frühstück lösen. Was er wahrscheinlich tut. "Nur wer denken kann, darf eintreten. Muskeln beeindrucken mich nicht. Geld beeindruckt mich nicht. LOGIK beeindruckt mich."

Er tippt auf das Zahlenfeld und ein Rätsel erscheint. "Löse das. Keine Zeitbegrenzung. Aber je länger du brauchst, desto mehr verliere ich den Respekt vor dir. Und mein Respekt ist alles, was zwischen dir und dieser verschlossenen Tür steht."`,
      },
      {
        id: "c4s2",
        text: `Das Zahlenfeld leuchtet auf. Ein 4x4 Gitter. Zahlen fehlen. Der Wächter putzt seine Brille und beobachtet dich mit der stillen Intensität eines Katers, der eine Maus beobachtet — wenn der Kater einen Doktortitel in Mathematik hätte.

"Sudoku. Die reinste Form der Logik. Keine Tricks, kein Glück, nur dein Verstand gegen die Zahlen." Er seufzt nostalgisch. "Weißt du, als ich jung war, habe ich davon geträumt, Astronaut zu werden. Stattdessen bewache ich eine Tür in einem Kellercasino und stelle Leuten Rätsel. Aber hey — die Work-Life-Balance ist fantastisch."

Die Zahlen warten. Die Tür wartet. Der Wächter wartet. Alles wartet. Kein Druck.`,
        game: { type: "sudoku4", description: "Löse das Sudoku um die Tür zum VIP-Bereich zu öffnen!", reward: 200 },
      },
      {
        id: "c4s3",
        text: `KLICK. KLACK. WHOOOOSH. Die Tür öffnet sich mit dem Geräusch von tausend Schlössern, die gleichzeitig aufspringen, und dem dramatischen Zischen von Hydraulik. Der Wächter klatscht leise — drei mal, sehr präzise, als hätte er auch das Klatschen mathematisch optimiert.

Und dann siehst du es. Den VIP-Bereich. Kristallleuchter, die so groß sind wie Kleinwagen. Tische aus Gold — oder zumindest goldfarbenem... nein, das ist echtes Gold. Der Boden ist Marmor, so poliert dass du dein Spiegelbild siehst, und dein Spiegelbild sieht genauso überfordert aus wie du.

Menschen in Smokings und Abendkleidern gleiten durch den Raum wie Haie durch einen sehr eleganten Ozean. Jemand lacht. Es klingt wie Champagner, der in ein Kristallglas gegossen wird. Die Luft riecht nach Erfolg und Arroganz — die sind hier anscheinend im Duftspender.`,
      },
      {
        id: "c4s4",
        text: `Der Wächter tritt neben dich und drückt dir etwas in die Hand. Ein Ausweis. Ein VIP-Ausweis. Holographisch, mit deinem Foto drauf — wann haben die das gemacht?! — und dem goldenen CRISINO-Logo.

"Willkommen in der oberen Gesellschaft," sagt er, und zum ersten Mal lächelt er. Es ist ein schiefes, kleines Lächeln, als hätte er es nicht oft geübt. "Benimm dich. Oder auch nicht. Ehrlich gesagt ist es hier oben unterhaltsamer wenn sich jemand NICHT benimmt."

Er deutet auf eine Bar in der Ecke, eine Pokerecke und — weit hinten — einen Tisch, der größer ist als alle anderen. Dort sitzt jemand. Jemand GROSSES. Nicht im Sinne von wichtig (obwohl auch das), sondern im Sinne von: dieser Mensch hat seinen eigenen Gravitationsbereich. "Da drüben sitzt der Whale. Mein Tipp: Nicht anstarren. Er hasst das. Und er mag dich sowieso nicht. Er mag niemanden. Außer sich selbst."`,
        giveItem: "VIP-Ausweis",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 5: VIP Lounge
  // ═══════════════════════════════════════════
  {
    number: 5,
    title: "VIP Lounge",
    scenes: [
      {
        id: "c5s1",
        text: `Der Whale sitzt am größten Tisch im Raum — natürlich tut er das — umgeben von einem Hof aus Bewunderern, Schmeichlern und mindestens drei Leuten, deren einziger Job es zu sein scheint, ihm Feuer für seine Zigarre zu geben. Er trägt einen Anzug, der mehr kostet als eine Eigentumswohnung, ein Monokel (unironisch), und einen Ausdruck permanenter Langeweile auf dem Gesicht.

Vor ihm türmen sich Chips. Nicht ein paar Chips. BERGE von Chips. Everest-Dimensionen. Wenn Chips eine Nationalität hätten, wäre dies ihr Heimatland. Er benutzt einen Stapel 1000er-Chips als Untersetzer für sein Champagnerglas. Das ist entweder Dekadenz oder Wahnsinn. Wahrscheinlich beides.

Champagnerfontänen — ja, FONTÄNEN, Plural — umrahmen seinen Platz. Eine davon sprudelt Rosé. Die andere anscheinend flüssiges Gold. Oder Apfelschorle. Man weiß es nicht genau.`,
      },
      {
        id: "c5s2",
        text: `Sein Monokel blitzt auf als er dich bemerkt. Es ist, als würde ein Teleskop eine besonders kleine, uninteressante Ameise fokussieren. Er wedelt mit der Zigarre in deine Richtung und Asche regnet auf den Marmorboden. Jemand eilt herbei um sie aufzusammeln.

"Oh! Frisches Fleisch!" Seine Stimme ist so tief und laut wie der Bass in einem Techno-Club. "Sag mal Kleiner, wie viel hast du?" Er mustert dich von oben bis unten. Pause. Dann ein Lachen, das den Kronleuchter zum Klirren bringt. "EGAL! Es ist bestimmt weniger als mein Trinkgeld. Mein STÜNDLICHES Trinkgeld. An einem DIENSTAG."

Er nimmt einen Schluck Champagner, der wahrscheinlich älter ist als deine Großmutter. "Aber weißt du was? Ich langweile mich. Und gelangweilte reiche Leute sind GEFÄHRLICHE reiche Leute. Also... unterhalt mich."`,
        character: "🐋 Topstar",
      },
      {
        id: "c5s3",
        text: `Der Whale schnappt sich die Würfel vom Tisch. Sie sind — natürlich — aus Elfenbein. Oder Diamant. Oder einem Material, das noch teurer ist als beides. Er rollt sie zwischen seinen Wurstfingern und grinst wie ein Hai, der gerade eine Robbe entdeckt hat.

"Lass uns würfeln, Kleiner! Dice 21 — mein Lieblingsspiel. Weil ich IMMER gewinne." Er beugt sich vor und sein Monokel fällt fast herunter. "Wenn DU gewinnst — und das wäre wirklich, WIRKLICH überraschend — erzähl ich dir alles über diesen mysteriösen Goldenen Chip. Ich weiß Dinge. Ich weiß ALLE Dinge. Dafür bezahle ich Leute."

Er lehnt sich zurück. "Und wenn du VERLIERST..." Ein diabolisches Grinsen. "...putzt du meine Schuhe. Alle 347 Paar. Mit einer Zahnbürste. Einer GEBRAUCHTEN Zahnbürste."`,
        character: "🐋 Topstar",
        game: { type: "dice21", description: "Dice 21 gegen den Whale — gewinne um Infos über den Chip zu erhalten!", reward: 300 },
      },
      {
        id: "c5s4",
        text: `Die Würfel fallen. Die Menge hält den Atem an. Der Whale... der Whale verliert die Farbe im Gesicht. Sein Monokel fällt diesmal WIRKLICH herunter und landet in seinem Champagnerglas. PLOP. Stille. Absolute, ohrenbetäubende Stille.

"Das... das ist..." Er ringt nach Worten. Das passiert ihm vermutlich nie. "NA GUT." Er steht auf. Der Tisch wackelt. Drei Schmeichler fallen um. "Der Goldene Chip. Er ist im Penthouse. Ganz oben. Floor 10. Der letzte Stock. Die Spitze des CRISINO."

Er fischt sein Monokel aus dem Champagner und setzt es tropfend wieder auf. "ABER — und das ist ein großes Aber, fast so groß wie mein Kontostand — du brauchst den Fahrstuhlcode. Und den hat nur EINER: Kurainu der Schatten. Niemand kennt seinen echten Namen. Niemand hat sein Gesicht gesehen. Und niemand — NIEMAND — hat ihn je im Poker geschlagen." Er schüttelt den Kopf. "Viel Glück, Kleiner. Du wirst es brauchen."`,
        character: "🐋 Topstar",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 6: Gerüchte im Rauch
  // ═══════════════════════════════════════════
  {
    number: 6,
    title: "Gerüchte im Rauch",
    scenes: [
      {
        id: "c6s1",
        text: `Zurück an Crisios Bar. Der VIP-Bereich war aufregend, aber manchmal braucht man einfach einen Ort, an dem die Champagnerfontänen NICHT aus flüssigem Gold bestehen und der Barkeeper ein Fuchs ist, der dich nicht verurteilt. Naja, der dich WENIGER verurteilt.

Crisio steht hinter dem Tresen und poliert Gläser. Er poliert IMMER Gläser. Du bist dir nicht sicher ob er sie tatsächlich sauber macht oder ob es eine Art Meditation ist. Vielleicht beides. Das Glas in seiner Hand quietscht vor Sauberkeit. Oder vor Angst.

Die Bar ist ruhiger jetzt. Spät in der Nacht, oder früh am Morgen — im CRISINO gibt es keine Uhren, das wäre schlecht fürs Geschäft. Ein paar einsame Gestalten hängen über ihren Drinks wie Fragezeichen über ungelösten Rätseln.`,
      },
      {
        id: "c6s2",
        text: `"Kurainu der Schatten..." Crisio spricht den Namen aus wie andere Leute "Finanzamt" sagen — mit einer Mischung aus Furcht und tiefem, persönlichem Groll. Er stellt das Glas ab und lehnt sich vor. Seine Augen huschen durch den Raum, als könnte Kurainu überall lauern. Was, fair enough, vermutlich stimmt.

"Sie sagen, er war mal ein normaler Spieler. Wie du. Wie ich. Okay, nicht wie ich, ich bin ein Fuchs hinter einer Bar, aber du weißt was ich meine." Er senkt die Stimme noch weiter. "Er hat den Goldenen Chip gefunden, vor Jahren. Und der Chip hat IHN verändert. Er ist... anders geworden. Kälter. Berechnender. Er sieht durch Karten hindurch, sagen sie. Buchstäblich. Wie Röntgenblick, nur für Poker."

Er seufzt. "Um ihn zu finden, musst du tiefer graben. Und im CRISINO bedeutet 'tiefer graben' normalerweise: in Orte gehen, wo vernünftige Menschen NICHT hingehen."`,
        character: "🦊 Crisio",
      },
      {
        id: "c6s3",
        text: `Crisio kramt eine zerknitterte Karte des CRISINO hervor und breitet sie auf dem Tresen aus. Sie sieht aus wie die Schatzkarte eines Piraten, nur mit mehr Kaffeflecken. Zwei Orte sind rot eingekreist.

"Also, ich hab nachgedacht — und ja, das passiert öfter als du denkst." Er tippt auf die Karte. "Es gibt zwei Orte, wo wir Hinweise auf Kurainu finden könnten. Erstens: die Küche. Klingt langweilig, ist es auch, ABER der Küchenchef ist ein ehemaliger Spion und weiß ALLES was hier passiert. Zweitens: das Büro des Casino-Managers. Da liegen die wirklichen Geheimnisse. Aber es ist... naja, es ist das Büro des MANAGERS. Der Typ, der diesen ganzen Laden besitzt."

Er verschränkt die Arme. "Deine Wahl, Held. Praktisch oder riskant?"`,
        character: "🦊 Crisio",
        choice: {
          prompt: "Wo sollen wir nach Hinweisen suchen?",
          options: [
            { id: "kitchen", text: "🍳 Die Küche — der Küchenchef weiß alles" },
            { id: "office", text: "🏢 Das Büro des Managers — die wahren Geheimnisse" },
          ],
        },
      },
      {
        id: "c6s4_kitchen",
        text: `Du entscheidest dich für die Küche. Crisio nickt anerkennend. "Kluge Wahl. Langweilig, aber klug. So überleben die meisten Leute." Er gibt dir eine Schürze. "Hier, setz die auf. Dann fällst du weniger auf. Oder mehr auf, weil du definitiv nicht wie ein Koch aussiehst. Aber Zuversicht!"

Die Küche des CRISINO ist ein Chaos aus Dampf, Geschrei und fliegenden Pfannen. Der Küchenchef — ein Mann, der aussieht wie eine Mischung aus Gordon Ramsay und einem pensionierten KGB-Agenten — bemerkt dich sofort. "DU! Ja, DU! Du bist kein Koch! Deine Hände sehen aus als hättest du noch nie eine Kartoffel geschält!" Aber dann senkt er die Stimme: "Aber du suchst Kurainu, oder? Ich seh das an deinen Augen. Komm, ich zeige dir etwas..."

Er führt dich an den Regalen vorbei, hinter die Gewürze, hinter die Konserven, und schiebt ein Regal beiseite. Dahinter: eine Falltür. "KEINEM ein Wort," zischt er. "Oder ich koche dich. Das ist kein Scherz. Ich habe Rezepte."`,
        character: "🦊 Crisio",
      },
      {
        id: "c6s4_office",
        text: `Du entscheidest dich für das Büro. Crisio reißt die Augen auf. "Ernst jetzt? Das Büro? Der Typ hat Kameras, Laser, und — Gerüchten zufolge — einen zahmen Alligator." Er schüttelt den Kopf, aber er grinst dabei. "Okay. Riskant. Ich mag riskant. Nein, eigentlich hasse ich riskant, aber bei DIR ist es irgendwie unterhaltsam."

Ihr schleicht durch die Gänge des CRISINO. Zweiter Stock, linker Flügel, dritte Tür rechts. Crisio hält Wache während du dich reinschleichst. Das Büro ist... überraschend normal. Ein Schreibtisch, Akten, eine Pflanze (künstlich). Aber hinter dem Bücherregal — klassisch, oder? — entdeckst du eine zweite Wand. Und in der zweiten Wand: eine Tür. Und hinter der Tür: eine Treppe, die NACH UNTEN führt.

"Na super," flüstert Crisio durchs Walkie-Talkie (woher hat er ein Walkie-Talkie?!). "Noch ein geheimer Keller. Dieses Casino hat mehr geheime Keller als reguläre Stockwerke."`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 7: Die Falltür
  // ═══════════════════════════════════════════
  {
    number: 7,
    title: "Die Falltür",
    scenes: [
      {
        id: "c7s1",
        text: `Der geheime Gang öffnet sich vor dir wie der Rachen eines sehr architektonisch ambitionierten Wurms. Die Wände sind feucht, die Decke niedrig, und irgendwo tropft Wasser mit der Regelmäßigkeit einer Uhr, die du nie bestellt hast. Es ist die Art von Ort, über den deine Mutter sagen würde: "Und GENAU deshalb hättest du Zahnarzt werden sollen."

Die Dunkelheit ist nicht einfach dunkel — sie ist AGGRESSIV dunkel. Die Art von Dunkelheit, die dir ins Gesicht schlägt und sagt: "Geh zurück." Dein Handy-Licht beleuchtet vielleicht drei Meter. Danach: Nichts. Das Nichts guckt zurück. Es sieht unbeeindruckt aus.

Aber du bist nicht umsonst bis hierher gekommen. Du hast einen Münzwurf gewonnen, Slots gespielt, eine Wahrsagerin beeindruckt und einen Millionär beschämt. Ein dunkler Tunnel ist da fast schon... gemütlich? Nein. Nein, ist er nicht.`,
      },
      {
        id: "c7s2",
        text: `Je tiefer du gehst, desto seltsamer wird es. Die feuchten Wände weichen langsam Neonröhren — erst einzelne, dann immer mehr, bis der ganze Gang in pulsierendem, bläulichem Licht erstrahlt. Und dann hörst du es: Das unverwechselbare BING-BING-BING von Spielautomaten. Unter der Erde. WEIT unter der Erde.

"Moment," sagst du zu dir selbst (du redest mittlerweile mit dir selbst, das ist normal im CRISINO), "sind das... Slots? Hier unten?!" Das Geräusch wird lauter. Dazu kommt das Klappern von Chips, das Murmeln von Stimmen, und... ist das Jazz? Underground-Jazz im wahrsten Sinne des Wortes.

Der Gang macht eine letzte Biegung und vor dir öffnet sich etwas, das kein Recht hat zu existieren. Und doch existiert es. Dein Mund steht offen. Das ist okay. Jeder Mund würde hier offen stehen.`,
      },
      {
        id: "c7s3",
        text: `Aber zuerst musst du DORTHIN kommen. Denn zwischen dir und dem unterirdischen Wunderland liegt ein Tunnelsystem, das aussieht als hätte jemand ein Labyrinth mit einem Ventilationsschacht gekreuzt und das Ergebnis mit Fallen bestückt. Okay, nicht echte Fallen — aber engere Gänge, falsche Abzweigungen, und an einer Stelle definitiv ein Loch im Boden, das zum Müllschlucker führt. Du kannst den Gestank von hier riechen.

"Navigiere durch den Tunnel," sagt eine Stimme aus einem Lautsprecher, den du nicht siehst. "Eine falsche Bewegung und du landest im Müllschlucker. Das klingt metaphorisch, ist aber leider SEHR wörtlich gemeint. Letzte Woche hat es Gerald erwischt. Er riecht immer noch nach Dienstags-Lasagne."

Gerald. Schon wieder Gerald. Dieser arme Kerl.`,
        game: { type: "snake", description: "Navigiere durch den unterirdischen Tunnel — weiche den Hindernissen aus!", reward: 200 },
      },
      {
        id: "c7s4",
        text: `Du schaffst es. Natürlich schaffst du es — du bist schließlich der Protagonist dieser Geschichte, und die Story wäre ziemlich kurz wenn du im Müllschlucker landen würdest. (Obwohl das ein sehr innovatives Ende wäre. "Die Legende des Goldenen Chips: Eine Geschichte über Müll." Bestseller-Material.)

Und dann stehst du da. Vor dir erstreckt sich eine unterirdische Halle, so groß wie ein Fußballfeld, vielleicht größer. Neonlichter in allen Farben des Regenbogens — und ein paar Farben, die der Regenbogen absichtlich weggelassen hat — beleuchten Stände, Tische, Automaten und Geschäfte. Ein riesiges Schild hängt von der Decke, zusammengebaut aus tausend kleinen Glühbirnen:

"WILLKOMMEN IM SCHATTENMARKT"

Die Buchstaben flackern. Das W fällt kurz aus. Für einen Moment steht da "ILLKOMMEN IM SCHATTENMARKT", was ehrlich gesagt auch passend wäre.`,
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 8: Der unterirdische Markt
  // ═══════════════════════════════════════════
  {
    number: 8,
    title: "Der unterirdische Markt",
    scenes: [
      {
        id: "c8s1",
        text: `Der Schattenmarkt ist das bizarrste Casino-im-Casino, das du je gesehen hast. Und du hast in den letzten Stunden einiges an bizarren Casinos gesehen. Hier ist alles leicht... FALSCH. Die Roulette-Räder drehen sich rückwärts. Die Kartenstapel haben fünf Farben statt vier (die fünfte ist "Glitzer"). Die Würfel haben sieben Seiten und niemand scheint das seltsam zu finden.

An einem Tisch spielt jemand Poker mit Tarotkarten. An einem anderen wettet eine Gruppe auf das Ergebnis einer Schneckenrennen-Simulation. Ein Automat in der Ecke akzeptiert keine Münzen sondern Geheimnisse — du flüsterst rein, und er spuckt Chips aus. Je saftiger das Geheimnis, desto mehr Chips. Jemand flüstert gerade: "Ich schaue heimlich Reality-TV" und bekommt genau EINEN Chip.

Die Luft riecht nach Popcorn, Aufregung und leichtem Wahnsinn. Der perfekte Cocktail.`,
      },
      {
        id: "c8s2",
        text: `"Psst!" Ein Zischen aus einer dunklen Ecke. Weil natürlich — in einem unterirdischen Schattenmarkt MÜSSEN die Informanten aus dunklen Ecken zischen. Das steht im Handbuch. "Psst! Hey du! Ja, DU mit dem Gesicht! Komm mal her!"

Du drehst dich um. Dort, zwischen einem Stand für "leicht gebrauchte Glücksbringer" und einem Schild, das "Schicksale getauscht — faire Preise" verspricht, lehnt ein Typ an der Wand. Sonnenbrille (unterirdisch, wohlgemerkt), hochgeschlagener Kragen, und er spricht aus dem rechten Mundwinkel. Der linke Mundwinkel macht gerade Pause.

"Ich bin Sam. Jumangy. Ja, DAS ist mein echter Name, meine Eltern waren... vorausschauend." Er grinst schief. "Ich hab Infos. Gute Infos. Die BESTEN Infos. Über den Chip, Kurainu, den Code — alles. Und ich verkaufe sie billig. Also, relativ billig. Also, nicht BILLIG billig, aber..."`,
        character: "🕶️ Jumangy",
      },
      {
        id: "c8s3",
        text: `Sam schiebt dir ein zerknittertes Foto rüber. Darauf: sechs Gesichter. Dealer. Alle maskiert, alle mysteriös, alle mit dem gleichen kalten Blick. "Das sind die sechs Dealer des Schattenmarkts. Einer von ihnen weiß den Code zum Fahrstuhl. Aber WELCHER?" Er tippt sich an die Sonnenbrille.

"Merk dir ihre Gesichter. Ihre Masken. Jedes Detail. Du wirst sie wiedererkennen müssen wenn es soweit ist. Und glaub mir — wenn du den Falschen fragst, wird es... unangenehm." Er macht eine dramatische Pause. "Nicht GEFÄHRLICH unangenehm. Eher 'du-musst-den-ganzen-Abend-seine-Lebensgeschichte-anhören' unangenehm. Und Dealer Nummer 4 hat eine SEHR lange Lebensgeschichte."

Er breitet die Fotos auf dem Tisch aus. "Bereit? Einmal anschauen, dann drehe ich sie um. Dein Gedächtnis gegen den Schattenmarkt."`,
        character: "🕶️ Jumangy",
        game: { type: "memory", description: "Merke dir die Dealer-Gesichter — Jumangys Gedächtnistest!", reward: 250 },
      },
      {
        id: "c8s4",
        text: `Sam pfeift durch die Zähne — was bei jemandem, der nur aus einem Mundwinkel spricht, beeindruckend ist. "Nicht schlecht, nicht schlecht! Du hast ein gutes Gedächtnis. Oder ein fotografisches. Oder du hast geschummelt. Egal, Respekt."

Er lehnt sich vor und senkt die Stimme auf ein Level, das selbst Fledermäuse Mühe hätten zu hören. "Der Fahrstuhlcode ändert sich jede Nacht. Jeden. Verdammten. Abend. Kurainu der Schatten ist paranoid — berechtigterweise, wenn man einen Chip besitzt der einen unbesiegbar macht."

Sam steht auf und klopft sich den Staub von der Jacke. "ABER ich kenne jemanden, der jemanden kennt, der jemanden kennt, der VIELLEICHT den Code für heute Nacht hat. Komm mit. Und bevor du fragst: Ja, das ist eine gute Idee. Und nein, das ist keine Falle." Er grinst. Sein Grinsen sagt das Gegenteil. "Vertrau mir."`,
        character: "🕶️ Jumangy",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 9: Verrat!
  // ═══════════════════════════════════════════
  {
    number: 9,
    title: "Verrat!",
    scenes: [
      {
        id: "c9s1",
        text: `Sam führt dich durch die Gassen des Schattenmarkts. Vorbei an einem Stand, der "100% echte falsche Diamanten" verkauft. Vorbei an einem Typen, der Zukunftsvorhersagen für gestern anbietet ("Rückblickende Prophezeiungen — 99% Trefferquote!"). Vorbei an einem Roulette-Tisch, an dem die Kugel NACH OBEN rollt, weil hier unten anscheinend auch die Physik verhandelbar ist.

"Hier rein," sagt Sam und deutet auf eine Tür. Sie ist unauffällig, was im Schattenmarkt das Auffälligste ist, was es gibt. "Der Code ist hier drin. Auf einem Zettel. In einem Safe. In einem Raum. Hinter dieser Tür. Einfach."

Du zögerst. Dein Instinkt sagt dir, dass das zu einfach ist. Dein Instinkt hat Recht. Dein Instinkt hat IMMER Recht. Aber hörst du auf deinen Instinkt? Nein. Natürlich nicht. Denn du bist in einem Casino, und in Casinos ignoriert man Instinkte. Das ist quasi Hausregel Nummer eins.`,
      },
      {
        id: "c9s2",
        text: `Du betrittst den Raum. Er ist klein, kahl, nur ein Tisch in der Mitte und eine Lampe, die wie in einem Verhörfilm von der Decke baumelt. Hinter dir schließt sich die Tür. KLACK. Das Schloss rastet ein. Das war kein freundliches Klack. Das war ein "du-kommst-hier-nicht-mehr-raus"-Klack.

Ein Lautsprecher knistert. Dann Sams Stimme, verzerrt durch billiges Audio-Equipment: "Sorry Kumpel! Nichts Persönliches! Also... ein BISSCHEN persönlich vielleicht. Aber hauptsächlich geschäftlich. Kurainu zahlt gut für Möchtegern-Helden, die dem Goldenen Chip nachjagen."

Du hörst ihn kichern. Es ist das widerlichste Kichern, das du je gehört hast, und du hast mal einen Clown auf einer Kindergeburtstagsfeier erlebt. "Die Jungs kommen gleich und — naja, du wirst sehen. Tschüssi! War nett dich kennenzulernen! Nicht wirklich! Okay doch ein bisschen! TSCHÜSS!"`,
        character: "🕶️ Jumangy",
      },
      {
        id: "c9s3",
        text: `Die Wände öffnen sich. Ja, die WÄNDE ÖFFNEN SICH, denn natürlich hat dieser Raum geheime Wandpaneele, warum auch nicht. Dahinter: Sams Handlanger. Fünf Typen, die aussehen als hätten sie das Wort "subtil" noch nie gehört, umzingeln den Tisch. Auf dem Tisch: ein Roulette-Rad, das aus dem Nichts aufgetaucht ist. Anscheinend lösen sie hier Konflikte am Spieltisch. Das ist... eigentlich ziemlich CRISINO.

"Die Regeln sind einfach," grunzt der Größte von ihnen, ein Mann mit einem Nacken so breit wie deine Zukunftsaussichten düster. "Du gewinnst: du gehst. Du verlierst: du... gehst auch, aber nicht durch die Tür. Durch den Müllschlucker."

Schon wieder der Müllschlucker. Gerald, wo auch immer du bist: du bist nicht allein. Aber JETZT ist nicht die Zeit für Solidarität. Jetzt ist die Zeit für den Roulette-Dreh deines LEBENS.`,
        game: { type: "roulette", description: "Gewinne gegen Sams Handlanger um zu fliehen! Alles oder nichts!", mustWin: true, reward: 300 },
      },
      {
        id: "c9s4",
        text: `Die Kugel rollt. Die Kugel ENTSCHEIDET. Und die Kugel... landet auf deiner Zahl. Die Handlanger starren. Du starrst. Alle starren. Für eine Sekunde ist es, als hätte jemand die Pause-Taste der Realität gedrückt.

Dann bricht das Chaos aus. Du springst auf, der Tisch kippt um, Chips fliegen durch die Luft wie der teuerste Konfetti der Welt. In dem Durcheinander entdeckst du einen Lüftungsschacht an der Decke — offen, einladend, definitiv nicht groß genug für einen normalen Menschen, aber du bist gerade von Adrenalin betrieben, und Adrenalin kennt keine Körpermaße.

Du ziehst dich hoch, kriechst durch den Schacht, und — BUMM — fällst auf der anderen Seite heraus. Direkt in einen Flur. Neben dir auf dem Boden: ein kleines, abgegriffenes Notizbuch. Es muss Sam aus der Tasche gefallen sein während er geflohen ist. Du schnappst es dir. Darin: Namen, Codes, Zeiten. Das ist GOLD. Metaphorisch. Und vielleicht auch buchstäblich, denn der Einband schimmert goldfarben.`,
        giveItem: "Sams Notizblock",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 10: BOSS — Der Türsteher
  // ═══════════════════════════════════════════
  {
    number: 10,
    title: "BOSS: Der Türsteher",
    scenes: [
      {
        id: "c10s1",
        text: `Floor 2. Der Eingang ist... imposant. Zwei massive Türen aus dunklem Holz, verziert mit goldenen Schnitzereien von Spielkarten, Würfeln und — aus irgendeinem Grund — einem Einhorn. Davor steht ein Mann. Nein, "steht" ist das falsche Wort. Er THRONT. Er EXISTIERT. Er nimmt den gesamten Türrahmen ein wie ein menschlicher Staudamm.

Wolfkampf. Zwei Meter. Mindestens. Arme wie Baumstämme, Schultern wie ein Kleiderschrank, Hände so groß, dass sie eigene Postleitzahlen haben müssten. Sein Gesicht sieht aus als wäre es aus Granit gemeißelt, mit einer Nase, die mindestens drei Mal gebrochen und jedes Mal schlechter zusammengewachsen ist.

Aber — und das ist der Punkt, an dem dein Gehirn einen kurzen Bluescreen macht — er liest. Er LIEST. In seinen gewaltigen Pranken hält er, vorsichtig wie ein Juwelier einen Diamanten, ein zerlesenes Taschenbuch. "Die Verwandlung" von Franz Kafka. Er blättert gerade eine Seite um. Behutsam.`,
      },
      {
        id: "c10s2",
        text: `Er bemerkt dich, aber er beendet erst seinen Absatz. Prioritäten. Dann klappt er das Buch zu — ein Lesezeichen aus geprägtem Leder markiert seine Stelle — und sieht dich an. Sein Blick ist wie ein MRT-Scanner: gründlich, unausweichlich, und leicht unangenehm.

"Weißt du," beginnt er, und seine Stimme ist ein tiefes Grollen, wie entfernter Donner mit einem Philosophie-Abschluss, "Die Verwandlung handelt im Grunde von der Entfremdung des modernen Arbeiters. Gregor Samsa wacht als Käfer auf, aber war er nicht schon VORHER ein Käfer? Metaphorisch gesehen? Das Insekt ist nur die physische Manifestation seiner bereits bestehenden existenziellen Isolation."

Pause. Er schaut dich an, als erwarte er eine Antwort. Du sagst nichts. Er nickt, als hätte dein Schweigen ihm etwas Tiefgründiges bestätigt.

"Aber das ist nicht relevant für DICH. Was für dich relevant ist: Du kommst hier nicht rein." Er verschränkt die Arme. Es klingt wie zwei Felsbrocken, die aneinander reiben.`,
        character: "💪 Wolfkampf",
      },
      {
        id: "c10s3",
        text: `Du zeigst Wolfkampf deinen VIP-Ausweis, Sams Notizblock, die Goldene Einladung — dein ganzes Arsenal an Requisiten, das du auf dieser Reise gesammelt hast. Wolfkampf betrachtet alles mit der Sorgfalt eines Kunstkritikers in einem Museum. Dann schüttelt er den Kopf.

"Papiere sind Papier. Ausweise sind Plastik. Was zählt ist der CHARAKTER eines Menschen." Er lehnt sich an die Tür. "Es sei denn..." Ein winziges, fast unsichtbares Lächeln huscht über sein Granitgesicht. "...du schlägst mich im Poker. Ich bin überraschend gut."

Er zieht ein Kartendeck aus seiner Brusttasche. In seinen Händen sehen die Karten aus wie Briefmarken. "Gewinnst du, öffne ich die Tür und Floor 2 gehört dir. Verlierst du..." Er überlegt. "...musst du mir 'Die Verwandlung' vorlesen. Alle 55 Seiten. Mit BETONUNG. Ich akzeptiere keine monotone Vorlesung. Kafka verdient Leidenschaft."`,
        character: "💪 Wolfkampf",
        boss: {
          name: "Wolfkampf",
          emoji: "💪",
          game: "poker",
          reward: 500,
          dialog: "Poker gegen den philosophischen Türsteher — der erste Boss des CRISINO!",
        },
      },
      {
        id: "c10s4",
        text: `Die letzte Karte fällt. Wolfkampf starrt auf den Tisch. Seine Augen — die normalerweise die emotionale Bandbreite einer Betonwand haben — werden weit. Er atmet tief ein. Dann aus. Dann nickt er, langsam und respektvoll, wie ein Sensei, der seinen Meisterschüler anerkennt.

"Gut gespielt." Zwei Worte. Von Wolfkampf sind zwei Worte wie eine zweistündige Lobrede von jedem anderen. Er steht auf und die Tür hinter ihm schwingt auf wie von Geisterhand. "Floor 2 gehört dir."

Er greift in seine Jackentasche und zieht sein Lesezeichen heraus. Geprägtes Leder, alt, mit einem kleinen goldenen Kleeblatt in der Ecke. "Hier. Mein Glücksbringer. Hat mich durch 'Krieg und Frieden' gebracht UND durch drei Kneipenschlägereien. Möge er dir ebenso dienen." Er drückt es dir in die Hand.

Dann, leise, fast zärtlich: "Aber Kurainu wird nicht so höflich sein wie ich. Er liest keine Bücher. Er liest MENSCHEN. Pass auf dich auf." Er nimmt sein Buch wieder auf und blättert zur nächsten Seite. Audienz beendet.`,
        character: "💪 Wolfkampf",
        giveItem: "Wolfkampf' Lesezeichen",
      },
    ],
  },

  // ═══════════════════════════════════════════════════
  // ═══  ACT 2: "Die Verschwörung" (Chapters 11-20) ══
  // ═══════════════════════════════════════════════════

  // ═══════════════════════════════════════════
  // CHAPTER 11: Floor 2
  // ═══════════════════════════════════════════
  {
    number: 11,
    title: "Floor 2",
    scenes: [
      {
        id: "c11s1",
        text: `Die Fahrstuhltüren öffnen sich und du trittst auf Floor 2. Dein Mund klappt auf. Dann zu. Dann wieder auf. Du siehst aus wie ein Goldfisch, der gerade erfahren hat, dass das Meer existiert.

Marmor. Überall Marmor. Nicht der billige Marmor aus dem Baumarkt, sondern der "Michelangelo-hätte-hier-gemeißelt"-Marmor. Der Boden spiegelt so stark, dass du dein Spiegelbild siehst — und dein Spiegelbild sieht genauso deplatziert aus wie du dich fühlst. Kristallleuchter hängen von der Decke wie gefrorene Sternschnuppen, jeder einzelne wahrscheinlich teurer als dein gesamter bisheriger Lebenslauf.

Und die Champagnerfontänen. Ja, FONTÄNEN. Nicht eine, nicht zwei, sondern SECHS. Sie sprudeln in perfekten Bögen, beleuchtet von versteckten LEDs, die das ganze Spektakel in goldenes Licht tauchen. Eine davon sprudelt definitiv echten Dom Pérignon. Die daneben... ist das Rosé oder flüssiges Platin? In diesem Casino lernst du, solche Fragen nicht zu stellen.`,
      },
      {
        id: "c11s2",
        text: `Ein Dealer tritt an dich heran. Nicht irgendeiner — dieser Typ sieht aus wie das Ergebnis eines Experiments, bei dem jemand versucht hat, einen Pinguin mit einem Mafia-Boss zu kreuzen. Makelloser Smoking, Haare so glatt wie der Marmorboden, und ein Lächeln, das gleichzeitig einladend und bedrohlich ist. Die Art von Lächeln, die sagt: "Ich werde dich ruinieren, aber du wirst dich dabei FANTASTISCH fühlen."

"Willkommen auf Floor 2," sagt er mit einer Stimme wie Seide über einem Rasiermesser. "Hier spielt man nicht um Spaß..." Er macht eine Kunstpause, die so lang ist, dass du anfängst dich zu fragen, ob er einen Schlaganfall hatte. "...hier spielt man um ALLES."

Er breitet die Arme aus wie ein Immobilienmakler, der dir die Hölle als "charmantes Fixer-Upper" verkaufen will. "Die Einsätze sind höher. Die Spieler sind besser. Die Drinks sind stärker. Und die Verluste..." Er lacht leise. "Die Verluste sind SPEKTAKULÄR."`,
        character: "🎰 Floor-2-Dealer",
      },
      {
        id: "c11s3",
        text: `Kurainu führt dich zu einem Tisch, auf dem kristallene Rubbellose liegen. Nicht die Sorte, die du an der Tankstelle kaufst und danach traurig in den Mülleimer wirfst — diese hier sind aus echtem Kristall, mit Diamant-Symbolen eingraviert, die im Licht funkeln wie die Augen eines sehr gierigen Drachen.

"Dein Einstand auf Floor 2," sagt Kurainu und schiebt dir ein Los zu. "Beweis dass du hierher gehörst. Jeder der Floor 2 betritt, muss sich seinen Platz ERKRATZEN." Er kichert über seinen eigenen Wortwitz. Du kicherst nicht. Er hört auf zu kichern. "Okay, der war nicht gut. ABER DAS SPIEL IST GUT. Also los — zeig uns was du drauf hast."

Das Kristall-Rubbellos schimmert in deiner Hand. Es fühlt sich warm an, fast lebendig, als würde es vor Vorfreude vibrieren. Oder du zitterst. Eines von beiden.`,
        character: "🎰 Floor-2-Dealer",
        game: { type: "scratch", description: "Kristall-Rubbellos — beweise dass du auf Floor 2 gehörst!", reward: 200 },
      },
      {
        id: "c11s4",
        text: `Das Los enthüllt seinen Inhalt und — DREI DIAMANTEN. Der Tisch vibriert. Die Lichter flackern. Irgendwo im Hintergrund ertönt ein Jingle, der klingt wie eine Engelsharfe, die von einem DJ geremixt wurde. Kurainu reißt die Augen auf und presst dir einen schweren, funkelnden Chip in die Hand.

"Der Diamant-Chip," flüstert er ehrfürchtig. "Den bekommt nicht jeder. Den bekommt fast NIEMAND. Letzter Gewinner war... uff, das war vor drei Monaten. Der Typ hat danach geweint. Vor Freude. Und dann vor Angst, weil alle anderen ihn neidisch angestarrt haben."

Du spürst die Blicke. Überall. Die Leute am Roulette-Tisch drehen sich um. Die Poker-Runde pausiert. Jemand verschüttet seinen Champagner. Die Flüstereien breiten sich aus wie ein Lauffeuer in einer Bibliothek: "Wer ist DAS?" — "Hat der gerade einen Diamant-Chip gewonnen?" — "Auf Floor 2?! Am ersten TAG?!" — "Ich bin seit ZWEI JAHREN hier und hab noch keinen!"

Der Diamant-Chip liegt schwer in deiner Hand. Schwer wie Verantwortung. Schwer wie Schicksal. Schwer wie ein sehr teurer, sehr glitzernder Stein. Willkommen auf Floor 2.`,
        giveItem: "Diamant-Chip",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 12: Die Spionin
  // ═══════════════════════════════════════════
  {
    number: 12,
    title: "Die Spionin",
    scenes: [
      {
        id: "c12s1",
        text: `Die Bar auf Floor 2 ist weniger "Bar" und mehr "Kunstinstallation mit Alkohollizenz". Die Gläser schweben auf Magneten, die Cocktails werden mit Pipetten gemischt, und der Barkeeper trägt weiße Handschuhe wie ein Chirurg. Ein DRINK-Chirurg. Der besorgniserregendste aller Chirurgen.

Aber dein Blick bleibt an einer Frau hängen. Sie sitzt allein am Ende der Bar, und "allein" ist hier ein Statement. Auf Floor 2, wo jeder mit jedem networkt wie auf einer toxischen LinkedIn-Party, sitzt NIEMAND allein. Außer sie.

Rotes Kleid. Nicht "hübsches-Abendessen"-Rot, sondern "ich-könnte-dein-Leben-ruinieren-und-du-würdest-dich-bedanken"-Rot. Kurze, schwarze Haare, präzise geschnitten wie von einem sehr teuren und leicht sadistischen Friseur. Und ihre Augen — sie SCANNEN den Raum. Nicht schauen, nicht gucken, SCANNEN. Wie ein Terminator in Louboutins. Jede Person, jeder Tisch, jeder Ausgang wird registriert, katalogisiert, gespeichert.`,
      },
      {
        id: "c12s2",
        text: `Du setzt dich neben sie. Sie zuckt nicht zusammen, dreht sich nicht um, zeigt keinerlei Überraschung. Als hätte sie gewusst, dass du kommst. Als hätte sie gewusst, dass du dich GENAU auf diesen Hocker setzt. Vielleicht hat sie das. Das macht dir mehr Angst als alles im CRISINO bisher.

Sie nimmt einen Schluck von ihrem Drink — Kirschrot, natürlich — und spricht, ohne dich anzusehen: "Du bist der Neue, oder? Der, der den Chip sucht?" Ihre Stimme ist kühl, präzise, jedes Wort platziert wie ein Schachzug. "Ich bin hier aus ähnlichen Gründen. Aber meine tragen Handschellen."

Stille. Du verarbeitest das. Sie dreht sich endlich zu dir und streckt eine Hand aus. Ihr Händedruck ist fest genug, um dir zu sagen: "Ich könnte dir den Arm brechen." Aber sanft genug, um hinzuzufügen: "Werde ich aber nicht. Wahrscheinlich."

"Arindy. Undercover. Und bevor du fragst: Ja, das ist ein Codename. Nein, mein echter Name geht dich nichts an. Und JA, ich genieße das Ganze hier mehr als ich zugeben sollte. Die Cocktails sind FANTASTISCH."`,
        character: "🍒 Arindy",
      },
      {
        id: "c12s3",
        text: `Arindy lehnt sich vor. In der Nähe riecht sie nach Arindyn — natürlich — und nach etwas, das entweder sehr teures Parfüm oder Schießpulver ist. Wahrscheinlich beides. "Hör zu. Kurainu der Schatten ist nicht nur ein Casino-Boss. Er ist das Zentrum eines NETZWERKS. Geldwäsche, manipulierte Spiele, gestohlene Identitäten — der Goldene Chip ist nur die Spitze des Eisbergs."

Sie zieht ein Foto aus ihrem Clutch und schiebt es über den Tresen. Es zeigt eine verschwommene Gestalt in einem dunklen Raum. "Das ist das einzige Foto, das wir von ihm haben. Mein letzter Partner hat es gemacht, bevor er..." Sie stockt. "...bevor er befördert wurde. Ja. Befördert. Zu einem Schreibtischjob. Auf den Bahamas. Ohne Telefon. Für immer." Ihr Blick sagt, dass das nicht die ganze Wahrheit ist.

"Also, die Frage ist: Vertrauen wir einander?"`,
        character: "🍒 Arindy",
        choice: {
          prompt: "Vertrauen? Arindy bietet Zusammenarbeit an.",
          options: [
            { id: "cooperate", text: "🤝 Zusammenarbeiten — Gemeinsam sind wir stärker" },
            { id: "solo", text: "🐺 Alleine weitermachen — Ich vertraue niemandem" },
          ],
        },
      },
      {
        id: "c12s4",
        text: `Arindy mustert dich einen langen Moment. Ihre Augen verraten nichts — sie wäre eine verdammt gute Pokerspielerin. Ist sie wahrscheinlich auch.

"Egal," sagt sie schließlich und zieht einen USB-Stick aus ihrer Clutch. Er ist kirschrot. Natürlich ist er kirschrot. "Hier. Daten über die Sicherheitssysteme von Floor 3 bis 5. Kamerapositionen, Wachschichten, der Code für die Personaltoilette — man weiß nie wann man den braucht."

Sie steht auf, glättet ihr Kleid mit einer Bewegung, die aussieht wie in Zeitlupe, und wirft dir einen letzten Blick zu. "Wir sehen uns wieder. Ob du willst oder nicht." Ein Hauch eines Lächelns. "Und nur fürs Protokoll: Ich genieße das hier NICHT." Sie greift nach ihrem Cocktail, trinkt ihn in einem Zug aus, und bestellt wortlos einen neuen. "Okay. Vielleicht ein BISSCHEN."

Du steckst den USB-Stick ein. Auf der Rückseite steht in winziger Schrift: "Dieses Gerät zerstört sich in 48h selbst. Oder auch nicht. Budget-Kürzungen."`,
        character: "🍒 Arindy",
        giveItem: "Kirsch-USB-Stick",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 13: Doppeltes Spiel
  // ═══════════════════════════════════════════
  {
    number: 13,
    title: "Doppeltes Spiel",
    scenes: [
      {
        id: "c13s1",
        text: `Floor 2 hat einen inneren Kreis. Natürlich hat er das. Jeder Floor im CRISINO hat mehr Schichten als eine Zwiebel, die von einer anderen Zwiebel geträumt hat. Und der innere Kreis von Floor 2 trifft sich im "Salon Risiko" — einem Raum, der so exklusiv ist, dass sogar die LUFT hier teurer schmeckt.

Du stehst vor der Tür und ein älterer Herr mit einem Schnurrbart, der sein eigenes Ökosystem hat, blockiert den Eingang. Er trägt einen Anzug, der älter ist als die meisten Demokratien, und ein Monokel — anscheinend ist das hier Standard-Equipment.

"Du willst in den inneren Kreis?" Er mustert dich wie ein Zollbeamter ein verdächtiges Paket. "Jeder hier hat ALLES riskiert. Sein Haus, sein Auto, seine Sammlung von limitierten Sneakers. ALLES." Er beugt sich vor. Seine Schnurrbartenden kitzeln fast dein Gesicht. "Zeit dass du es auch tust."`,
      },
      {
        id: "c13s2",
        text: `Der Salon Risiko ist rund, wie ein Amphitheater für Wahnsinnige. In der Mitte steht ein einzelner Tisch, beleuchtet von einem Spot, der so dramatisch ist, dass er seinen eigenen Oscar verdient hätte. Um den Tisch herum: Stühle. Leere Stühle. Und auf jedem Stuhl ein Name in goldenen Buchstaben. Einer davon — der letzte, ganz am Ende — hat KEINEN Namen. Noch nicht.

Die Mitglieder des inneren Kreises sitzen auf den oberen Rängen und beobachten dich. Gesichter wie Pokerblätter — absolut unlesbar. Jemand raucht eine Zigarre, die allein durch ihren Geruch wahrscheinlich 200 Euro kostet. Jemand anders trinkt etwas, das leuchtet. Buchstäblich LEUCHTET. Im Dunkeln.

"Die Regel ist einfach," donnert der Schnurrbart-Mann von oben herab. "All-In! Zeig dass du nicht nur hier bist um Cocktails zu trinken!" Ein paar Zuschauer kichern. Einer ruft: "Die Cocktails sind aber WIRKLICH gut!" Ein anderer wirft ein Erdnüsschen nach ihm.`,
        game: { type: "allin", description: "All-In! Beweise dem inneren Kreis deinen Mut! (Simuliert — kein echtes Risiko)", reward: 300 },
      },
      {
        id: "c13s3",
        text: `Die Chips fliegen. Die Karten fallen. Das Publikum hält den Atem an — oder zumindest den Atem, der nicht durch Zigarrenrauch ersetzt wurde. Und dann ist es vorbei. Ob du gewonnen oder verloren hast, ist fast nebensächlich — was zählt, ist dass du ALL-IN gegangen bist. Dass du alles auf eine Karte gesetzt hast. Buchstäblich.

Der Schnurrbart-Mann steht auf. Langsam, wie ein Urteil, das sich Zeit lässt. Er geht zum namenlosen Stuhl, zieht einen goldenen Stift aus seiner Brusttasche, und schreibt... deinen Namen. In perfekter Kalligraphie. Er hat Kalligraphie gelernt, nur für diesen Moment. Das ist Commitment.

"Willkommen im inneren Kreis," sagt er, und zum ersten Mal lächelt er. Sein Schnurrbart bewegt sich dabei wie eine pelzige Raupe, die eine gute Nachricht erhalten hat. "Du hast Mut bewiesen. Oder Dummheit. Hier drin ist das dasselbe." Applaus. Verhaltener, aristokratischer Applaus, aber Applaus.`,
      },
      {
        id: "c13s4",
        text: `Und dann passiert es. Die Wand hinter den Slot-Automaten — die du für eine ganz normale, langweilige Wand gehalten hast — BEWEGT sich. Ein leises Surren, ein mechanisches Klicken, und dann gleitet sie zur Seite wie die Tür eines Science-Fiction-Raumschiffs, das von einem Casino-Designer entworfen wurde.

Dahinter: ein Gang. Beleuchtet von bläulichem Licht, das an den Wänden pulsiert wie der Herzschlag eines sehr stylischen Aliens. Der Schnurrbart-Mann deutet darauf. "Der Weg nach vorne. Für die, die bereit sind." Er zwinkert. Es ist das erste Zwinkern in der Geschichte der Menschheit, das gleichzeitig einladend und bedrohlich ist.

Crisio — der irgendwie plötzlich neben dir steht, weil Crisio IMMER irgendwie plötzlich neben dir steht — pfeift leise durch die Zähne. "Eine geheime Tür hinter den Slots. Ich arbeite seit DREI JAHREN hier und wusste das nicht. Was gibt es noch, wovon ich nichts weiß?" Er zögert. "Bitte antworte nicht darauf."

Ihr tretet durch die Tür. Sie schließt sich hinter euch. Es klingt endgültig.`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 14: Die Codeknacker
  // ═══════════════════════════════════════════
  {
    number: 14,
    title: "Die Codeknacker",
    scenes: [
      {
        id: "c14s1",
        text: `Hinter der geheimen Tür liegt ein Raum, der aussieht wie die Kommandozentrale eines Bond-Bösewichts, der sein Budget ausschließlich bei MediaMarkt ausgegeben hat. Bildschirme. ÜBERALL Bildschirme. An den Wänden, an der Decke, auf dem Boden — ja, sogar im BODEN sind Bildschirme eingelassen, was das Laufen zu einer extrem surrealen Erfahrung macht.

Auf den Screens flimmern Zahlenkolonnen, Codes, verschlüsselte Nachrichten. Es sieht aus wie die Matrix, wenn die Matrix weniger Budget gehabt hätte und mehr Casino-Ästhetik. Grüne Zeichen rasen über schwarze Hintergründe, unterbrochen von gelegentlichen Poker-Symbolen, die absolut keinen technischen Zweck erfüllen, aber COOL aussehen.

Jemand kommuniziert hier mit dem Kurainu. Jemand sendet und empfängt Nachrichten, codiert in einem System, das kein normaler Mensch entschlüsseln könnte. Die Frage ist: Bist du ein normaler Mensch? (Nein. Normale Menschen spielen nicht um drei Uhr morgens in einem geheimen Raum unter einem Casino.)`,
      },
      {
        id: "c14s2",
        text: `Crisio starrt auf die Bildschirme wie ein Hund, der zum ersten Mal Fernsehen sieht — fasziniert, verwirrt und leicht überfordert. "Das sind... Nachrichten? An Kurainu? Von WEM?" Er tippt auf einen Screen. Ein Fehler-Geräusch. Er zieht die Hand zurück. "Okay, nicht anfassen."

Dann tritt eine weitere Gestalt aus dem Schatten. Es ist entweder Arindy — wenn du ihr vertraut hast — oder sie taucht auch ohne Vertrauen auf, weil Arindy IMMER auftaucht, wenn es technisch wird. Sie hat einen Laptop unter dem Arm, auf dessen Deckel ein Aufkleber klebt: "I ❤️ Verschlüsselung (beruflich)".

"Die Nachrichten sind verschlüsselt," sagt sie und ihre Finger fliegen bereits über die Tastatur. "Aber das Muster..." Sie stockt. Ihre Augen werden groß. Dann klein. Dann wieder groß. "Es ist ein Sudoku." Sie dreht den Laptop zu euch. "Der Verschlüsselungscode basiert auf einem 9x9-Sudoku-Gitter. Jede gelöste Zahl entschlüsselt einen Buchstaben der Nachricht. Das ist entweder GENIAL oder absolut VERRÜCKT." Pause. "Wahrscheinlich beides."`,
        character: "🍒 Arindy",
      },
      {
        id: "c14s3",
        text: `Das Sudoku erscheint auf dem größten Bildschirm im Raum — einem Monster von einem Screen, so groß wie eine Kinoleinwand. Die Zahlen leuchten grün auf schwarzem Grund, und mit jeder Zahl, die du einsetzt, entschlüsselt sich ein weiterer Buchstabe der geheimen Nachricht. Es ist wie ein Puzzle im Puzzle. Inception, aber mit Zahlen und mehr Stress.

Crisio steht daneben und tut so, als würde er helfen. "Ich bin moralische Unterstützung," erklärt er, während er eine Tüte Chips isst (die Snack-Art, nicht die Casino-Art — obwohl er wahrscheinlich auch die Casino-Art essen würde, wenn man ihn ließe). "Jemand muss das Team-Morale hochhalten. Das bin ich. Der Morale-Typ."

"Knacke den Code!" ruft Arindy, ohne den Blick vom Screen zu nehmen. "Die Nachricht verrät den nächsten Schritt Kurainus. Jede Sekunde zählt!" Sie hält inne. "Also, nicht JEDE Sekunde. Nimm dir Zeit. Aber nicht ZU viel Zeit. Du weißt was ich meine."`,
        character: "🍒 Arindy",
        game: { type: "sudoku9", description: "Knacke den Sudoku-Code und entschlüssle die geheime Nachricht Kurainus!", mustWin: true, reward: 350 },
      },
      {
        id: "c14s4",
        text: `Die letzte Zahl fällt ins Gitter. PING. Der Bildschirm flackert. Und dann, Buchstabe für Buchstabe, enthüllt sich die Nachricht wie ein dramatischer Filmtitel in Zeitlupe:

"M-I-T-T-E-R-N-A-C-H-T. P-E-N-T-H-O-U-S-E. D-E-R C-H-I-P W-E-C-H-S-E-L-T D-E-N B-E-S-I-T-Z-E-R."

Stille. Crisio lässt seine Chips-Tüte fallen. (Die Snack-Art.) Arindy lehnt sich zurück und pfeift durch die Zähne. "Mitternacht. Penthouse. Der Chip wechselt den Besitzer." Sie wiederholt es, als müsste sie es laut hören um es zu glauben. "Das heißt, der Goldene Chip ist NICHT sicher verwahrt. Er wird ÜBERGEBEN. An jemanden. HEUTE NACHT."

Crisio rechnet nach. "Das gibt uns..." Er schaut auf eine Uhr, die er nicht hat. "...keine Ahnung wie viele Stunden, weil es in diesem Casino keine Uhren gibt. Aber wahrscheinlich NICHT GENUG."

Arindy druckt die entschlüsselte Nachricht aus. Auf dem Drucker im Raum. Der anscheinend funktioniert, was in einem geheimen Untergrund-Raum das EIGENTLICHE Wunder ist.`,
        character: "🍒 Arindy",
        giveItem: "Entschlüsselte Nachricht",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 15: Nachtschicht
  // ═══════════════════════════════════════════
  {
    number: 15,
    title: "Nachtschicht",
    scenes: [
      {
        id: "c15s1",
        text: `Der Sicherheitsraum des CRISINO ist das Nervenzentrum dieses architektonischen Wahnsinns. Zwölf Monitore, angeordnet in einem Halbkreis, zeigen jeden Winkel des Casinos. Floor 1: Slots, Bar, Crisios Reich. Floor 2: Marmor, Champagner, Dekadenz. Floor 3: Dunkelheit, Andeutungen, verschlossene Türen. Und darüber? Statisches Rauschen. Die oberen Floors sind abgeschirmt. Natürlich sind sie das.

Die Kameras erfassen alles. ALLES. Der Typ, der heimlich eine Olive aus seinem Martini klaut, weil er zu stolz ist zuzugeben, dass er Oliven mag. Die Frau, die ihren Ehering in der Handtasche versteckt, bevor sie an den Pokertisch geht. Gerald, der SCHON WIEDER versucht, in den VIP-Bereich zu schleichen. Gerald. Mein Gott, Gerald. Gib auf.

Aber zwischen all dem Überwachungs-Wahnsinn gibt es ein MUSTER. Die Wachen patrouillieren in Schichten, und jede Schicht hat einen blinden Fleck. Einen Moment, in dem ein Gang, ein Korridor, ein Aufzug UNBEOBACHTET ist. Du musst nur herausfinden, welcher und wann.`,
      },
      {
        id: "c15s2",
        text: `Crisio drückt sich an die Wand neben der Tür und späht hinein wie ein Kind, das bei den Erwachsenen mithören will. "Zwölf Kameras. Zwölf! Wer BRAUCHT zwölf Kameras?! Ich hab nicht mal EIN Kamera in meiner Wohnung. Okay, das ist gelogen, ich hab eine Doorbell-Kamera, aber die funktioniert seit drei Monaten nicht. Der Punkt ist: Das ist VIEL Überwachung."

Arindy — falls anwesend, und sie ist IMMER anwesend wenn man sie nicht erwartet — studiert die Monitore mit der Intensität einer Falkin, die ihre Beute erspäht hat. "Die Wachen wechseln alle 47 Minuten. Ungerade Zahl. Clever — das macht es schwerer, ein Muster zu erkennen." Sie tippt auf Monitor 7. "Aber HIER. Gang B, Kamera 7. Zwischen Minute 23 und Minute 26 gibt es einen toten Winkel, wenn Wache 3 zur Toilette geht." Sie hält inne. "Er trinkt zu viel Kaffee. Das ist seine Schwäche. Und unsere Chance."

"Du musst dir die Feeds merken," sagt sie und dreht sich zu dir. "Welche Gänge sind wann frei? Ein Fehler und wir lösen den Alarm aus. Und der Alarm hier ist nicht eine Sirene — es ist ein Orchester. Ein GANZES Orchester, das Wagner spielt. In voller Lautstärke. Keiner will das."`,
        character: "🍒 Arindy",
      },
      {
        id: "c15s3",
        text: `Die zwölf Monitore flackern vor dir wie ein Mosaik aus Geheimnissen. Jeder zeigt einen anderen Gang, einen anderen Raum, ein anderes Stück des Puzzles. Die Wachen bewegen sich in Mustern — links, rechts, Pause, weiter — und du musst diese Muster AUSWENDIG lernen. Jede Kamera, jede Route, jede Lücke.

"Merk dir die Kamera-Feeds!" zischt Crisio, der mittlerweile einen Notizblock gezückt hat und eifrig mitkritzelt. Seine Zeichnungen sehen aus wie die eines besonders ambitionierten Kindergartenkindes, aber der Enthusiasmus zählt. "Welche Gänge sind wann frei? Das ist wie Memory, nur dass du nicht zwei gleiche Bilder findest sondern die Lücken im Sicherheitsnetz!"

Arindy nickt anerkennend. "Gute Metapher, Crisio." Crisio strahlt wie ein Grundschüler, der ein Sternchen bekommen hat. Es ist der stolzeste Moment seines Lebens. Und er hat mal einen Cocktail-Wettbewerb gewonnen.`,
        character: "🦊 Crisio",
        game: { type: "memory", description: "Merk dir die Kamera-Feeds! Finde die Sicherheitslücken!", mustWin: true, reward: 300 },
      },
      {
        id: "c15s4",
        text: `Du hast es. Das Muster, die Lücke, das Zeitfenster. Drei Minuten. Exakt DREI MINUTEN, in denen der Gang zum Manager-Büro unbeobachtet ist. Drei Minuten, in denen Wache 3 auf der Toilette ist, Kamera 7 einen Schwenk nach links macht, und Wache 5 ihren Kaffee nachfüllt.

"Drei Minuten," wiederholt Crisio und schaut auf seinen Notizblock, der mittlerweile mehr Kaffeeflecken als Notizen hat. "Das ist... nicht viel. Das ist weniger als die Werbepause bei 'Wer wird Millionär'. Das ist weniger als mein Frühstück dauert. Das ist—" "Genug, Crisio," unterbricht Arindy trocken.

Sie reißt eine Seite aus Crisios Block und zeichnet — in Sekundenschnelle, mit der Präzision eines militärischen Strategen — den perfekten Weg ein. Jede Abbiegung, jeder Zeitpunkt, jeder Schritt. "Der Sicherheitsplan," sagt sie und reicht dir das Blatt. "Auswendig lernen. Dann essen." Du starrst sie an. "Das war ein Witz. Oder nicht. Im Geheimdienst lernt man, flexible Definitionen von 'Witz' zu haben."`,
        character: "🍒 Arindy",
        giveItem: "Sicherheitsplan",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 16: Der Safe
  // ═══════════════════════════════════════════
  {
    number: 16,
    title: "Der Safe",
    scenes: [
      {
        id: "c16s1",
        text: `Das Büro des Casino-Managers riecht nach Leder, Ambition und dem schwachen Hauch von Verzweiflung — der Dreiklang des Kapitalismus. Ein massiver Schreibtisch aus Ebenholz dominiert den Raum, flankiert von Bücherregalen voller Bücher, die noch nie jemand gelesen hat. Die Titel sind Dekoration: "Die Kunst des Gewinnens", "Warum ich immer Recht habe: Eine Autobiografie", "1001 Wege, Reich zu werden (Band 3 — die ersten zwei haben nicht funktioniert)".

Aber dein Blick wird magnetisch angezogen von dem DING an der Wand. Der Safe. Nein — den "Safe" zu nennen ist wie den Ozean einen "Teich" zu nennen. Dieses Monstrum aus Stahl und Titan ragt aus der Wand wie der Eingang zu einer anderen Dimension. Zwei Meter hoch, einen Meter breit, mit einem Schloss, das aussieht wie ein Roulette-Rad. Weil es ein Roulette-Rad IST.

"Natürlich," murmelst du. "NATÜRLICH ist die Kombination ein Roulette-Rad. Warum sollte es auch ein normales Schloss sein? Das wäre ja LOGISCH. Und Logik hat im CRISINO Hausverbot."`,
      },
      {
        id: "c16s2",
        text: `Das Roulette-Rad dreht sich bereits. Nicht weil du es angefasst hast — es dreht sich PERMANENT. Seit wann? Seit dem Bau des Safes? Seit der Gründung des CRISINO? Seit dem Urknall? Niemand weiß es. Der Safe hat keine Bedienungsanleitung. (Na gut, er hat eine, aber sie ist IM Safe.)

Die Kugel rollt. Sie rollt und rollt und rollt, und auf dem Rahmen um das Rad stehen nicht die üblichen Zahlen, sondern Symbole: Diamanten, Schlüssel, Kronen, und — aus irgendeinem Grund — eine kleine Zeichnung von Gerald. Armer Gerald. Er ist überall.

"Der Safe öffnet sich nur wenn du die richtige Nummer triffst!" Crisio presst sein Ohr an das Stahl-Monstrum, als könnte er den Code HÖREN. "Ich glaube... ich höre... " Pause. "...nichts. Stahl ist nicht gesprächig." Er tritt zurück. "Okay, Plan B: Du spielst Roulette gegen einen Safe. Das ist eine Situation, auf die mich weder meine Ausbildung noch mein Leben vorbereitet haben."`,
        character: "🦊 Crisio",
        game: { type: "roulette", description: "Roulette gegen den Safe — triff die richtige Kombination!", mustWin: true, reward: 350 },
      },
      {
        id: "c16s3",
        text: `KLONK. CHCHCHCHCH. BOOOOM. Der Safe öffnet sich mit dem Geräusch eines mechanischen Drachen, der gähnt. Die Tür schwingt auf — schwer, langsam, dramatisch, als hätte sie bei einem Theaterkurs teilgenommen — und enthüllt seinen Inhalt.

Kein Gold. Keine Diamanten. (Naja, ein PAAR Diamanten, aber die sind nebensächlich.) Stattdessen: eine Karte. Eine LANDKARTE. Handgezeichnet, auf altem Pergament, mit Tinte, die in verschiedenen Farben schimmert. Sie zeigt den Grundriss des Penthouses — Floor 10, ganz oben, die Spitze des CRISINO. Jeder Raum, jeder Gang, jede Falle ist eingezeichnet. Und davon gibt es VIELE.

Und daneben: ein Foto. Schwarzweiß, leicht vergilbt. Es zeigt eine Gestalt an einem Pokertisch. Kurainu der Schatten. Aber sein Gesicht... sein Gesicht ist AUSGESTRICHEN. Nicht verwischt, nicht verdeckt — jemand hat mit schwarzem Marker aggressiv über das Gesicht gemalt. Als hätte das Foto selbst beschlossen, das Geheimnis zu bewahren. Oder jemand hatte sehr starke Gefühle und einen Edding.`,
      },
      {
        id: "c16s4",
        text: `Crisio nimmt das Foto und dreht es in seinen Händen. Vorne: die mysteriöse Gestalt ohne Gesicht. Hinten: eine Notiz, gekritzelt in hastiger Handschrift. "Er war einmal einer von uns." Mehr nicht. Kein Name, kein Datum, keine hilfreichen Hinweise wie "P.S.: Der Code ist 1234."

"Jetzt wird es ernst," sagt Crisio, und zum ersten Mal seit du ihn kennst, grinst er nicht. Kein Witz, kein Sarkasmus, keine Cocktail-Metapher. Er faltet die Karte zusammen und steckt sie in deine Jacke. "Der Penthouse-Plan. Damit weißt du, wo du hinmusst. Und wo du NICHT hinmusst, was ehrlich gesagt der wichtigere Teil ist."

Er atmet tief ein. "Kurainu weiß, dass wir kommen. Er weiß IMMER, dass die Leute kommen. Aber er weiß nicht, dass WIR es wissen, dass er es weiß, dass wir kommen. Und DAS..." Er runzelt die Stirn. "Okay, ich hab mich in meinem eigenen Satz verloren. ABER DER PUNKT IST: Wir haben einen Vorteil. Zum ersten Mal."`,
        character: "🦊 Crisio",
        giveItem: "Penthouse-Plan",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 17: Hochstapler
  // ═══════════════════════════════════════════
  {
    number: 17,
    title: "Hochstapler",
    scenes: [
      {
        id: "c17s1",
        text: `Floor 3. Der Aufzug dorthin hat einen Iris-Scanner, eine Stimmanalyse UND einen Fragebogen ("Was ist Ihr Lieblings-Kaviar? Hinweis: 'Aldi' ist die falsche Antwort."). Du brauchst eine Verkleidung. Nicht irgendeine Verkleidung — die PERFEKTE Verkleidung. Und es gibt nur eine Person im CRISINO, die dich in jemand anderen verwandeln kann.

Cheshire Kimchi wartet bereits in ihrem Kellerzimmer, als wüsste sie, dass du kommst. Was sie behauptet. Was wahrscheinlich stimmt. Was dich trotzdem jedes Mal nervös macht. Ihr Kristallkugel-Sortiment hat sich seit eurem letzten Treffen vermehrt — es sind jetzt 52 Stück, eine für jede Karte im Deck, wie sie stolz erklärt.

"Du brauchst ein neues Ich," sagt sie und wirbelt dramatisch ihren Umhang. Der Umhang verfängt sich in einer Kristallkugel. Sie tut so, als wäre nichts passiert. "Glücklicherweise habe ich GENAU das Richtige. Warte hier." Sie verschwindet hinter einem Vorhang und man hört Krachen, Fluchen (auf mindestens drei Sprachen) und das Geräusch von etwas Schwerem, das umfällt.`,
        character: "🔮 Cheshire Kimchi",
      },
      {
        id: "c17s2",
        text: `Kimchi taucht wieder auf. In ihren Armen: ein Smoking. Aber nicht irgendein Smoking — DIESER Smoking sieht aus, als hätte James Bond ihn getragen und dann an einen noch eleganteren James Bond weitergegeben. Mitternachtsblau, perfekt geschnitten, mit Manschettenknöpfen aus — du überprüfst zweimal — ECHTEN Saphiren. Dazu: eine Fliege (selbstbindend, Kimchi besteht darauf), Schuhe (handgefertigt, italienisch, bequemer als dein Bett), und eine Brieftasche voller gefälschter Visitenkarten.

"Du bist jetzt Graf von Glücksburg," verkündet Kimchi mit der Feierlichkeit einer Königskrönung. "Adelig. Reich. Mysteriös. Leicht arrogant, aber auf die CHARMANTE Art." Sie drückt dir ein Monokel in die Hand. "Das brauchst du. Jeder auf Floor 3 hat eins. Es ist wie eine Brille, nur nutzloser und zehnmal teurer."

Sie richtet deine Fliege mit mütterlicher Strenge. "Rede wenig, lächle viel, und GEWINNE. Wenn jemand fragt woher du kommst: Monaco. Wenn jemand fragt was du beruflich machst: 'Investitionen'. Das kann ALLES bedeuten und niemand fragt nach."`,
        character: "🔮 Cheshire Kimchi",
      },
      {
        id: "c17s3",
        text: `Floor 3. Du betrittst den Raum und — ja, das Monokel funktioniert. Nicht als Sehhilfe (es macht deine Sicht sogar SCHLECHTER), aber als Zugangscode zur High Society des CRISINO. Die Leute nicken dir zu. Sie NICKEN dir zu. Dir! Dem Typ, der vor ein paar Stunden mit drei Cent in der Tasche draußen stand!

"Graf von Glücksburg!" ruft ein rundlicher Mann mit einem Bart, der wie eine tote Katze aussieht. "Ich habe SO viel über Sie gehört!" (Er hat nichts über dich gehört. Du existierst seit fünf Minuten. Aber auf Floor 3 tut jeder so, als würde er jeden kennen, weil Ehrlichkeit LANGWEILIG ist.)

Drei Poker-Tische. Du musst an jedem einen spielen, um deine Cover-Story aufrechtzuerhalten. "Ein echter Graf spielt nicht nur an EINEM Tisch," hat Kimchi gesagt. "Er VERTEILT seine Exzellenz." Du bist dir nicht sicher, was das bedeutet, aber du setzt dich und lächelst. Das Monokel bleibt sitzen. Alles läuft nach Plan. Noch.`,
        character: "🔮 Cheshire Kimchi",
        game: { type: "poker", description: "Spiele als Graf von Glücksburg — halte deine Tarnung aufrecht! (3 Hände)", reward: 400 },
      },
      {
        id: "c17s4",
        text: `Drei Tische. Drei Spiele. Drei MAL hat dein Monokel NICHT heruntergefallen. Das allein ist ein Triumph. Die High-Society-Spieler klopfen dir auf die Schulter (eine Geste, die auf Floor 3 einer Umarmung gleichkommt — echte Umarmungen sind zu "gewöhnlich"). "Exzellent gespielt, Graf!" — "Welche Loge in Monaco, sagten Sie?" — "Wir MÜSSEN mal zusammen Polo spielen!"

Du lächelst und nickst. Lächeln und Nicken. Die zwei mächtigsten Waffen der Oberschicht. Und dann — der Moment der Wahrheit — öffnen sich die Aufzugtüren zu Floor 3. Der Iris-Scanner piept. Grün. Die Stimmanalyse bestätigt. Der Fragebogen... okay, du hast "Beluga" geraten und es war richtig. Glück oder Schicksal? Im CRISINO: dasselbe.

Kimchi wartet an der Bar (sie hat sich hochgeschlichen, weil Cheshire Kimchi IMMER einen Weg findet). Sie hebt ihr Glas. "Du warst MAGNIFIQUE. Fast hätte ich dir selbst geglaubt." Sie zwinkert. "Und jetzt bist du ein Graf, ein VIP, ein Insider UND du hast eine falsche Identität. Das ist entweder der amerikanische Traum oder der Anfang eines sehr komplizierten Steuerproblems."`,
        character: "🔮 Cheshire Kimchi",
        giveItem: "Falsche Identität",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 18: Die Auktion
  // ═══════════════════════════════════════════
  {
    number: 18,
    title: "Die Auktion",
    scenes: [
      {
        id: "c18s1",
        text: `Tief unter Floor 3, hinter einer Tür, die man nur findet wenn man DREIMAL gegen die dritte Fliese von links klopft (Crisio hat 45 Minuten gebraucht um das herauszufinden — er hat JEDE Fliese abgeklopft und dabei ausgesehen wie ein sehr verwirrter Specht), liegt der Auktionsraum.

Es ist... atemberaubend. Ein unterirdisches Amphitheater, gebaut aus schwarzem Marmor, mit Sitzreihen, die steil nach unten führen wie in einem römischen Kolosseum. In der Mitte: ein Podium, beleuchtet von einem einzelnen Spot. Und auf dem Podium, in Glasvitrinen, die wertvollsten Artefakte der Casino-Geschichte.

Die "Erste Münze von CRISINO" — angeblich die allererste Münze, die je in diesem Casino eingeworfen wurde. Flankiert von einer Erklärungstafel, die besagt, dass sie "von einem anonymen Spieler im Jahre 19-irgendwas" eingeworfen wurde. Daneben: eine "Karte die nie verliert". Buchstäblich. Sie ist magnetisch, gewichtet und mit einer Mikrochip-Technologie versehen, die in mindestens vier Ländern illegal ist. Und als Hauptattraktion: ein mysteriöser Schlüssel, der in einem Samtkasten liegt und golden leuchtet, als hätte er seine eigene Lichtquelle.`,
      },
      {
        id: "c18s2",
        text: `Der Auktionator ist ein Mann, der aussieht wie die Personifizierung des Wortes "exzentrisch". Zylinderhut (lila), Monokel (diamantbesetzt), Schnurrbart (gewachst bis zur Perfektion und leicht nach oben gebogen wie die Hörner eines sehr eleganten Stiers). Er spricht mit einem Akzent, der alle Akzente gleichzeitig zu sein scheint.

"Meine Damen und Herren und alle dazwischen und darüber hinaus!" Seine Stimme hallt durch das Amphitheater wie ein aristokratischer Donner. "WILLKOMMEN zur geheimsten Auktion des CRISINO! Die Regeln sind einfach: Sie bieten nicht mit Geld. Geld ist LANGWEILIG." Er spuckt das Wort aus wie eine vergiftete Olive. "Sie bieten mit KÖNNEN. Jeder Bieter muss sein Gebot durch ein Spiel BEWEISEN!"

Er deutet auf den würfelförmigen Tisch vor dem Podium. "Dice 21! Der Höchste gewinnt das Artefakt seiner Wahl! Und der Niedrigste..." Er kichert. "...muss meine Hutsammlung sortieren. Alle 847 Stück. Nach Farbe UND Anlass."`,
        character: "🎩 Auktionator",
      },
      {
        id: "c18s3",
        text: `Die anderen Bieter sind... einschüchternd. Da ist eine Frau, die angeblich in Monte Carlo das gesamte Casino leergeräumt hat. Ein Mann mit Narben, die eigene Geschichten erzählen (und keine davon hat ein Happy End). Eine alte Dame, die freundlich lächelt und deren Würfeltechnik von der japanischen Yakuza adaptiert wurde. Und Gerald. Gerald ist auch hier. Wie?! WARUM?!

"Würfle höher als die anderen Bieter!" ruft der Auktionator und wirft dir die Würfel zu. Sie sind aus Kristall, natürlich, und jede Seite ist mit einem winzigen Diamantsplitter besetzt. Es sind die teuersten Würfel, die du je in der Hand gehalten hast. Es sind die EINZIGEN diamantbesetzten Würfel, die du je in der Hand gehalten hast. Normaler Dienstag im CRISINO.

Die Menge leuchtet ihre Zigarren auf (warum haben auf Floor 3 ALLE Zigarren?!) und lehnt sich vor. Die Spannung ist so dick, dass man sie mit einem der diamantbesetzten Würfel schneiden könnte. Wenn Würfel schneiden könnten. Was sie nicht können. Aber die Metapher steht.`,
        character: "🎩 Auktionator",
        game: { type: "dice21", description: "Dice 21 gegen die Elite-Bieter — gewinne das mysteriöse Artefakt!", reward: 400 },
      },
      {
        id: "c18s4",
        text: `Die Würfel fallen. Die Zahlen addieren sich. Und du — DU — hast die höchste Summe. Die Monte-Carlo-Frau flucht auf Französisch (sehr kreativ). Der Narben-Mann nickt respektvoll (sein höchstes Lob). Die alte Dame lächelt und sagt: "Beim nächsten Mal, Liebling." Gerald weint leise.

Der Auktionator springt vom Podium — erstaunlich agil für jemanden in einem Zylinderhut — und überreicht dir den Samtkasten. Darin: der Schlüssel. Golden, alt, mit Gravuren, die du nicht lesen kannst. Er ist warm in deiner Hand. Nicht "lag-in-der-Vitrine"-warm, sondern "lebendiges-Metall"-warm. Als hätte er auf dich gewartet. Schon wieder wartet etwas auf dich. Dinge sollten aufhören, auf dich zu warten.

"Der Mysteriöse Schlüssel," verkündet der Auktionator mit einem Augenzwinkern, das so übertrieben ist, dass sein Monokel fast herausfällt. "Sie werden wissen wofür der ist." Er beugt sich vor und flüstert: "Ich weiß es nämlich nicht. Ich versteigere Dinge, ich BENUTZE sie nicht. Das ist wie ein Buchhändler, der nicht liest. Oder ein Barkeeper, der nicht trinkt. Oder ein—" "Danke," unterbrichst du. "Gern geschehen," antwortet er strahlend.`,
        character: "🎩 Auktionator",
        giveItem: "Mysteriöser Schlüssel",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 19: Flucht durch die Küche
  // ═══════════════════════════════════════════
  {
    number: 19,
    title: "Flucht durch die Küche",
    scenes: [
      {
        id: "c19s1",
        text: `Es passiert in Sekundenbruchteilen. Das eine Moment: du stehst im Auktionsraum und bewunderst deinen neuen Schlüssel wie Gollum seinen Ring. Das nächste Moment: ROTE LICHTER. Überall. Die Decke, die Wände, sogar der BODEN blinkt rot wie die Hölle bei einem Schlussverkauf.

"ALARM! UNBEFUGTER ZUGRIFF AUF ARTEFAKTE! ALARM!" Eine Stimme, die klingt wie ein wütender Roboter mit Halsschmerzen, dröhnt aus unsichtbaren Lautsprechern. Türen schlagen zu. Schlösser rasten ein. Und dann hörst du sie: Schritte. VIELE Schritte. Schwere Stiefel auf Marmorboden. Die Wachen Kurainus.

Crisio packt dich am Arm. Seine Augen sind so groß wie die Champagnergläser auf Floor 2. "DIE WISSEN BESCHEID! DIE WISSEN, DASS WIR DEN SCHLÜSSEL HABEN! RENN!" Er zieht dich Richtung Ausgang, aber der Ausgang ist — natürlich — versperrt. Acht Wachen, jede davon breiter als ein Kühlschrank und ungefähr genauso freundlich.`,
        character: "🦊 Crisio",
      },
      {
        id: "c19s2",
        text: `"DIE KÜCHE!" brüllt Crisio und zerrt dich durch eine Seitentür. "Durch die Küche gibt es einen Personalausgang! Ich weiß das, weil ich dort einmal versucht habe, Reste zu klauen! Hat nicht funktioniert, aber ich KENNE DEN WEG!"

Die Küche des CRISINO ist an einem normalen Tag schon chaotisch. Während eines ALARMS ist sie das kulinarische Äquivalent der Apokalypse. Köche rennen durcheinander wie aufgescheuchte Hühner (einer IST tatsächlich als Huhn verkleidet — Mottoabend, nicht fragen). Töpfe fliegen. Pfannen krachen. Eine Welle von Spaghetti — ja, eine WELLE — ergießt sich von einem Regal und schwappt über den Boden wie eine italienische Tsunami.

"AUSWEICHEN!" brüllt Crisio als ein Koch eine Bratpfanne nach einem anderen wirft, weil selbst während eines Sicherheitsalarms der ewige Krieg zwischen Soßen- und Grillstation weitergeht. Du duckst dich. Die Pfanne segelt Millimeter über deinem Kopf hinweg. Crisio rutscht auf einem Butterfleck aus und schlittert drei Meter über den Küchenboden. "ICH BIN OKAY!" ruft er, bedeckt mit Mehl und dem, was entweder Tomatensauce oder sein letzter Funken Würde ist.`,
        character: "🦊 Crisio",
      },
      {
        id: "c19s3",
        text: `Die Wachen sind HINTER euch. Du kannst sie hören — schwere Stiefel, die über nassen Küchenboden stampfen, begleitet vom gelegentlichen "AUTSCH!" wenn einer auf einem Stück Butter ausrutscht. Die Küche ist ein Labyrinth aus Arbeitsflächen, Regalen und dampfenden Töpfen, und du musst dich durchschlängeln wie eine Schlange in einem sehr stressigen Kochkurs.

"Navigiere durch das Küchenchaos!" keucht Crisio, der neben dir herrennt und dabei aussieht wie ein panischer Geist, weil er von Kopf bis Fuß mit Mehl bedeckt ist. "AUSWEICHEN! AUSWEICHEN! DA KOMMT EIN TIRAMISU!" Ein ganzes Blech Tiramisu fliegt an euch vorbei. Du weichst aus. Crisio weicht nicht aus. Crisio bekommt Tiramisu ins Gesicht. "MASCARPONE IN MEINEN AUGEN!" schreit er, aber er rennt weiter. Respekt.

Links: ein Koch mit einem Messer, das größer ist als dein Lebenswille. Rechts: ein Stapel Teller, der bedrohlich schwankt. Geradeaus: der Ausgang. Zwischen dir und dem Ausgang: ungefähr siebzehn Hindernisse, drei Wachen, und eine unbekannte Menge an Desserts.`,
        character: "🦊 Crisio",
        game: { type: "snake", description: "Navigiere durch das Küchenchaos! Ausweichen! AUSWEICHEN!", reward: 350 },
      },
      {
        id: "c19s4",
        text: `Du schaffst es. Durch die Pfannen, über die Spaghetti, unter dem fliegenden Tiramisu hindurch, vorbei an dem Koch, der IMMER NOCH mit dem Messer fuchtelt (er schneidet Zwiebeln, er ist nicht böse, er hat nur einen SEHR intensiven Schneidstil) — und durch die Tür. Die Personalausgangstür. Die schönste, dreckigste, abgeranzteste Tür, die du je gesehen hast.

BUMM. Die Tür schlägt hinter euch zu. Ihr seid im Serviceaufzug. Klein, eng, riecht nach altem Essen und frischer Verzweiflung. Aber er fährt. NACH OBEN.

Crisio lehnt an der Wand. Er ist bedeckt mit Mehl, Tomatensauce, Mascarpone, etwas das nach Pesto aussieht, und — aus irgendeinem Grund — Glitzer. "Das war knapp," keucht er. Pause. Er wischt sich übers Gesicht, was es nur schlimmer macht. "Ich hab Soße im Ohr." Er dreht den Kopf. Tatsächlich: Tomatensauce, die langsam aus seinem linken Ohr tropft. "Und Basilikum hinter dem anderen Ohr. Ich bin ein wandelndes Bruschetta." Trotz allem — oder vielleicht WEGEN allem — grinst er. "Aber wir leben. Und wir haben den Schlüssel. Das ist alles was zählt."`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CHAPTER 20: BOSS — Cheshire Kimchi
  // ═══════════════════════════════════════════
  {
    number: 20,
    title: "BOSS: Cheshire Kimchi",
    scenes: [
      {
        id: "c20s1",
        text: `Der Serviceaufzug hält. Die Türen öffnen sich. Und dort steht sie. Direkt vor dem Aufzug, als hätte sie gewusst — natürlich hat sie gewusst — genau WANN und WO ihr ankommen würdet. Cheshire Kimchi. Aber nicht die Kimchi, die du kennst.

Die Kristallkugeln sind weg. Der wallende Umhang ist weg. Der mystische Blick ist weg. Stattdessen: ein schwarzer Business-Anzug, maßgeschneidert, elegant, TÖDLICH. Ihr Haar ist streng zurückgekämmt. Keine Ringe, kein Turban, kein Glitzer. Sie sieht aus wie eine CEO, die gerade eine feindliche Übernahme plant. Ihres Gesichts ist eine Maske aus Stein.

"Es tut mir leid, Liebling." Ihre Stimme ist anders. Keine Wärme, keine Mystik, kein "die-Karten-haben-mir-gesagt". Nur Kälte. Kalte, berechnende, geschäftliche Kälte. "Kurainu hat mir ein Angebot gemacht das ich nicht ablehnen konnte."

Hinter ihr: vier Wachen. Vor ihr: der einzige Weg nach oben. Neben ihr: eine einzelne Kristallkugel, die letzte, die sie noch hat. Und in der Kristallkugel... blinkt ein rotes Licht. Ein KAMERA-Licht.`,
        character: "🔮 Cheshire Kimchi",
      },
      {
        id: "c20s2",
        text: `"Überrascht?" Sie hebt die Kristallkugel und dreht sie in ihren Händen. Das rote Licht blinkt gleichmäßig, wie ein mechanischer Herzschlag. "Meine Kristallkugeln. Meine wunderschönen, mystischen Kristallkugeln." Ein bitteres Lachen. "52 Stück. Eine für jede Karte im Deck. Verteilt über das gesamte CRISINO. Und JEDE EINZELNE..." Sie drückt einen versteckten Knopf. Die Kugel öffnet sich und enthüllt ein Linsen-Array, so klein und präzise wie das Auge einer Spinne. "...ist eine versteckte Kamera."

Crisio klappt der Mund auf. "Du... du hast uns die ganze Zeit BEOBACHTET?! Alles?! Auch als ich— " Er wird rot. "...auch als ich hinter der Bar 'Dancing Queen' gesungen habe?!" Kimchi nickt langsam. "Besonders DAS, Crisio. Es war... unvergesslich. Aus den falschen Gründen."

Sie richtet sich auf. Die volle Höhe. Die volle Autorität. "Ich habe ALLES gesehen. Jeden Schritt, jede Entscheidung, jede heimliche Nascherei am Buffet. Und ich habe alles an Kurainu gemeldet. Seit dem ERSTEN TAG." Sie hält inne. Für einen Moment — nur einen — flackert etwas in ihren Augen. Bedauern? Schuld? Oder nur das Kameralicht? "Er bot mir etwas an, das kein Wahrsager ablehnen kann: die Zukunft. Die ECHTE Zukunft. Nicht die aus Karten und Kugeln — die aus Daten und Algorithmen. Er hat mir gezeigt, wie man die Zukunft nicht VORHERSAGT, sondern KONTROLLIERT."`,
        character: "🔮 Cheshire Kimchi",
      },
      {
        id: "c20s3",
        text: `Sie setzt sich an einen Pokertisch. Er stand die ganze Zeit hier, perfekt aufgestellt, als hätte sie gewusst, dass es SO enden würde. Weil sie es wusste. Weil sie ALLES wusste. Und trotzdem — oder gerade DESHALB — muss es am Pokertisch entschieden werden. Denn das CRISINO hat Regeln, und die wichtigste lautet: Jeder Konflikt wird am Spieltisch gelöst.

"Die Karten haben mir gesagt dass du verlieren wirst," sagt sie und mischt das Deck mit der Geschwindigkeit und Präzision einer Maschine. Ihre Finger fliegen über die Karten wie Kolibris über Blumen. "Aber die Karten irren sich manchmal..." Ein Lächeln, so fein wie eine Rasierklinge. "...und manchmal irre ICH mich. Selten. Sehr selten. Aber es kommt vor."

Das Deck liegt zwischen euch. 52 Karten. 52 Schicksale. 52 Kristallkugeln, die jetzt alle auf DIESEN Moment gerichtet sind — denn wenn Kimchi spielt, dann schaut das gesamte Netzwerk zu. Kurainu der Schatten schaut zu. Das CRISINO selbst schaut zu. Und irgendwo, in einer Ecke, schaut auch Gerald zu. Gerald schaut IMMER zu.`,
        character: "🔮 Cheshire Kimchi",
        boss: {
          name: "Cheshire Kimchi",
          emoji: "🔮",
          game: "poker",
          reward: 750,
          dialog: "Poker gegen die Verräterin — Cheshire Kimchi, die Seherin mit den Kamera-Kristallkugeln!",
        },
      },
      {
        id: "c20s4",
        text: `Die letzte Karte fällt. Stille. Die Art von Stille, die so laut ist, dass sie in den Ohren klingelt. Kimchi starrt auf den Tisch. Ihre Hände — die nie zittern, die NIEMALS zittern — zittern.

"Vielleicht haben die Karten doch die Wahrheit gesagt..." Ihre Stimme bricht. Nicht dramatisch, nicht theatralisch wie früher — echt. Zum ersten Mal seit du sie kennst, ist Cheshire Kimchi ECHT. "...nur nicht über das Ergebnis das ich erwartet habe."

Sie steht langsam auf. Die Wachen hinter ihr treten zurück — sie scheinen zu spüren, dass dieser Moment IHNEN nicht gehört. Kimchi greift nach der letzten Kristallkugel. Der Kamera-Kugel. Sie betrachtet sie einen langen Moment, als würde sie sich von einem alten Freund verabschieden. Dann reicht sie sie dir.

"Hier. Kimchis Kristallkugel. Die letzte echte... naja, die letzte ÜBERHAUPT." Ein schiefes Lächeln, das mehr Traurigkeit enthält als tausend Tränen. "Kurainu wird wütend sein. Aber weißt du was? Die Karten haben mir AUCH gesagt, dass mir das egal sein wird." Sie dreht sich um. "Und diesmal... diesmal hatten die Karten Recht."

Sie geht. Ihr Absatz klickt auf dem Marmor. Klick. Klick. Klick. Leiser werdend. Wie ein Metronom, das sich entscheidet aufzuhören. Die Tür zum Aufzug steht offen. Floor 4 wartet. Und in deiner Hand liegt eine Kristallkugel, die noch warm ist von den Händen einer Frau, die zwischen den Karten und den Kameras den Weg verloren hat.`,
        character: "🔮 Cheshire Kimchi",
        giveItem: "Kimchis Kristallkugel",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  ACT 3: "Der Aufstieg" — Chapters 21-30
  //  New Character: 🎓 Schrifterz — elderly inventor of the
  //  Golden Chip, eccentric genius, talks in gambling metaphors
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════
  // CHAPTER 21: Die Himmelslounge
  // ═══════════════════════════════════════════════
  {
    number: 21,
    title: "Die Himmelslounge",
    scenes: [
      {
        id: "c21s1",
        text: `Der Aufzug hält. Die Türen gleiten auf. Und dein Kiefer gleitet runter. Floor 3 ist nicht einfach eine weitere Etage — Floor 3 ist ÜBER DEN WOLKEN. Buchstäblich. Der Boden ist aus Glas, und unter deinen Füßen ziehen Wolken vorbei wie flauschige, desinteressierte Schafe. Über dir: ein Himmel voller Sterne, die so nah aussehen, dass du schwören könntest, einer davon hätte dir gerade zugezwinkert.

Die Luft ist dünner hier oben, oder vielleicht ist es auch nur die Atmosphäre, die dir den Atem raubt. Überall schweben Kronleuchter aus Kristall, die das Sternenlicht einfangen und in tausend Regenbogen zerstreuen. Die Bar serviert Champagner, der älter ist als manche Zivilisationen, und die Gläser klingen beim Anstoßen wie Engelsgesang — wenn Engel eine Vorliebe für französische Jahrgänge hätten.

Crisio pfeift beeindruckt. "Also DAS ist Floor 3. Ich hab Gerüchte gehört, aber..." Er schaut nach unten durch den Glasboden und wird leicht grün. "...die Gerüchte haben NICHT erwähnt, dass man schwindelfrei sein muss. Kann ich bitte ein Glas Champagner und eine Papiertüte zum Reinatmen haben?"`,
        character: "🦊 Crisio",
      },
      {
        id: "c21s2",
        text: `Die Slot-Automaten auf Floor 3 sind nicht von dieser Welt — und das meine ich wörtlich. Statt Arindyn, Siebenen und Glocken zeigen die Walzen kosmische Symbole: Planeten, die sich drehen, Sterne, die explodieren, Schwarze Löcher, die alles verschlingen, und gelegentlich eine kleine Supernova, die den ganzen Automaten zum Glühen bringt.

Die Einsätze hier oben sind... anders. Die Chips sind aus einem Material, das aussieht wie komprimiertes Sternenlicht, und jeder einzelne ist mehr wert als dein bisheriges Gesamtvermögen, dein Auto, und deine Organe zusammen. Ein Schild über den Automaten verkündet in goldener Schrift: "MINIMUM: 500. MAXIMUM: ∞. EMPFOHLENE BLUTDRUCKMEDIKATION: JA."

Ein Cocktail-Roboter schwebt vorbei und bietet dir ein Getränk an, das buchstäblich leuchtet. "Kosmopolitan. Im wortwörtlichsten Sinne," erklärt er mit monotoner Stimme. "Enthält Sternenstaub. Nebenwirkungen: Euphorie, Größenwahn, und gelegentliche Schwerelosigkeit."`,
      },
      {
        id: "c21s3",
        text: `Du setzt dich an den nächsten Himmels-Slot. Die Walzen beginnen sich zu drehen und die kosmischen Symbole tanzen vor deinen Augen — Planeten wirbeln, Sterne pulsieren, und ein Schwarzes Loch versucht aktiv deinen Einsatz zu verschlingen. Der Automat macht Geräusche, die klingen wie das Universum selbst einen Dubstep-Remix spielt.

"Die Himmels-Slots! Hier gewinnt man groß... oder fällt tief," verkündet eine Stimme aus dem Automaten, so dramatisch, als würde Morgan Freeman einen Spielautomaten moderieren. "Aber keine Sorge — der Fall durch den Glasboden ist rein metaphorisch. MEISTENS."

Crisio steht hinter dir und klammert sich an die Rückenlehne deines Stuhls. "Ich schaue nur. Moralische Unterstützung. Und falls du durch den Boden fällst, erzähle ich allen dass du heroisch gestorben bist. Bei einem tragischen... Slot-Unfall." Er überlegt. "Okay, das klingt weniger heroisch als gedacht."`,
        character: "🦊 Crisio",
        game: { type: "slots", description: "Die Himmels-Slots! Hier gewinnt man groß... oder fällt tief.", reward: 350 },
      },
      {
        id: "c21s4",
        text: `Während die Walzen sich drehen, bemerkst du etwas. Am Rand der Lounge, halb verborgen hinter einem schwebenden Kronleuchter, steht jemand und beobachtet dich. Ein alter Mann — SEHR alt, die Art von alt, bei der man sich fragt, ob er älter ist als das Gebäude oder umgekehrt. Sein Haar steht in alle Richtungen ab wie eine Explosion in Zeitlupe, weiß wie frischer Schnee und mindestens genauso chaotisch.

Er trägt einen Laborkittel über einem Smoking, was eine Kombination ist, die nur funktioniert wenn man entweder wahnsinnig oder ein Genie ist — oder beides. In einer Hand hält er ein Champagnerglas, in der anderen etwas das aussieht wie ein selbstgebautes Oszilloskop. Er schreibt Notizen auf eine Serviette, murmelt vor sich hin, und sein linkes Auge scheint permanent halb zugekniffen zu sein, als würde er das gesamte Universum durch ein unsichtbares Monokel betrachten.

Er bemerkt deinen Blick. Und GRINST. Ein Grinsen so breit und verrückt, dass es entweder bedeutet "Ich weiß etwas, das du nicht weißt" oder "Ich habe vergessen wo ich bin." Beide Optionen sind gleichermaßen beunruhigend.`,
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 22: Der Alte Spieler
  // ═══════════════════════════════════════════════
  {
    number: 22,
    title: "Der Alte Spieler",
    scenes: [
      {
        id: "c22s1",
        text: `Der alte Mann stürmt auf dich zu — und mit "stürmen" meine ich eine Art kontrollierten Fall nach vorne, der irgendwie in Vorwärtsbewegung resultiert. Sein Laborkittel flattert hinter ihm wie ein Cape, und er verschüttet mindestens ein Drittel seines Champagners auf dem Weg.

"DU! JA, DU! Ich hab dich beobachtet! Nicht auf die gruselige Art — auf die WISSENSCHAFTLICHE Art!" Er packt deine Hand und schüttelt sie mit der Energie eines Mannes, der dreimal so jung ist wie er aussieht. "Schrifterz! Ja, DER Schrifterz! Der Name ist Programm — oder Ironie, je nach Tagesform!"

Er lehnt sich so nah zu dir, dass du seinen Atem riechen kannst — eine Mischung aus Champagner, Lötzinn und dem Hauch von Wahnsinn. "Ich hab den Chip gebaut! Den GOLDENEN CHIP! Vor 50 Jahren! In meiner GARAGE! Mit einem Lötkolben und einer Flasche Schnaps!" Er kichert. "Die Flasche war das wichtigere Werkzeug, wenn ich ehrlich bin."`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c22s2",
        text: `Der Professor zieht dich zu einem Tisch in der Ecke und breitet Servietten aus wie eine Landkarte. Jede einzelne ist vollgekritzelt mit Gleichungen, Diagrammen und mindestens einer Zeichnung, die entweder ein Quantenfeldmodell oder eine Katze darstellt. Schwer zu sagen.

"Pass auf, Kind. Der Goldene Chip — alle denken, das ist Magie. FALSCH!" Er haut auf den Tisch. Die Champagnergläser springen. "Es ist Quantenphysik! Der Chip manipuliert WAHRSCHEINLICHKEITEN. Er nutzt Quantenverschränkung, Superposition, und einen Hauch von... naja..." Er senkt die Stimme. "...Magie." Beat. "Aber nur ein HAUCH! Höchstens 3 Prozent Magie! Der Rest ist pure Wissenschaft!" Er hebt einen Finger. "Oder Magie. Ist das gleiche, wenn man lange genug drüber nachdenkt."

Crisio starrt den Professor an. "Sie haben... den mächtigsten Gegenstand im CRISINO... in einer Garage gebaut. Mit Schnaps." Der Professor nickt enthusiastisch. "Es war GUTER Schnaps! Doppelkorn! Die Grundlage jeder großen Erfindung! Einstein hatte Relativität, ich hatte Doppelkorn und eine Vision!" Er wischt sich eine Träne der Nostalgie weg. Oder des Champagners.`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c22s3",
        text: `Der Professor springt auf und zieht eine Münze aus der Tasche. Nicht irgendeine Münze — eine, die in mindestens vier Farben gleichzeitig schimmert und ein leises Summen von sich gibt. "SO! Jetzt zeig ich dir STRATEGIE!" Er wirft die Münze. "Kopf oder Zahl?"

Du öffnest den Mund, aber er unterbricht dich sofort. "FALSCH! Die richtige Antwort ist: Es ist egal! Es ist ein MÜNZWURF! Es gibt KEINE Strategie!" Er lacht so laut, dass drei Tische rüberschauen. "ABER — und das ist der Trick — wenn du GLAUBST, dass es eine Strategie gibt, dann spielst du mit mehr Selbstvertrauen. Und Selbstvertrauen verändert die Quantenfluktuation des lokalen Wahrscheinlichkeitsfeldes!" Er zeigt auf seine Servietten-Gleichungen. "Steht alles HIER! Mehr oder weniger! Hauptsächlich weniger!"

Er drückt dir die Münze in die Hand. "Los, Kind! Wirf! Mehrmals! Fühle die STRATEGIE! Die Strategie, die es nicht gibt, aber die trotzdem funktioniert! Das ist der schönste Widerspruch der Physik!"`,
        character: "🎓 Schrifterz",
        game: { type: "flip", description: "Schrifterzs 'Strategie'-Training — wirf die Quantenmünze!", reward: 200 },
      },
      {
        id: "c22s4",
        text: `Der Professor klatscht begeistert in die Hände. "SIEHST DU?! Die Strategie WIRKT! Oder der Zufall! Oder beides! Die Grenzen sind fließend!" Er greift in seine Brusttasche und zieht eine zerknitterte Serviette hervor, die mehr Gleichungen enthält als manche Lehrbücher.

"Hier! NIMM! Professors Formel! Mein Lebenswerk auf einer Serviette! Naja, EINES meiner Lebenswerke. Ich hab mindestens sieben. Drei davon sind legal." Er drückt dir die Serviette in die Hand wie einen heiligen Schatz. Die Gleichungen darauf scheinen zu... schimmern? Oder ist das ein Champagnerfleck? Beides möglich.

"Du hast Talent, Kind! Oder Glück. Beides reicht!" Er zwinkert dir zu — oder sein Auge zuckt, man kann es bei ihm nie genau sagen. "Der Chip ist da oben. Floor 4. Wo ICH ihn vor 50 Jahren versteckt habe. Bevor Kurainu alles übernommen hat. Bevor..." Sein Blick wird kurz ernst. Richtig ernst. "Bevor alles schiefging." Dann grinst er wieder. "ABER ERST — musst du beweisen, dass du WÜRDIG bist! Und das geht nur auf EINE Art: SPIELEN!"`,
        character: "🎓 Schrifterz",
        giveItem: "Professors Formel",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 23: Das Turnier
  // ═══════════════════════════════════════════════
  {
    number: 23,
    title: "Das Turnier",
    scenes: [
      {
        id: "c23s1",
        text: `Ein Gong ertönt — so tief und voluminös, dass der Glasboden vibriert und die Wolken unter dir nervös zucken. Scheinwerfer rasen über die Himmelslounge und kreuzen sich in der Mitte, wo eine schwebende Plattform aus dem Nichts materialisiert. Darauf steht ein Moderator in einem Anzug aus flüssigem Gold (wirklich FLÜSSIG — der Stoff fließt an ihm herunter wie ein glänzender Wasserfall und recycelt sich irgendwie von unten nach oben).

"MEINE DAMEN UND HERREN! SPIELER UND SPIELERINNEN! VERZWEIFELTE UND HOFFNUNGSVOLLE!" Seine Stimme dröhnt durch den Saal, verstärkt durch unsichtbare Lautsprecher. "DAS HIMMELS-TURNIER BEGINNT! DREI DISZIPLINEN! EIN CHAMPION! KEIN RÜCKGABERECHT!"

Die Menge jubelt. Und mit "Menge" meine ich die Crème de la Crème des CRISINO — Spieler in Kleidung, die mehr kostet als Häuser, mit Chips, die so groß sind wie Untertassen. Crisio schaut sich nervös um. "Das sind die Profis. Die ECHTEN Profis. Die Leute, die 'Poker-Abend' sagen und damit eine Yacht meinen."`,
        character: "🦊 Crisio",
      },
      {
        id: "c23s2",
        text: `"RUNDE EINS!" Der Moderator zieht eine einzelne, goldene Münze aus dem Nichts. Sie schwebt über seiner Hand, rotiert langsam, und reflektiert das Sternenlicht so dramatisch, dass mindestens drei Personen im Publikum ohnmächtig werden. Vor Aufregung oder wegen des Champagners — unklar.

"Der MÜNZWURF DES SCHICKSALS! Ein Wurf! Eine Chance! Ein Moment, der ALLES entscheidet! Oder zumindest ein Drittel von allem, weil es drei Runden gibt, aber TROTZDEM!" Die Münze beginnt sich schneller zu drehen, hebt ab, und schwebt über dem Tisch wie ein goldener Stern.

Schrifterz sitzt in der ersten Reihe und winkt dir enthusiastisch mit beiden Händen. "DENK AN DIE STRATEGIE!" ruft er. Crisio flüstert: "Welche Strategie? Es ist ein MÜNZWURF!" Der Professor: "GENAU! DAS ist die Strategie!" Crisio gibt auf.`,
        character: "🎓 Schrifterz",
        game: { type: "flip", description: "Runde 1: Münzwurf des Schicksals!", reward: 200 },
      },
      {
        id: "c23s3",
        text: `"RUNDE ZWEI!" Der Moderator materialisiert einen Satz Würfel aus reinem Kristall. Sie leuchten von innen, und jede Seite zeigt eine andere Sternenkonstellation statt simpler Punkte. "WÜRFEL GEGEN DIE ELITE! Dice Twenty-One — das Spiel der Könige, der Kaiser, und der Leute, die zu viel Freizeit haben!"

Dein Gegner ist ein Typ mit einem Monokel, einem Schnurrbart der seinen eigenen Postcode hat, und einem Anzug, der so steif ist, dass er vermutlich von alleine stehen könnte. Er stellt sich vor als "Baron von Würfelstein der Dritte" und ja, er meint das ernst.

"Möge der Bessere gewinnen," sagt der Baron und verbeugt sich mit einer Steifheit, die darauf hindeutet, dass sein Rückgrat aus demselben Material besteht wie sein Monokel. Schrifterz ruft von der Tribüne: "Denk dran, Kind! Würfel haben kein Gedächtnis! Aber DU AUCH NICHT, wenn du zu viel Champagner trinkst! WENIGER TRINKEN, MEHR WÜRFELN!"`,
        game: { type: "dice21", description: "Runde 2: Würfel gegen die Elite!", reward: 250 },
      },
      {
        id: "c23s4",
        text: `"FINALE! RUNDE DREI!" Der Moderator schnappt mit den Fingern und ein ROULETTE-TISCH fährt aus dem Glasboden empor wie ein mechanischer Phönix. Das Rad ist aus schwarzem Marmor und die Zahlen darauf leuchten in abwechselnd Gold und Silber. In der Mitte des Rades dreht sich langsam ein holografischer Stern.

"ROULETTE ROYALE! Das Spiel, bei dem das Schicksal BUCHSTÄBLICH im Kreis dreht! Setzen Sie, wagen Sie, LEBEN Sie!" Der Moderator hat offensichtlich an einem Motivations-Seminar teilgenommen. Oder er hat zu viel Kaffee getrunken. Beides plausibel.

Du setzt. Das Rad dreht sich. Die Kugel tanzt über die Zahlen wie ein hyperaktives Kind auf einer Hüpfburg. Die Menge hält den Atem an. Crisio hält den Atem an. Der Professor hält den Atem NICHT an, weil er gerade ein Stück Kuchen isst, das er irgendwo aufgetrieben hat. "Multitasking!" nuschelt er kauend.`,
        game: { type: "roulette", description: "Runde 3: Roulette Royale!", reward: 300 },
        giveItem: "Turnier-Trophäe",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 24: Der Doppelgänger
  // ═══════════════════════════════════════════════
  {
    number: 24,
    title: "Der Doppelgänger",
    scenes: [
      {
        id: "c24s1",
        text: `Es passiert zwischen zwei Herzschlägen. Du schaust durch die Lounge, über die Menge, vorbei an den schwebenden Kronleuchtern und den kosmischen Slots — und dann siehst du IHN. Oder besser gesagt: du siehst DICH.

Am anderen Ende des Raums steht jemand, der EXAKT so aussieht wie du. Dasselbe Gesicht. Dieselben Klamotten. Dieselbe leicht verwirrte Miene, die du vermutlich gerade auch aufhast. Für einen Moment denkst du, es ist ein Spiegel — aber da ist kein Spiegel. Da ist eine PERSON. Die genauso aussieht wie du. Und die gerade — oh Gott — dir zuWINKT. Mit DEINER Hand. An DEINEM Arm. An DEINEM Körper. Den SIE hat.

Das Blut in deinen Adern friert ein. Dann wird es heiß. Dann friert es wieder ein. Dein Kreislauf kann sich nicht entscheiden, und ehrlich gesagt — wer könnte ihm das verübeln? Crisio bemerkt deinen Blick. "Was guckst du so? Du siehst aus als hättest du einen Geist gesehen." Er schaut rüber. Und wird WEISS wie die Wolken unter dem Glasboden.`,
        character: "🦊 Crisio",
      },
      {
        id: "c24s2",
        text: `Der Doppelgänger kommt näher. Er SCHLENDERT. Wie jemand, der keinen einzigen Stress auf der Welt hat, obwohl er buchstäblich als wandelnde Identitätskrise durch einen Raum voller Zeugen spaziert. Sein Lächeln — DEIN Lächeln — ist entspannt und leicht amüsiert.

"Oh!" sagt er, und seine Stimme klingt wie DEINE Stimme, nur mit dem Hauch eines Echos, als würde jemand dein Audio durch einen sehr leichten Halleffekt jagen. "Du bist der Echte? Oder bin ICH der Echte?" Er legt den Kopf schief, genau so, wie du es tust wenn du nachdenkst. "Philosophische Frage! Wirklich! Ich hab drüber nachgedacht, und ehrlich gesagt hab ich keine Antwort." Er zuckt die Schultern — DEINE Schultern. "Aber hey, solange einer von uns existiert, ist das Universum zufrieden, oder?"

Schrifterz taucht neben dir auf, sein Oszilloskop piepst wie verrückt. "FASZINIEREND! Eine Quantenduplikation! Oder eine Halluzination! Oder ein sehr guter Kostümwechsel! Alle drei Optionen sind wissenschaftlich gleich spannend!"`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c24s3",
        text: `Der Doppelgänger steht direkt vor dir. So nah, dass du die Details siehst — die EXAKTEN Details. Jede Sommersprosse, jede Narbe, jede Haarsträhne. Es ist wie in einen Spiegel zu schauen, der beschlossen hat, dreidimensional zu werden und ein eigenes Bewusstsein zu entwickeln. Er riecht sogar wie du. Das ist der verstörendste Teil.

"Also," sagt er — sagst DU? — und verschränkt die Arme. "Was machen wir jetzt? Ich sehe zwei Optionen." Er hebt einen Finger. "Option A: Wir konfrontieren das Ganze direkt. Prügeln uns philosophisch. Stellen fest wer real ist." Zweiter Finger. "Option B: Wir tauschen einfach die Identitäten. Ich geh in dein Leben, du gehst in meins. Kann nicht schlimmer sein als das was ich gerade mache." Er grinst. "Wobei — ich weiß nicht was ICH gerade mache. Ich bin erst seit fünf Minuten hier. Glaub ich."

Crisio sieht aus als würde er gleich in Ohnmacht fallen. "Kann mir BITTE jemand erklären was hier passiert? Seit wann gibt es ZWEI von dir? War EINER nicht schon genug Chaos?!"`,
        character: "🦊 Crisio",
        choice: {
          prompt: "Was tust du?",
          options: [
            { id: "confront", text: "A: Konfrontieren — 'Wer bist du WIRKLICH?!'" },
            { id: "swap", text: "B: Identitäten tauschen — 'Deal! Ich brauch eh mal Urlaub.'" },
          ],
        },
      },
      {
        id: "c24s4",
        text: `Egal was du sagst — der Doppelgänger lacht. DEIN Lachen. Und dann — wie ein Bild, das jemand langsam mit einem Radiergummi entfernt — beginnt er zu verblassen. Seine Konturen werden weich, seine Farben blass, und sein Lächeln ist das Letzte, das verschwindet, wie die Grinsekatze aus Alice im Wunderland, nur weniger flauschig und deutlich verstörender.

Wo er stand, liegt jetzt nur noch ein einzelner Chip auf dem Glasboden. Golden. Warm. Und er pulsiert leise, wie ein winziger Herzschlag. War es die Macht des Goldenen Chips? Eine Halluzination? Eine Warnung? Ein Glitch in der Matrix des CRISINO? Keiner weiß es. Die Champagner-Gläser in der Nähe vibrieren noch leise.

Crisio wischt sich den Schweiß von der Stirn. "Ich hab nichts gesehen. NICHTS. Verstanden? Ich sehe manchmal doppelt, das ist bekannt, ich trinke viel, und heute war ein langer Tag." Der Professor kritzelt begeistert auf einer neuen Serviette. "Quantenduplikation bestätigt! Oder Champagner-Halluzination! Ich dokumentiere BEIDES! Für die Wissenschaft!" Er hält inne. "Und für mein Tagebuch. Mein Tagebuch ist wissenschaftlicher als die meisten Fachzeitschriften."`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 25: Schwebende Würfel
  // ═══════════════════════════════════════════════
  {
    number: 25,
    title: "Schwebende Würfel",
    scenes: [
      {
        id: "c25s1",
        text: `Am Ende der Himmelslounge gibt es eine Tür, die aussieht wie ein Bullauge auf einem Raumschiff. Darüber steht in leuchtenden Buchstaben: "ZERO-G ZONE — BETRETEN AUF EIGENE GRAVITATION." Dahinter liegt ein Raum, in dem die Physik beschlossen hat, Urlaub zu nehmen.

Alles. Schwebt. Die Würfel schweben. Die Chips schweben. Die Drinks schweben — und ja, der Bartender gießt Cocktails KOPFÜBER ein, weil die Schwerkraft hier offenbar nur eine Empfehlung ist, kein Gesetz. Die Flüssigkeit fließt nach oben, dreht eine Schleife, und landet perfekt im Glas, das ebenfalls schwebt. Der Bartender sieht dabei aus, als wäre das die normalste Sache der Welt. Vermutlich ist es das, in SEINEM Universum.

Spieler sitzen an schwebenden Tischen, die sich langsam um die eigene Achse drehen. Manche Spieler drehen sich MIT. Manche DAGEGEN. Einer schläft schwerelos in der Ecke und dreht sich wie ein Döner am Spieß. Niemand scheint das zu stören. Das ist Floor 3. Hier ist nichts normal, und alle sind damit einverstanden.`,
      },
      {
        id: "c25s2",
        text: `Schrifterz schwebt herein — und er schwebt mit der Eleganz eines Mannes, der das schon TAUSEND Mal gemacht hat. Er dreht eine Pirouette in der Luft, fängt seinen eigenen Champagner aus der Schwerelosigkeit auf, und landet sanft auf einem unsichtbaren Luftkissen.

"ICH HAB DIESEN RAUM GEBAUT!" verkündet er stolz, und seine Stimme hallt durch die Schwerelosigkeit auf eine Art, die irgendwie... majestätisch klingt. "Vor 35 Jahren! Die Schwerkraft war mir zu MAINSTREAM! Jeder kann auf dem BODEN spielen — wo ist da die HERAUSFORDERUNG?!" Er schnappt sich einen schwebenden Würfel aus der Luft und jongliert ihn zwischen seinen Fingern. "In der Schwerelosigkeit fallen die Würfel NICHT — sie SCHWEBEN. Und wenn sie schweben, sind sie in einem Zustand der Quantenunsicherheit! JEDE Seite ist gleichzeitig oben! Bis du hinschaust!" Er kichert. "Schrödingers Würfel! Mein zweitbestes Patent!"

Crisio klammert sich an einem Stuhl fest, der langsam zur Decke driftet. "Ich hasse diesen Raum. Ich hasse ALLES an diesem Raum. Wer braucht schon Schwerkraft? ICH! ICH brauche Schwerkraft! Sie hält mich am BODEN! WO ICH HINGEHÖRE!"`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c25s3",
        text: `Ein schwebender Dice-21-Tisch materialisiert sich vor dir, komplett mit schwerkraftfreien Würfeln, die sanft in der Luft rotieren wie kleine, sechsseitige Planeten. Jeder Würfel hat ein eigenes Gravitationsfeld und zieht winzige Chipkrümel in seine Umlaufbahn. Es sieht aus wie ein Miniatur-Sonnensystem, nur mit mehr Zufall und weniger wissenschaftlicher Genauigkeit.

"Würfel in Schwerelosigkeit!" ruft der Croupier, der kopfüber an der Decke sitzt und dabei vollkommen seriös aussieht. Sein Haar hängt nach oben — oder nach unten, je nach Perspektive — und sein Fliege schwebt leicht von seinem Hals weg. "Sie fallen langsamer, aber die Spannung steigt! Das Ergebnis zeigt sich erst, wenn der Würfel sich entscheidet aufzuhören — und in DIESEM Raum... dauert das manchmal eine WEILE."

Schrifterz hat sich einen schwebenden Lehrstuhl organisiert und sitzt wie ein König in der Luft. "Die Quantenfluktuation in diesem Raum ist PERFEKT für Dice Twenty-One! Die Würfel berücksichtigen die lokale Raumkrümmung und die Heisenbergsche Unschärferelation!" Crisio: "Heißt das, sie sind FAIRER?" Professor: "Nein! Es heißt NIEMAND weiß was passiert! IST DAS NICHT WUNDERBAR?!"`,
        character: "🎓 Schrifterz",
        game: { type: "dice21", description: "Würfel in Schwerelosigkeit! Sie fallen langsamer, aber die Spannung steigt!", reward: 350 },
      },
      {
        id: "c25s4",
        text: `Der letzte Würfel dreht sich aus, das Ergebnis materialisiert sich holografisch in der Luft, und die Menge — die schwebende Menge — explodiert. Applaus in Schwerelosigkeit ist ein Erlebnis für sich: Die Schallwellen verbreiten sich anders, es klingt wie ein Echo in einer Kathedrale, und die klatschenden Hände erzeugen kleine Luftwirbel, die die schwebenden Champagnergläser in elegante Spiralen schicken.

Du hast es gemeistert. Zero-Gravity Gambling. Eine Disziplin, von der du nicht mal wusstest, dass sie existiert, und die du jetzt BEHERRSCHST. Oder zumindest hast du nicht gegen den Tisch gekotzt, was in der Schwerelosigkeit eine echte Leistung ist und mehr als die Hälfte der anderen Teilnehmer von sich behaupten können.

Schrifterz schwebt neben dir und klatscht so enthusiastisch, dass er sich im Kreis dreht. "BRILLIANT! Die Würfel haben dich AKZEPTIERT! In der Schwerelosigkeit zeigen sie ihr WAHRES Gesicht!" Crisio, der mittlerweile grünlich aussieht und sich an einer Stange festhält: "Können wir BITTE zurück in die Schwerkraft? Mein Magen hat eine Petition eingereicht." Der Professor, sich immer noch drehend: "Schwerkraft ist ÜBERBEWERTET! Aber ja, gehen wir. Ich muss sowieso mein Oszilloskop kalibrieren. Es zeigt gerade 'Mittwoch' an, und das ist definitiv nicht richtig."`,
        character: "🎓 Schrifterz",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 26: Die Bibliothek der Verluste
  // ═══════════════════════════════════════════════
  {
    number: 26,
    title: "Die Bibliothek der Verluste",
    scenes: [
      {
        id: "c26s1",
        text: `Hinter einer unscheinbaren Tür — markiert mit einem Schild das lediglich "📚" zeigt — öffnet sich ein Raum, der UNMÖGLICH in dieses Gebäude passen sollte. Eine Bibliothek. Aber nicht irgendeine Bibliothek. Eine Bibliothek, die sich in alle Richtungen erstreckt, nach oben, nach unten, nach links, nach rechts, und vermutlich in mindestens zwei Richtungen, die noch nicht erfunden wurden.

Bücherregale, so hoch wie Wolkenkratzer, gefüllt mit Büchern in jeder Farbe, jeder Größe, jedem Alter. Manche sind so alt, dass sie aussehen wie gepresste Zeit. Manche sind so neu, dass die Tinte noch feucht ist. Und alle — ALLE — tragen auf dem Rücken einen Namen. Einen SPIELER-Namen. Denn jedes einzelne Buch in dieser unfassbaren Bibliothek enthält die KOMPLETTE Spielhistorie einer Person. Jede Wette. Jeder Gewinn. Jeder Verlust. Jeder Moment, in dem jemand dachte "noch EINE Runde" und es bereut hat. Oder nicht.

Ein Bibliothekar schwebt vorbei — ja, SCHWEBT, auf einer Leiter, die keinen Boden berührt. Er ist ein älterer Herr mit einer Brille so dick wie Panzerglas und einem Schnurrbart, der sein eigenes Postfach haben sollte. "Willkommen in der Bibliothek der Verluste," sagt er mit der Stimme eines Mannes, der jede Tragödie der Spielgeschichte gelesen hat und trotzdem — oder gerade deshalb — noch funktioniert.`,
      },
      {
        id: "c26s2",
        text: `Du durchstreifst die endlosen Gänge und suchst — oder eigentlich sucht das Buch DICH. Es springt dir buchstäblich in die Hände, als du um eine Ecke biegst. Ein mitteldickes Buch, Einband in einem Blau das die Farbe deiner Augen hat (oder deiner Seele, je nachdem welche blauer ist). Auf dem Rücken steht dein Name, und es ist WARM. Wie lebendig.

Du schlägst es auf. Die ersten Seiten: "Kapitel 1: Die letzte Münze." Da ist alles. ALLES. Crisios erster Drink. Der Münzwurf. Der mysteriöse Umschlag. Jedes Wort, jedes Gefühl, jede Entscheidung, dokumentiert in einer Handschrift, die sich mit jeder Seite verändert — mal elegant, mal hektisch, mal zitternd, je nach dem was passiert ist. Du blätterst weiter, immer schneller, und das Buch wird DICKER während du liest, weil es in ECHTZEIT weiter schreibt.

Die aktuelle Seite: "Kapitel 26: Die Bibliothek der Verluste. Der Spieler liest sein eigenes Buch und fragt sich, ob das META ist oder einfach nur gruselig." Du schaust auf die Seite. Die Seite schaut zurück. Nicht wörtlich. Aber irgendwie... doch. "Meta," murmelst du. "Definitiv meta."`,
      },
      {
        id: "c26s3",
        text: `Der Bibliothekar schwebt neben dir und räuspert sich mit der Autorität einer UNESCO-geschützten Institution. "Wenn Sie ein BESTIMMTES Buch suchen, müssen Sie den Katalog-Index konsultieren." Er zeigt auf ein massives Pult aus dunklem Holz, auf dem ein Buch liegt, das so dick ist, dass es vermutlich seine eigene Postleitzahl hat. "Allerdings..." Er senkt die Stimme. "...ist der Index VERSCHLÜSSELT. Aus Datenschutzgründen. Und aus Gründen des dramatischen Effekts."

Du brauchst das Buch Kurainus. Sein Name, seine Geschichte, seine Schwächen — alles muss in SEINEM Buch stehen. Aber der Index-Code ist ein Sudoku-Gitter, komplex und verschachtelt, weil NATÜRLICH ist es das. Weil im CRISINO sogar die Bibliotheks-Kataloge ein Minispiel sind.

Schrifterz hat bereits seinen Laborkittel-Ärmel hochgekrempelt und studiert das Gitter. "Das ist ein 9er-Sudoku! Hoch-sicherheits-verschlüsselung! Oder ein Mittel-schweres Rätsel für meine Enkelin! Je nach Perspektive!" Er klopft dir auf die Schulter. "Finde den Eintrag Kurainus! Wenn jemand diesen Code knacken kann, dann... naja, dann vermutlich ein Computer, aber VERSUCH es trotzdem!"`,
        character: "🎓 Schrifterz",
        game: { type: "sudoku9", description: "Der Katalogindex ist verschlüsselt. Finde den Eintrag Kurainus!", mustWin: true, reward: 400 },
      },
      {
        id: "c26s4",
        text: `Das Gitter löst sich auf und der Index-Eintrag erscheint: "DEALER — Regal ∞, Reihe ?, Platz █." Hilfreiche Angaben. Aber das Buch findet DICH — genau wie deins dich gefunden hat. Es gleitet aus einem Regal in der dunkelsten Ecke und landet vor dir auf dem Tisch mit einem WUMMS, der in der stillen Bibliothek wie eine Explosion klingt.

Es ist schwarz. Komplett schwarz. Kein Name auf dem Rücken. Keine Verzierung. Nur... schwarz. Und KALT. Wo dein Buch warm war, ist dieses Buch eiskalt, als hätte es in einem Gefrierfach gelegen, seit es geschrieben wurde. Du schlägst es auf der letzten Seite auf — und dort, in einer Handschrift die so präzise ist, dass sie maschinell wirkt, steht ein einziger Satz:

"Der Chip kann nicht gewinnen und verlieren gleichzeitig. Oder doch?"

Das war's. Die letzte Seite. Der letzte Satz. Und er stellt eine Frage, die alles in Frage stellt, was du bisher über den Goldenen Chip zu wissen glaubtest. Schrifterz liest über deine Schulter und wird STILL. Der Professor wird NIE still. Das ist das beunruhigendste Zeichen von allen.`,
        character: "🎓 Schrifterz",
        giveItem: "Dealers Geheimnis",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 27: Verbündete
  // ═══════════════════════════════════════════════
  {
    number: 27,
    title: "Verbündete",
    scenes: [
      {
        id: "c27s1",
        text: `Zurück in der Himmelslounge. Die Stimmung ist anders jetzt. Die Sterne über dir scheinen weniger zu glitzern und mehr zu... beobachten. Der Champagner schmeckt nicht mehr nach Triumph, sondern nach Vorbereitung. Denn das hier ist der Moment, in dem du realisierst: Du kannst Kurainu NICHT alleine besiegen.

Du brauchst ein Team. Ein richtiges Team. Nicht nur Crisio, der an der Bar motivierende Reden hält und dabei seinen eigenen Cocktail verschüttet. Nicht nur den Professor, der Servietten vollkritzelt und dabei jede zweite Gleichung mit einem Champagnerfleck ruiniert. Du brauchst ALLE. Crisio, Arindy (die dich seit Floor 2 über ihre Netzwerke unterstützt hat), und Schrifterz. Drei Verbündete. Drei Persönlichkeiten. Drei sehr spezifische Probleme.

"Okay," sagst du und legst die Hände auf den Tisch. "Wir müssen nach Floor 4. Zusammen. Als Team." Crisio verschluckt sich an seinem Drink. Arindy hebt eine Augenbraue über ihren Kommunikator. Der Professor sucht seine Brille. Sie ist auf seinem Kopf. "Klingt nach einem Plan!" sagt der Professor. "Oder nach einer Katastrophe! Beides aufregend!"`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c27s2",
        text: `Arindy meldet sich über den Kommunikator, ihre Stimme knistert durch das kosmische Rauschen von Floor 3. "Du willst mich als Verbündete? Süß. Aber ich riskiere nicht meinen Hals für gute Absichten und ein charmantes Lächeln." Sie hält inne. "Okay, das Lächeln ist ein ARGUMENT, aber nicht genug. Beweis mir, dass du es ernst meinst. Am Pokertisch. Wie echte Erwachsene."

Crisio stellt sich neben dich. "ICH bin auch noch da! Und ich brauche EBENFALLS Überzeugung! Ich meine — ich bin seit Kapitel 1 dabei, ich VERDIENE es, angemessen eingeladen zu werden! Nicht einfach nur 'Hey Crisio, wir gehen den mächtigsten Typen im CRISINO herausfordern, komm mit!' — DAS reicht nicht!"

Also setzt du dich an den Pokertisch. Arindy auf der einen Seite, Crisio auf der anderen. Beide mit verschränkten Armen und dem Blick von Leuten, die ÜBERZEUGT werden wollen. "Jeder will einen Beweis, dass du es ernst meinst," sagt Arindy. "Also ZEIG es uns. Am Tisch. Mit Karten. Wie zivilisierte Zocker."`,
        character: "🍒 Arindy",
        game: { type: "poker", description: "Jeder will einen Beweis dass du es ernst meinst.", reward: 350 },
      },
      {
        id: "c27s3",
        text: `Der Professor sitzt abseits und kramt in seinen Taschen. Er zieht nacheinander hervor: drei Servietten, ein halbes Brötchen, einen Schraubenzieher, eine Batterie, und etwas das aussieht wie ein getrockneter Seestern aber vermutlich eine Antenne ist. "ICH? Ich bin dabei! Natürlich bin ich dabei! Das ist MEIN Chip! Den ich gebaut habe! In meiner Garage! Mit—" "—Schnaps, ja, wir wissen," unterbricht Crisio.

"ABER," der Professor hebt einen Finger, "ich habe ein kleines Problem. Ich habe nämlich... äh... VERGESSEN... was genau mein Plan war." Stille. "Nicht den GANZEN Plan! Nur... die Details. Und die Reihenfolge. Und möglicherweise den Plan selbst." Noch mehr Stille. "ABER ich habe ihn AUFGESCHRIEBEN! Irgendwo! Auf einer Serviette! Oder mehreren! Das Problem ist..." Er schaut auf den Berg Servietten vor sich. "...ich habe SEHR viele Servietten."

Du musst dem Professor helfen, sich an seinen eigenen Plan zu erinnern. Und das geht am besten mit einem Gedächtnistest — denn wenn DU die Informationen findest, kann ER sie zusammensetzen. Hoffentlich. "Hilf dem Professor sich an seinen eigenen Plan zu erinnern!" sagt Crisio sarkastisch. "Das ist wie einen Fisch zum Schwimmen animieren. Der Fisch kann es theoretisch, hat aber vergessen WIE."`,
        character: "🎓 Schrifterz",
        game: { type: "memory", description: "Hilf dem Professor sich an seinen eigenen Plan zu erinnern!", reward: 300 },
      },
      {
        id: "c27s4",
        text: `Die Servietten sind sortiert. Der Plan ist rekonstruiert. Arindy ist überzeugt. Crisio ist motiviert (oder betrunken genug um mutig zu sein, was funktional dasselbe ist). Schrifterz hat seine Gleichungen wieder zusammen und strahlt wie ein Kind am Weihnachtsmorgen — ein Kind das gerade den Bauplan für eine Zeitmaschine geschenkt bekommen hat.

"Das TEAM steht!" Crisio hebt sein Glas. "Auf die verrückteste Gruppe von Idioten, die je versucht hat, das CRISINO zu bezwingen!" Arindy hebt ebenfalls ihr Glas, über den Kommunikator, was logistisch fragwürdig aber emotional einwandfrei ist. Der Professor hebt... eine Serviette. "Auf die WISSENSCHAFT! Und den Schnaps! Und den goldenen Chip! In genau dieser Reihenfolge!"

"Das ist entweder der beste oder der dümmste Plan den ich je gehört habe," sagt Crisio und nimmt einen langen Schluck. "Beides motiviert mich." Er stellt das Glas ab. "Floor 4. Kurainu. Der Goldene Chip." Er atmet tief ein. "Entweder wir kommen als Legenden zurück... oder als sehr unterhaltsame Warnung für alle, die nach uns kommen." Der Professor klatscht begeistert. "BEIDES wäre ein akzeptables Ergebnis! Für die Wissenschaft!"`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 28: Der Hinterhalt
  // ═══════════════════════════════════════════════
  {
    number: 28,
    title: "Der Hinterhalt",
    scenes: [
      {
        id: "c28s1",
        text: `Der Korridor zu Floor 4 ist lang, schmal, und hat die gemütliche Atmosphäre eines U-Boot-Gangs kurz vor der Torpedierung. Die Wände sind aus gebürstetem Stahl, die Beleuchtung ist das absolute Minimum das nötig ist um nicht gegen Wände zu laufen, und irgendwo tropft Wasser. Oder Champagner. Auf Floor 3 kann man nie sicher sein.

Dann gehen die Lichter aus. KOMPLETT. Schwarz wie ein Schwarzes Loch in einem dunklen Raum um Mitternacht. Für drei Herzschläge ist nur Stille. Dann: ROTE LASER. Hunderte davon. Sie schneiden durch die Dunkelheit wie Lichtschwerter auf einer Rave-Party und bilden ein Netz aus Licht, das euch einschließt wie Fliegen in einem Spinnennetz aus Photonen.

"IHR SEID UMZINGELT!" Die Stimme kommt von überall und nirgends gleichzeitig, verstärkt durch Lautsprecher, die so viel Bass haben, dass deine Organe in alphabetischer Reihenfolge vibrieren. "IM NAMEN DES DEALERS! LEGT EURE CHIPS NIEDER! WIDERSTAND IST... naja... MÜHSAM!" Aus den Schatten treten Gestalten — die Elite-Garde Kurainus. Schwarze Anzüge, rote Sonnenbrillen, und jeder einzelne hat die emotionale Wärme eines Tiefkühlschranks.`,
      },
      {
        id: "c28s2",
        text: `Es sind mindestens ein Dutzend. Vielleicht mehr. In der Dunkelheit mit den Lasern ist es schwer zu zählen, und Crisio zählt sowieso nicht mit weil er zu beschäftigt ist, hinter dir in Deckung zu gehen. Der Professor scheint die Situation am WENIGSTEN beunruhigend zu finden — er mustert die Laser mit wissenschaftlichem Interesse und murmelt etwas über "Wellenlängen" und "minderwertige Optik."

Arindy meldet sich über den Kommunikator, und ihre Stimme hat den Tonfall von jemandem, der deutlich Schlimmeres erwartet hatte. "Ich hab mit Schlimmerem gerechnet. Zum Beispiel mit dem Kantinenessen." Eine Pause. "Oder mit der Buchhaltungsabteilung. Die sind WIRKLICH furchteinflößend." Selbst jetzt, EINGEKESSELT von der Elite-Garde des größten Antagonisten des CRISINOs, schafft Arindy es, eine kulinarische Bewertung abzugeben. Das ist eine Art Talent.

Der Anführer der Garde tritt vor. Er ist größer als die anderen, breiter als die anderen, und seine Sonnenbrille ist roter als die anderen. "Kurainu hat eine Nachricht für euch," sagt er mit einer Stimme so tief, dass seismographische Instrumente anschlagen. "Die Nachricht lautet: 'Nein.'" Effizient. Prägnant. Bedrohlich.`,
        character: "🍒 Arindy",
      },
      {
        id: "c28s3",
        text: `Schrifterz tritt vor. Die Garde richtet ihre Laser auf ihn. Er ignoriert sie mit der Gelassenheit eines Mannes, der in seinem Leben deutlich gefährlichere Dinge getan hat — zum Beispiel Quantenphysik-Experimente in einer Garage mit Schnaps. "WARTEN SIE!" ruft er und zieht seine Servietten hervor. "Ich habe einen GEGENVORSCHLAG! Statt Gewalt — die so unelegant ist wie ein Paar Socken in Sandalen — schlage ich vor: ROULETTE!"

Die Garde starrt ihn an. Der Anführer starrt ihn an. ALLE starren ihn an. "ROULETTE?!" wiederholt der Anführer ungläubig. "Das ist ein CASINO!" erklärt der Professor, als wäre das das offensichtlichste Argument der Welt. "Hier wird ALLES am Spieltisch gelöst! Das ist REGEL EINS! Steht wahrscheinlich irgendwo geschrieben! Auf einer meiner Servietten! Gewinne das Ablenkungsmanöver! Drei Wetten, drei Chancen!"

Und dann — weil das CRISINO das CRISINO ist — materialisiert sich tatsächlich ein Roulette-Tisch. Mitten im dunklen Korridor. Zwischen den Lasern. Die Garde schaut verwirrt. Der Anführer schaut auf den Tisch. Auf die Garde. Auf den Tisch. "...FEIN!" sagt er schließlich. "Aber NUR drei Runden!"`,
        character: "🎓 Schrifterz",
        game: { type: "roulette", description: "Gewinne das Ablenkungsmanöver! Drei Wetten, drei Chancen!", reward: 400 },
      },
      {
        id: "c28s4",
        text: `Die Kugel stoppt. Die Garde starrt auf das Ergebnis. Du starrst auf das Ergebnis. ALLE starren auf das Ergebnis. Und dann bricht Chaos aus — aber die GUTE Art von Chaos, die Art, die entsteht wenn ein Plan funktioniert, den niemand wirklich verstanden hat, am wenigsten die Person, die ihn hatte.

Die Garde ist VERWIRRT. Nicht "leicht irritiert" verwirrt, sondern "existentiell desorientiert" verwirrt. Sie schauen sich an, schauen auf den Roulette-Tisch, schauen auf ihre Laser, und scheinen kollektiv zu vergessen, warum sie eigentlich hier sind. Der Professor nutzt den Moment und aktiviert etwas an seinem Oszilloskop — die Lichter flackern, die Laser gehen aus, und ein Notausgang öffnet sich in der Wand, von dem NIEMAND wusste, dass er existiert.

"ICH HAB DEN AUCH GEBAUT!" ruft der Professor, während ihr durch die Öffnung rennt. "VOR 40 JAHREN! FÜR GENAU SOLCHE GELEGENHEITEN!" Crisio rennt als Erster. Arindy dirigiert über den Kommunikator: "Links! LINKS! Nein, EUER links! Seid ihr alle GEOGRAPHISCH HERAUSGEFORDERT?!" Die Garde versucht zu folgen, aber der Roulette-Tisch blockiert den Korridor. Logik ist optional auf Floor 3. Und heute arbeitet sie zu euren Gunsten.`,
        character: "🎓 Schrifterz",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 29: Die Brücke der Entscheidung
  // ═══════════════════════════════════════════════
  {
    number: 29,
    title: "Die Brücke der Entscheidung",
    scenes: [
      {
        id: "c29s1",
        text: `Der Notausgang führt zu einem Ort, der in keinem Grundriss des CRISINOs verzeichnet ist. Vor euch: eine BRÜCKE. Aber nicht irgendeine Brücke — eine Brücke aus durchsichtigem Glas, die sich über einen Abgrund erstreckt, der so tief ist, dass du den Boden nicht sehen kannst. Tatsächlich bist du dir nicht sicher, ob es einen BODEN gibt. Der Abgrund ist einfach... Schwärze. Endlose, samtene, absolute Schwärze. Wie das Universum, bevor jemand beschlossen hat, Sterne hinzuzufügen.

Die Brücke besteht aus einzelnen Glasfliesen, und jede Fliese leuchtet in einem anderen Rhythmus — manche pulsieren langsam wie ein ruhiger Herzschlag, manche flackern hektisch wie eine Diskokugel mit Koffeinsucht. Und hier ist das DETAIL: nicht alle Fliesen sind FEST. Manche sind Hologramme. Perfekte, wunderschöne, absolut überzeugend ECHTE Hologramme. Die nichts tragen. Weil sie nicht DA sind.

Crisio schaut über den Rand und wird SOFORT drei Farbtöne blasser. "Das ist... das ist ein SEHR langer Weg nach unten. Falls es ein 'unten' gibt." Er schluckt. "Und falls nicht, ist es ein SEHR langer Weg ins NICHTS, was irgendwie SCHLIMMER ist."`,
        character: "🦊 Crisio",
      },
      {
        id: "c29s2",
        text: `Schrifterz tritt an den Rand der Brücke und studiert die leuchtenden Fliesen mit der Intensität eines Mannes, der gerade sein eigenes Lebenswerk wiedererkennt — und GLEICHZEITIG realisiert, dass er ein entscheidendes Detail vergessen hat.

"ICH HAB DIE BRÜCKE GEBAUT!" verkündet er mit einer Mischung aus Stolz und Panik. "Vor 30 Jahren! Als Sicherheitsmaßnahme! Nur wer das MUSTER kennt, kommt rüber! Die Hologramm-Fliesen sehen IDENTISCH aus wie die echten, aber sie reagieren auf ein Muster! Ein Muster das ich persönlich entworfen habe! Ein BRILLANTES Muster!" Er strahlt. Dann hört er auf zu strahlen. "Die Lösung ist... äh..." Er kramt in seinen Taschen. Servietten fliegen. "...ich hab sie... äh... VERGESSEN."

Die Stille ist ohrenbetäubend. Crisio starrt den Professor an. Du starrst den Professor an. Selbst der Abgrund scheint zu starren. "Sie haben eine TÖDLICHE Brücke über einen BODENLOSEN Abgrund gebaut... und die Lösung VERGESSEN?!" Crisios Stimme erreicht eine Tonlage die normalerweise Hunden vorbehalten ist. Der Professor zuckt die Schultern mit der Unbeschwertheit eines Mannes, der schon viel Schlimmeres vergessen hat. "Aber DU schaffst das! Du hast ein GEFÜHL für Muster! Ich hab das gesehen! In meinen... äh... in meinem Gefühl!"`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c29s3",
        text: `Die Fliesen leuchten. Sie blinken in einer Sequenz — schnell, wie eine Nachricht in Morsecode, nur schöner und tödlicher. Manche leuchten blau, manche gold, und die Reihenfolge wechselt alle paar Sekunden. Das ist das Muster. Das Muster, das dir zeigt, welche Fliesen ECHT sind und welche dich ins Nichts schicken würden.

"Merk dir das Muster! Tritt nur auf die richtigen Felder!" ruft der Professor von hinten, der sich wohlweislich NICHT auf die Brücke begibt. "Das menschliche Gehirn kann sich durchschnittlich 7 plus minus 2 Elemente merken! Das sind... je nach deinem Gehirn... zwischen 5 und 9! Hoffen wir auf 9! Oder auf ein WUNDER, was statistisch unwahrscheinlicher aber dramaturgisch befriedigender wäre!"

Du atmest tief ein. Die Fliesen blinken. Blau-Gold-Gold-Blau-Gold-Blau-Blau... oder war es Blau-Gold-Blau-Gold-Gold... KONZENTRIERE dich. Dein Leben — oder zumindest dein Fortbestand auf dieser Seite des Abgrunds — hängt von deinem Gedächtnis ab. Der Abgrund wartet geduldig. Er hat Zeit. Er ist ein Abgrund. Das ist sein JOB.`,
        game: { type: "memory", description: "Merk dir das Muster! Tritt nur auf die richtigen Felder!", mustWin: true, reward: 400 },
      },
      {
        id: "c29s4",
        text: `Der letzte Schritt. Dein Fuß berührt die Fliese auf der anderen Seite. Sie leuchtet GOLD — echtes, festes, wunderschönes Gold — und hält. Du stehst auf der anderen Seite. HEIL. Ganz. Unfragmentiert. Die Brücke hinter dir dimmt ihre Lichter, als würde sie dich verabschieden, und die Hologramm-Fliesen flackern ein letztes Mal bevor sie verschwinden.

Crisio RENNT über die Brücke — auf den GLEICHEN Fliesen, auf denen du gerade warst, weil er sich gemerkt hat wo du hingetreten bist, was ehrlich gesagt die cleverste Sache ist, die Crisio je getan hat. Der Professor folgt, wobei er gleichzeitig rennt und Notizen macht, was in einer Koordinationsleistung resultiert, die nur durch jahrzehntelange Übung im Multitasking-Wahnsinn möglich ist.

Vor euch: eine Tür. Nicht irgendeine Tür — DIE Tür. Massiv, aus einem Material das aussieht wie verdichtetes Sternenlicht, mit einer einzelnen Kartenöffnung in der Mitte. Darüber, in Buchstaben die langsam zwischen Gold und Rot wechseln: "FLOOR 4 — NUR FÜR AUTORISIERTES PERSONAL. UND FÜR WAHNSINNIGE MIT EINER SCHLÜSSELKARTE." In der Kartenöffnung blinkt ein Licht. Grün. Wartend. Der Professor grinst. "Ich hab die Tür AUCH gebaut! Und die Schlüsselkarte generiert sich automatisch für jeden, der die Brücke überquert!" Er hält inne. "...hoffe ich. Es sind 30 Jahre vergangen. Software-Updates gab es keine."`,
        character: "🎓 Schrifterz",
        giveItem: "Schlüsselkarte Floor 4",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 30: BOSS — Die Zwillinge
  // ═══════════════════════════════════════════════
  {
    number: 30,
    title: "BOSS: Die Zwillinge",
    scenes: [
      {
        id: "c30s1",
        text: `Die Schlüsselkarte gleitet in den Slot. Ein Summen. Ein Klicken. Die Tür schwingt auf — und dahinter steht nicht Kurainu. Noch nicht. Stattdessen stehen dort ZWEI Personen, und sie sind so identisch, dass dein Gehirn kurz einen Neustart macht. Dieselbe Größe, dieselbes Gesicht, dieselbe makellose Eleganz. Aber die FARBEN: einer trägt Weiß — strahlend, blendend, fast schmerzhaft weiß, von den Schuhen über den Anzug bis zum Zylinder. Der andere trägt Schwarz — so tief und absolut schwarz, dass er die Schatten um sich herum dunkler macht.

Sie stehen symmetrisch, wie eine Reflexion an einer unsichtbaren Achse, und als sie sprechen, tun sie es abwechselnd, wie ein perfekt choreographiertes Duett: "Ich bin Glück." Weiß. "Und ich bin Pech." Schwarz. "Einer von uns sagt immer die Wahrheit." "Und einer lügt immer." Sie lächeln. Gleichzeitig. Dasselbe Lächeln. Auf denselben Gesichtern. "Oder lügen wir BEIDE gerade?" Pause. "Wer weiß?" Beide zucken die Schultern. SYNCHRON.

Schrifterz — der ECHTE Glück, mit Laborkittel und Champagnerfleck — wird KREIDEBLEICH. "Oh nein. Die ZWILLINGE. Ich hab gehofft, Kurainu hat sie nicht gefunden..." Er schluckt. "Sie sind... naja... sie sind NICHT von hier. Und mit 'hier' meine ich... die Realität. Mehr oder weniger."`,
        character: "🎓 Schrifterz",
      },
      {
        id: "c30s2",
        text: `Die Zwillinge setzen sich an einen Pokertisch — gleichzeitig, spiegelverkehrt, mit der Präzision von Uhren die aus derselben Fabrik kommen. Glück auf der linken Seite, Pech auf der rechten. Oder umgekehrt. Das ist ja das PROBLEM — man weiß es nie.

"Wir teilen uns eine Hand," erklärt Glück (Weiß). Oder ist es Pech? "Einer von uns spielt." "Der andere berät." "Aber WESSEN Rat kannst du trauen?" Sie lachen. Synchron. Exakt derselbe Ton, dieselbe Länge, derselbe Zeitpunkt. Es ist das Unheimlichste, das du je gehört hast, und du hast Crisios Karaoke-Abend überlebt.

Crisio tritt nervös von einem Fuß auf den anderen. "Können die... LESEN sie sich gegenseitig? Wissen die was der andere denkt?" Glück und Pech drehen sich GLEICHZEITIG zu Crisio und sagen im Chor: "JA." Dann: "NEIN." Dann wieder: "VIELLEICHT." Und dann, als wäre es das Natürlichste der Welt: "Willst DU es herausfinden?" Crisio: "NEIN. Definitiv NEIN. Hundertprozentig NEIN."`,
        character: "🦊 Crisio",
      },
      {
        id: "c30s3",
        text: `Die Karten werden ausgeteilt. Glück mischt — oder Pech mischt. Beide berühren das Deck gleichzeitig, und die Karten fliegen zwischen ihren Händen hin und her wie Schwalben zwischen zwei identischen Türmen. Das Mischen ist so elegant, so perfekt, dass es UNMÖGLICH scheint, und gleichzeitig so selbstverständlich wie Atmen.

"Schlage uns BEIDE!" sagen sie im Chor, und ihre identischen Lächeln werden zu identischen Grinsen. "Wenn du KANNST..." Synchrones Lachen. Es klingt wie ein einzelner Mensch, der ZWEIMAL gleichzeitig lacht, was physikalisch unmöglich ist aber emotional verheerend. Der Professor flüstert dir zu: "Der Trick ist: IGNORIERE ihre Ratschläge! Oder FOLGE ihnen! Oder tue BEIDES! Quantenlogik — tu zwei Dinge gleichzeitig und hoffe auf das BESSERE Ergebnis!"

Die erste Karte landet vor dir. Die Zwillinge nicken. Einer nickt ermutigend. Der andere nickt warnend. Oder BEIDE nicken ermutigend. Oder BEIDE nicken warnend. Verdammt. "Das Spiel beginnt," flüstern sie. "Und mit ihm... alles."`,
        boss: {
          name: "Glück & Pech",
          emoji: "🎭",
          game: "poker",
          reward: 800,
          dialog: "Schlage uns beide! Wenn du kannst... *synchrones Lachen*",
        },
      },
      {
        id: "c30s4",
        text: `Die letzte Karte liegt auf dem Tisch. Glück und Pech starren darauf — zum ERSTEN Mal nicht synchron. Weiß schaut nach links, Schwarz schaut nach rechts, und für einen Moment — einen einzigen, kristallklaren Moment — sind sie zwei verschiedene Menschen mit zwei verschiedenen Reaktionen. Überraschung bei dem einen. Respekt bei dem anderen. Oder umgekehrt. Wie immer.

Dann stehen sie auf. Gleichzeitig, natürlich. Aber diesmal anders. Sie gehen aufeinander zu. Langsam, feierlich, wie zwei Hälften die sich erinnern, dass sie zusammengehören. Ihre Konturen beginnen zu verschwimmen — Weiß fließt in Schwarz, Schwarz fließt in Weiß — und wo gerade noch ZWEI Menschen standen, steht jetzt nur noch EINER. Ein Mensch in Grau. Perfektes Grau. Die Mischung aus allem und nichts.

"Wir waren nie zwei," sagt die Stimme — eine einzelne Stimme, die trotzdem wie ein Chor klingt. "Glück und Pech sind zwei Seiten derselben Münze. Man kann sie nicht trennen. Man kann sie nicht unterscheiden. Man kann sie nur AKZEPTIEREN." Die Gestalt in Grau greift in die Luft und zieht eine Münze hervor — halb gold, halb silber, die Naht dazwischen so fein, dass sie nur im richtigen Licht sichtbar ist. "Für dich. Für den Weg nach oben. Denn auf Floor 4..." Ein Lächeln, das weder Glück noch Pech gehört, sondern BEIDEN. "...wirst du beides brauchen."

Die Gestalt löst sich auf. Wie Rauch. Wie ein Traum. Wie eine Erinnerung an etwas, das gleichzeitig passiert und nie stattgefunden hat. Zurück bleibt die Münze in deiner Hand. Sie ist warm UND kalt. Gleichzeitig. Natürlich.`,
        giveItem: "Münze von Glück & Pech",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // ACT 4: "DAS FINALE" (Chapters 31-40)
  // ═══════════════════════════════════════════════

  // ═══════════════════════════════════════════════
  // CHAPTER 31: Das Penthouse
  // ═══════════════════════════════════════════════
  {
    number: 31,
    title: "Das Penthouse",
    scenes: [
      {
        id: "c31s1",
        text: `Floor 4. Die Aufzugtüren öffnen sich — und du wirst GEBLENDET. Nicht metaphorisch. BUCHSTÄBLICH. Alles ist GOLD. Die Wände: Gold. Der Boden: Gold. Die Decke: Gold, mit einem Kronleuchter aus — du ahnst es — NOCH MEHR GOLD. Selbst die Luft scheint golden, als würde jemand Goldstaub durch die Belüftung blasen. Was wahrscheinlich genau das ist, was passiert.

Crisio setzt seine Sonnenbrille auf. "Alter. Das ist... das ist wie der Goldrausch und Versailles ein Kind bekommen hätten, das komplett den Verstand verloren hat." Er berührt die Wand. "Ist das ECHTES Gold?!" Pause. "Natürlich ist das echtes Gold. Warum frage ich überhaupt."

Dann — eine Stimme. Von überall und nirgendwo gleichzeitig. Ruhig, samtweich, mit einem Hauch von Belustigung. Wie jemand, der einen Witz kennt, den der Rest der Welt noch nicht verstanden hat.

"Willkommen in meinem bescheidenen Zuhause."`,
      },
      {
        id: "c31s2",
        text: `Du drehst dich um. Einmal. Zweimal. Die Stimme hat keinen Ursprung — sie IST der Raum. Oder der Raum ist sie. Was auch immer das bedeutet.

Dann bemerkt Crisio die Bildschirme. Dutzende, eingelassen in die goldenen Wände, so nahtlos, dass sie wie magische Fenster wirken. Und auf jedem Bildschirm: DU. Dein erster Münzwurf mit Crisio. Dein Poker gegen Sam den Schakal. Der Moment, als du den USB-Stick von Arindy bekommen hast. Jeder Kampf, jede Entscheidung, jede Niederlage und jeder Sieg — in kristallklarer Auflösung, aus Winkeln, die UNMÖGLICH sein sollten.

"Ich habe jede Sekunde gesehen," sagt die Stimme. Kein Triumph, keine Drohung — nur eine Feststellung. Wie jemand, der das Wetter beschreibt. "Jede Karte, die du gespielt hast. Jede Münze, die du geworfen hast. Jedes Risiko, das du eingegangen bist. Beeindruckend. Wirklich."

Crisio: "Das ist entweder schmeichelhaft oder EXTREM gruselig." Pause. "Okay, hauptsächlich gruselig."`,
        character: "🦊 Crisio",
      },
      {
        id: "c31s3",
        text: `Die Stimme lacht leise. Ein warmes Lachen, das nicht zu einem Schurken passt. "Bevor wir uns treffen... zeig mir, dass du es verdienst. Ein letztes Spiel, bevor die goldene Tür sich öffnet."

Ein Spielautomat fährt aus dem Boden — natürlich aus purem Gold, mit Walzen, die wie geschmolzenes Sonnenlicht leuchten. Jedes Symbol darauf: ein Moment deiner Reise. Crisio als Symbol. Der Chip. Die Münze von Glück & Pech. Dein eigenes Gesicht.

"Die Einsätze sind hoch. Aber das waren sie immer, oder?"`,
        game: { type: "slots", description: "Der goldene Automat — High Stakes im Penthouse Kurainus!", mustWin: true, reward: 500 },
      },
      {
        id: "c31s4",
        text: `Die Walzen stoppen. JACKPOT. Das Gold um dich herum pulsiert, als würde das Penthouse selbst applaudieren. Und dann — ein Geräusch wie ein uraltes Schloss, das nach Jahrhunderten zum ersten Mal geöffnet wird.

Eine goldene Tür, die du vorher NICHT gesehen hast — weil sie Teil der Wand war, perfekt getarnt, unsichtbar bis zu diesem Moment — gleitet langsam zur Seite. Dahinter: gedämpftes Licht, der Duft von altem Leder und teurem Whiskey, und etwas anderes... etwas, das sich anfühlt wie SCHICKSAL. Oder Mottenkugeln. Manchmal ist beides schwer zu unterscheiden.

"Gut." Die Stimme, näher jetzt, fast greifbar. "Komm rein."

Crisio schluckt. Du schluckst. Sogar die goldenen Wände scheinen den Atem anzuhalten.`,
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 32: Die letzte Mahlzeit
  // ═══════════════════════════════════════════════
  {
    number: 32,
    title: "Die letzte Mahlzeit",
    scenes: [
      {
        id: "c32s1",
        text: `Crisio hat die Küche gefunden. Natürlich hat er die Küche gefunden. In einem Penthouse voller goldener Geheimnisse, versteckter Räume und kosmischer Mysterien hat Crisio — mit der unfehlbaren Intuition eines Mannes, der Prioritäten hat — die KÜCHE gefunden. Und nicht irgendeine Küche: eine goldene Profi-Küche mit Geräten, von denen die meisten noch nicht einmal erfunden sein sollten.

"Wenn das unser letztes Abenteuer ist, dann mit vollem Magen!" verkündet er, während er eine Schürze anzieht, die verdächtig nach Kurainu riecht — Sandelholz und Macht. Er wirbelt ein Messer durch die Luft wie ein Koch-Ninja und beginnt, Zutaten aus goldenen Schränken zu ziehen. "Flambiertes Steak auf Trüffel-Risotto mit Goldblatt-Garnierung? Oder Lobster Thermidor mit Champagner-Schaum? Oder BEIDES? Beides. Definitiv beides."

Irgendwo im Hintergrund seufzt die Stimme Kurainus. Fast... amüsiert.`,
        character: "🦊 Crisio",
      },
      {
        id: "c32s2",
        text: `Der Tisch ist gedeckt. Goldenes Geschirr — offensichtlich. Aber die Gesellschaft ist das Bemerkenswerte: Crisio am Kopfende, mit einer Kochmütze aus einer goldenen Serviette. Wolfkampf — JA, BRUTUS, der Türsteher — sitzt am anderen Ende und liest Kierkegaard. Mit einer Lesebrille. Er sieht aus wie ein philosophischer Grizzlybär auf einem Buchclub-Treffen.

"Die Absurdität des gemeinsamen Essens vor dem Ungewissen," murmelt Wolfkampf, ohne aufzusehen. "Camus hätte das gemocht." Er nimmt einen Bissen Risotto. Seine Augen werden feucht. "Das... das ist das Beste, was ich je gegessen habe." Crisio strahlt: "ENDLICH erkennt jemand mein Talent!"

${"`"}Und da ist noch jemand — je nachdem, wen du als Verbündeten gewonnen hast, sitzt hier entweder Arindy, die nervös an ihrem Champagner nippt, oder Schrifterz, der mit einer Gabel auf dem Teller Gleichungen zeichnet. Oder beide. Das Penthouse hat genug Stühle.${"`"}

Ein seltsamer Moment der Ruhe. Vor dem Sturm.`,
        character: "🦊 Crisio",
      },
      {
        id: "c32s3",
        text: `Crisio steht auf. Er hält sein Glas hoch — gefüllt mit etwas, das in sieben Farben gleichzeitig leuchtet und physikalisch nicht stabil sein kann. "Leute. LEUTE. Hört mal zu. Egal was hinter dieser goldenen Tür passiert — ob wir den Chip kriegen, ob wir die Welt retten, ob wir irgendeine kosmische Wahrheit entdecken oder nur rausfinden dass Kurainu eigentlich ein netter Typ ist der Brettspielabende macht —" Er stockt. Seine Stimme wird leiser, ehrlicher. "— es war verdammt gut. Das hier. Wir. Diese ganze verrückte Reise."

Wolfkampf legt Kierkegaard beiseite. Zum ERSTEN MAL. Das allein ist historisch.

"Also..." Crisio hebt sein Glas höher. "Worauf trinken wir?"`,
        character: "🦊 Crisio",
        choice: {
          prompt: "Crisios Toast — worauf trinken wir?",
          options: [
            { id: "friendship", text: "🥂 \"Auf die Freundschaft!\" — Das Wichtigste ist, wer neben dir steht" },
            { id: "victory", text: "🏆 \"Auf den Sieg!\" — Wir sind hier um zu gewinnen" },
          ],
        },
      },
      {
        id: "c32s4",
        text: `Die Gläser klingen. Der Ton hallt durch das goldene Penthouse, länger als er sollte, als würde das Gebäude selbst die Resonanz halten.

Crisio setzt sich wieder hin. Langsam. Und dann — etwas, das du in all der Zeit, die du ihn kennst, noch NIE gesehen hast: Crisio wird still. Nicht seine übliche "dramatische Pause vor dem nächsten Witz"-Stille, sondern echte, aufrichtige, ungefilterte Stille.

"Egal was passiert..." sagt er leise, und seine Stimme hat dieses Zittern, das man nur hat, wenn man etwas MEINT. Wirklich meint. Jedes Wort. "...es war mir eine Ehre, dein Barkeeper zu sein."

Er schluchzt. In den Cocktail-Shaker. Laut. Unkontrolliert. Wolfkampf reicht ihm wortlos ein Taschentuch. Es ist das Zarteste, was diese gigantischen Hände jemals getan haben.

"Tschuldigung," nuschelt Crisio und putzt sich die Nase. "Hab wohl zu viel Zwiebeln geschnitten. Für das Risotto. Ja. Die Zwiebeln. Definitiv die Zwiebeln."

Niemand korrigiert ihn. Weil alle es wissen. Und weil alle es fühlen.`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 33: Der Spiegelsaal
  // ═══════════════════════════════════════════════
  {
    number: 33,
    title: "Der Spiegelsaal",
    scenes: [
      {
        id: "c33s1",
        text: `Hinter der Küche — warum ist hinter der Küche ein SPIEGELSAAL? Weil Kurainu offensichtlich Interior-Design-Entscheidungen trifft wie ein Bond-Bösewicht mit unbegrenztem Budget — erstreckt sich ein Raum, der dein Gehirn sofort in den Fehlermodus versetzt.

Spiegel. ÜBERALL Spiegel. Aber nicht normale Spiegel, die einfach nur reflektieren, was vor ihnen steht. Diese Spiegel zeigen... ANDERES.

Im ersten Spiegel siehst du dich selbst — aber eine Version von dir, die Sam dem Schakal gefolgt ist. Dunkler Anzug, kalte Augen, ein Imperium aus Betrug. Diese Version lacht nicht. Diese Version HERRSCHT.

Im zweiten Spiegel: eine Version, die nie das CRISINO betreten hat. Normales Leben, normaler Job, normale Langeweile. Diese Version sieht zufrieden aus. Aber auch... leer.

Crisio starrt in einen Spiegel und sieht sich selbst als Sternekoch. Er weint wieder. "DAS HÄTTE ICH SEIN KÖNNEN!"`,
        character: "🦊 Crisio",
      },
      {
        id: "c33s2",
        text: `Aber ein Spiegel — ganz am Ende des Saals, größer als die anderen, mit einem Rahmen aus schwarzem Gold — zeigt etwas, das dein Blut gefrieren lässt.

DU. Aber als der DEALER. Du trägst die Maske. Du sitzt auf dem goldenen Thron. Und du bist ALLEIN. Komplett, absolut, kosmisch allein. Kein Crisio. Kein Verbündeter. Niemand. Nur du und ein Casino, das sich bis ins Unendliche erstreckt.

Daneben ein weiterer Spiegel, kleiner, fast versteckt: Du als normaler Mensch. Ohne Chip, ohne Casino, ohne Legende. Du sitzt auf einer Parkbank und fütterst Tauben. Und lächelst. Einfach so.

Crisio: "Okay, ich weiß nicht, welcher gruseliger ist. Der, wo du ein einsamer Diktator bist, oder der mit den Tauben."

Wolfkampf, der in seinen eigenen Spiegel starrt (in dem er als Philosophie-Professor doziert): "Jede Reflexion ist eine Möglichkeit. Sartre sagt: 'Wir sind unsere Entscheidungen.' Die Spiegel zeigen nur, was wir HÄTTEN entscheiden können."`,
        character: "🐻 Wolfkampf",
      },
      {
        id: "c33s3",
        text: `In der Mitte des Spiegelsaals steht ein Spielautomat. Natürlich. Aber dieser ist anders — seine Walzen sind aus SPIEGEL-MATERIAL, und jede Walze zeigt ein anderes Schicksal. Eine andere Version von dir. Eine andere Realität.

"Jede Walze zeigt ein anderes Schicksal," flüstert die Stimme Kurainus, als hätte er deine Gedanken gelesen. Oder als hätte er diesen Automaten GENAU dafür gebaut. "Drei gleiche Schicksale auf einer Linie — und du begreifst, was der Chip wirklich ist."

Der Automat summt. Die Spiegelwalzen drehen sich, und in jeder Reflexion siehst du ein anderes Gesicht — deins, aber anders. Glücklicher. Trauriger. Mächtiger. Freier. Alles gleichzeitig.`,
        game: { type: "slots", description: "Der Schicksals-Automat — jede Walze zeigt ein anderes Universum!", reward: 400 },
      },
      {
        id: "c33s4",
        text: `Die Walzen stoppen. Drei identische Bilder: DU. Genau DU, wie du JETZT bist. Nicht Kurainu, nicht der Taubenfütterer, nicht der Gangster. DU.

Und in diesem Moment VERSTEHST du es. Der Chip ändert nicht das Glück. Er ändert die REALITÄT. Jeder Wurf, jede Karte, jede Entscheidung — sie alle erschaffen neue Zeitlinien, neue Möglichkeiten, neue Versionen von dir. Und der Chip? Er lässt dich WÄHLEN, in welcher Version du landest.

"Das ist... größer als ich dachte," flüsterst du.

Die Spiegel um dich herum beginnen zu vibrieren. Leise zuerst, dann lauter. Wie ein Herzschlag.

Crisio: "Okay, wenn die Spiegel jetzt zerbrechen und irgendwelche Horror-Versionen von uns rausklettern, BIN ICH RAUS."

Sie zerbrechen nicht. Stattdessen werden sie langsam transparent. Und dahinter siehst du: den nächsten Raum. Und was darin wartet.`,
        giveItem: "Schicksals-Erkenntnis",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 34: Countdown
  // ═══════════════════════════════════════════════
  {
    number: 34,
    title: "Countdown",
    scenes: [
      {
        id: "c34s1",
        text: `ALARM. ROTER ALARM. Das goldene Penthouse verwandelt sich in eine DISCO DER PANIK — rote Lichter blitzen, Sirenen heulen, und eine mechanische Stimme, die klingt wie ein GPS-Navi das einen Nervenzusammenbruch hat, dröhnt durch den Raum:

"SICHERHEITSPROTOKOLL AKTIVIERT! PENTHOUSE WIRD IN 5 MINUTEN GESPERRT! ALLE NICHT AUTORISIERTEN PERSONEN WERDEN... ähm... HÖFLICH GEBETEN ZU GEHEN! ODER AUCH NICHT HÖFLICH! DAS SYSTEM IST DA FLEXIBEL!"

Crisio: "WAS?! FÜNF MINUTEN?!"
Wolfkampf: "Die Uhr als ultimativer Existenztest. Heidegger nannte es 'Sein zum Tode'. Ich nenne es 'Dienstag'."

Drei Sicherheitsschleusen fahren herunter. Drei goldene Tore zwischen dir und Kurainu. Drei Spiele. Fünf Minuten. Kein Druck.`,
        character: "🦊 Crisio",
      },
      {
        id: "c34s2",
        text: `Erste Schleuse. Ein gigantischer Münzwurf-Mechanismus — wie ein Flipperautomat, nur ERNST. Die Münze ist so groß wie ein Wagenrad und dreht sich bereits in der Luft, funkelnd wie ein goldener Planet.

"SCHNELL! Erste Sicherung umgehen!" brüllt Crisio und schiebt dich nach vorne.

Wolfkampf: "Die Münze als binäres Schicksal. Kopf oder Zahl. Sein oder Nichtsein." Crisio: "BRUTUS, JETZT IST NICHT DIE ZEIT FÜR PHILOSOPHIE!" Wolfkampf: "Es ist IMMER die Zeit für Philosophie." Crisio: "ICH HASSE DICH!" Wolfkampf: "Das ist auch eine philosophische Position."`,
        character: "🦊 Crisio",
        game: { type: "flip", description: "Erste Sicherung — schneller Münzwurf gegen die Uhr!", reward: 200 },
      },
      {
        id: "c34s3",
        text: `GESCHAFFT! Die erste Schleuse öffnet sich. Weiter! Zweite Sicherung — und hier wird es ABSURD. Vor dir steht ein gigantischer Rubbellos-Mechanismus. Goldene Flächen, die freigerubbelt werden müssen. Als SICHERHEITSSYSTEM.

"Rubbellos-Mechanismus?! WER BAUT SO ETWAS?!" schreit Crisio, während die Sirenen weiter heulen.

Wolfkampf, vollkommen ruhig: "Jemand mit Humor." Crisio: "DAS IST KEIN HUMOR! DAS IST WAHNSINN!" Wolfkampf: "Ist das nicht dasselbe?"

Die mechanische Stimme meldet sich: "NOCH 3 MINUTEN! DAS SYSTEM EMPFIEHLT: SCHNELLER RUBBELN! TIPP: VON LINKS NACH RECHTS! ODER AUCH NICHT! DAS SYSTEM GIBT ZU DASS ES KEINE AHNUNG HAT!"`,
        character: "🦊 Crisio",
        game: { type: "scratch", description: "Zweite Sicherung — Rubbellos gegen die Zeit! WER BAUT SO ETWAS?!", reward: 300 },
      },
      {
        id: "c34s4",
        text: `ZWEITE SCHLEUSE OFFEN! Die letzte Sicherung. Ein Würfeltisch — aber nicht irgendein Würfeltisch. Die Würfel SCHWEBEN. Über dem Tisch, in einem goldenen Magnetfeld, rotieren sie langsam wie kleine, kubische Planeten. Der Tisch zeigt die Zahl 21.

"LETZTE SICHERUNG! WÜRFLE ALS OB DEIN LEBEN DAVON ABHÄNGT!" kreischt Crisio. "TUT ES QUASI!"

Die mechanische Stimme: "NOCH 90 SEKUNDEN! DAS SYSTEM MÖCHTE ANMERKEN DASS ES NICHTS PERSÖNLICHES IST! ES FOLGT NUR PROTOKOLLEN! BITTE HINTERLASSEN SIE EINE POSITIVE BEWERTUNG!"

Wolfkampf steht auf, legt Kierkegaard weg, und KNACKT seine Knöchel. "Falls die Würfel nicht reichen... habe ich einen Plan B." Er schaut auf die Schleuse. Die Schleuse schaut zurück. Sie WEISS was Plan B ist. "Aber versuchen wir es erstmal mit Würfeln."`,
        character: "🐻 Wolfkampf",
        game: { type: "dice21", description: "Letzte Sicherung — WÜRFLE ALS OB DEIN LEBEN DAVON ABHÄNGT!", mustWin: true, reward: 400 },
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 35: Der Verräter
  // ═══════════════════════════════════════════════
  {
    number: 35,
    title: "Der Verräter",
    scenes: [
      {
        id: "c35s1",
        text: `Die letzte Schleuse öffnet sich. Dahinter: das innere Sanktuarium Kurainus. Ein kreisrunder Raum, die Wände aus dunklem Gold — nicht das gleißende Gold des Penthouses, sondern ein älteres, ehrwürdigeres Gold. Wie in einem Pharaonengrab. In der Mitte: ein einzelner Spieltisch, darüber ein Lichtkegel, der alles andere im Schatten lässt.

Aber bevor du den Tisch erreichst — eine Bewegung im Schatten. Jemand tritt hervor. Langsam, theatralisch, wie jemand der diesen Moment GEPLANT hat. Lange geplant. Und jetzt GENIESST.

Crisio erstarrt. "Nein..."
Wolfkampf legt sein Buch weg. "Ah. Der Plot-Twist."

Eine Gestalt im Lichtkegel. Ein Gesicht, das du KENNST.`,
        character: "🦊 Crisio",
      },
      {
        id: "c35s2_cooperate",
        text: `Arindy tritt aus dem Schatten. Aber nicht die Arindy, die du kennst. Diese Arindy trägt kein Rot — sie trägt GOLD. Das Kleid, die Schuhe, sogar der Lippenstift. Und ihr Blick... kalt. Berechnend. Der Blick von jemandem, der die ganze Zeit drei Schritte voraus war.

"Sorry." Sie sagt es ohne jede Reue. Mit einem Lächeln, das gleichzeitig charmant und erschreckend ist. "Mein wahrer Auftraggeber ist Kurainu. Immer gewesen." Sie zieht Handschellen hervor — goldene, natürlich. "Die Handschellen? Waren für DICH. Von Anfang an."

Crisio: "DU?! Aber wir haben zusammen gekocht! Du hast mein Risotto gelobt!"
Arindy: "Das Risotto WAR gut. Das ändert nichts an meiner Mission."
Crisio: "ES ÄNDERT ALLES! VERRÄTER-RISOTTO SCHMECKT ANDERS! ICH WERDE ES NIE WIEDER KOCHEN!"

Arindy seufzt. "Dramatisch wie immer, Crisio." Sie dreht sich zu dir. "Aber die Handschellen sind ECHT. Und das hier —" sie zeigt auf den Roulette-Tisch, der aus dem Boden fährt "— ist deine letzte Chance."`,
        character: "🍒 Arindy",
        nextScene: "c35s3",
      },
      {
        id: "c35s2_solo",
        text: `Schrifterz tritt aus dem Schatten. Aber nicht der zerstreute, champagnerfleckige Professor, den du kennst. Dieser Glück steht AUFRECHT. Kein Zittern, keine Zerstreutheit, keine verschütteten Getränke. Seine Augen sind klar und scharf wie Diamanten.

"Überraschung." Er lächelt. Ein Lächeln, das NICHT zu einem verrückten Professor gehört. "Ich hab den Chip GEBAUT. Und Kurainu?" Er macht eine Geste in Richtung des Schattens hinter dem Spieltisch. "Er ist mein SOHN."

STILLE. Absolute, totale, kosmische Stille. Selbst die Sirenen halten die Klappe.

Crisio: "DEIN— WAS?! DEIN SOHN?!"
Professor: "Quantenphysik vererbt sich offensichtlich. Zusammen mit dem Hang zur Dramatik."
Wolfkampf: "Das erklärt... tatsächlich einiges."
Professor: "Der Chip war nie ein Spielzeug. Er war ein EXPERIMENT. Und DU —" er zeigt auf dich "— warst die Testperson. Von Anfang an."

Er deutet auf den Roulette-Tisch, der aus dem Boden fährt. "Aber ich gebe dir eine faire Chance. Gewinne, und du darfst weitergehen. Verliere..." Er zuckt die Schultern. "Naja."`,
        character: "🎓 Schrifterz",
        nextScene: "c35s3",
      },
      {
        id: "c35s3",
        text: `Der Roulette-Tisch dreht sich. Golden — natürlich golden — aber mit einer Besonderheit: die Zahlen auf dem Rad sind nicht 0 bis 36. Es sind DATEN. Momente deiner Reise. Der Tag, an dem du das CRISINO betreten hast. Der Moment deines ersten Gewinns. Die Nacht, in der du Sam besiegt hast. Jede Zahl ist eine Erinnerung.

"Gewinne oder der Verräter nimmt ALLES!" Die Worte hängen in der goldenen Luft wie ein Urteil.

Die Kugel rollt. Sie klingt wie ein Herzschlag — tick, tick, tick — und jedes Mal, wenn sie eine Zahl berührt, blitzt die entsprechende Erinnerung auf den Wänden auf. Dein Leben, zusammengefasst in der Rotation einer goldenen Kugel auf einem goldenen Rad in einem goldenen Raum.

Crisio klammert sich an seinen Cocktail-Shaker wie an einen Rettungsring. Wolfkampf hat die Augen geschlossen. Nicht aus Angst — aus RESPEKT. Vor dem Moment. Vor dem Spiel. Vor dem Schicksal.`,
        game: { type: "roulette", description: "Gewinne gegen den Verräter — oder verliere ALLES!", mustWin: true, reward: 500 },
      },
      {
        id: "c35s4",
        text: `Die Kugel stoppt. Auf DEINER Zahl. Deinem Moment. Dem Moment, der alles angefangen hat.

Der Verräter — ob Arindy oder der Professor — sieht auf das Ergebnis. Und etwas verändert sich in ihrem Blick. Kein Zorn. Kein Frust. Etwas... Tieferes.

"Du bist stärker als ich dachte." Leise. Fast ein Flüstern. Und darin liegt etwas, das verdächtig nach Respekt klingt. Oder Trauer. Oder beides.

Sie treten zurück. Aus dem Licht. Zurück in den Schatten, wo sie hergekommen sind. Aber bevor sie verschwinden, noch ein letztes Wort: "Kurainu wartet. Und er ist..." Eine Pause, die schwerer wiegt als alles Gold in diesem Raum. "...nicht das, was du erwartest."

Dann: Stille. Nur du, deine Verbündeten, und eine goldene Tür, die sich langsam öffnet.

Crisio, flüsternd: "Ich brauche einen VIEL stärkeren Drink nach dem hier."`,
        character: "🦊 Crisio",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 36: Die Pforte
  // ═══════════════════════════════════════════════
  {
    number: 36,
    title: "Die Pforte",
    scenes: [
      {
        id: "c36s1",
        text: `Vor dir: eine Tür. Aber nicht irgendeine Tür. DIE Tür. Massiv, golden, so hoch, dass die Oberkante im Dunkel verschwindet. Und darauf — eingraviert in das Metall mit einer Präzision, die entweder Laser-Technologie oder göttliche Intervention erfordert — ein 9x9-Zahlenraster. Ein SUDOKU. Als Türschloss.

Schrifterz — oder sein Geist, seine Erinnerung, sein Echo, je nachdem wie man zu dem Verrat steht — hätte sofort gewusst, was das ist: "Der Sudoku-Code! Die letzte Barriere!"

Die Zahlen leuchten sanft, einige Felder leer, wartend auf die richtige Lösung. Neben dem Raster ein kleiner goldener Bildschirm mit der Nachricht: "DIE LÖSUNG IST DER TÜRCODE. KEINE FEHLER ERLAUBT. KEIN RADIERGUMMI. KEIN 'ICH FRAGE MAL GOOGLE'. DAS SYSTEM MEINT ES ERNST."

Crisio: "Ein SUDOKU? Das letzte Hindernis vor dem mächtigsten Wesen im Casino ist ein SUDOKU?!" Wolfkampf: "Die Eleganz der Einfachheit."`,
        character: "🦊 Crisio",
      },
      {
        id: "c36s2",
        text: `Wolfkampf betrachtet die Tür. Dann die Angeln. Dann die Wand daneben. Sein Blick sagt: "Ich KÖNNTE." Seine Fäuste sagen: "Ich SOLLTE." Sein Verstand sagt: etwas anderes.

"Ich würde die Tür eintreten," sagt Wolfkampf langsam, und jedes Wort klingt wie ein Kompromiss zwischen seinem Körper und seiner Seele. "Aber..." Er atmet tief. Man kann förmlich sehen, wie Philosophie gegen Muskelkraft kämpft. "...ich respektiere den Prozess."

Crisio starrt ihn an. "Seit wann respektierst du TÜREN?"
Wolfkampf: "Seit ich Wittgenstein gelesen habe. 'Wovon man nicht sprechen kann, darüber muss man schweigen.' Und wovon man nicht eintreten kann..." Er deutet auf das Sudoku. "...darüber muss man nachdenken."

Crisio: "Das... das ergibt überhaupt keinen Sinn."
Wolfkampf: "Philosophie muss keinen Sinn ergeben. Sie muss nur WEH TUN." Pause. "Emotional. Nicht physisch. Physisch ist meine Abteilung."`,
        character: "🐻 Wolfkampf",
      },
      {
        id: "c36s3",
        text: `Du trittst an das Raster. 81 Felder. 9 Blöcke. Eine Lösung. KEINE Fehler. Die Gravur leuchtet unter deinen Fingern, als du die erste Zahl eingibst. Das Gold pulsiert — zustimmend? Warnend? Unmöglich zu sagen.

"Die Lösung IST der Türcode. Keine Fehler erlaubt!" erinnert dich das System mit übertriebener Freundlichkeit. "TIPP: DIE ZAHLEN 1-9 KOMMEN IN JEDER REIHE, SPALTE UND BLOCK GENAU EINMAL VOR! DAS SYSTEM WEISS, DASS SIE DAS WISSEN! ES SAGT ES TROTZDEM! FÜR DIE ATMOSPHÄRE!"

Crisio hält den Atem an. Wolfkampf schließt sein Buch — ENDGÜLTIG. Sogar das Penthouse scheint stiller zu werden, als würde das Universum selbst darauf warten, dass du dieses letzte Rätsel löst.`,
        game: { type: "sudoku9", description: "Der Sudoku-Code — die letzte Barriere vor Kurainu! KEINE FEHLER!", mustWin: true, reward: 1000 },
      },
      {
        id: "c36s4",
        text: `Die letzte Zahl. Du tippst sie ein. Einen Moment lang passiert — NICHTS. Absolute Stille. Nicht mal das Summen der Elektronik. Als hätte jemand die Pause-Taste der Realität gedrückt.

Dann.

Ein Klicken. Tief, resonant, wie das Aufschließen eines Tresors, der seit hundert Jahren verschlossen war. Die Gravur beginnt zu LEUCHTEN — jede Zahl, jede Linie, jedes Feld — bis das gesamte Sudoku ein strahlendes goldenes Mandala ist.

Die Tür öffnet sich. Langsam. SO langsam, dass du die Sekunden zählen kannst. Und mit jedem Zentimeter, den sie aufgeht, flutet goldenes Licht heraus — wärmer, dichter, REALER als alles Gold zuvor.

Dahinter: ein einzelner Raum. Darin: ein einzelner Tisch. Daran: ein einzelner Stuhl. Und auf dem Stuhl, im Zentrum von allem, im Herz des CRISINO, im Auge des Sturms, im letzten Kapitel der Legende...

Kurainu. Allein. Ruhig. Die Maske auf dem Tisch vor ihm.

Er schaut auf. Und er lächelt.

"Endlich."`,
        giveItem: "Sudoku-Code",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 37: Der Schatten spricht
  // ═══════════════════════════════════════════════
  {
    number: 37,
    title: "Der Schatten spricht",
    scenes: [
      {
        id: "c37s1",
        text: `Er sitzt dort, als hätte er schon immer dort gesessen. Vielleicht hat er das auch. Der Lichtkegel fällt auf seine Hände — ruhig, entspannt, die Hände eines Menschen, der aufgehört hat sich zu beeilen. Die Maske liegt vor ihm auf dem Tisch. Schwarz, glatt, ohne Gesichtszüge. Sie sieht aus wie ein Loch in der Realität.

"Ich nehme an, du willst mein Gesicht sehen," sagt er. Keine Frage. Eine Feststellung. Seine Stimme ist dieselbe wie vorhin — samtweich, warm, mit diesem Hauch von Wissen, der einem das Gefühl gibt, drei Schritte hinterher zu sein.

Er greift nach der Maske. Dreht sie in seinen Händen. Dann hebt er den Kopf, und das Licht fällt auf sein Gesicht, und —

Du erstarrst.

Weil du in den Spiegel schaust. Weil sein Gesicht DEIN Gesicht ist. Älter. Müder. Mit Linien, die Geschichten erzählen, die du noch nicht gelebt hast. Aber DEIN Gesicht. Unmissverständlich. Unbestreitbar.

Crisio lässt sein Glas fallen. Es zerbricht nicht — es ist zu schockiert zum Zerbrechen.`,
        character: "🎭 Kurainu",
      },
      {
        id: "c37s2",
        text: `"Ich bin das, was du werden KÖNNTEST." Er steht auf. Langsam, wie jemand, der alle Zeit der Welt hat. Weil er sie wahrscheinlich HAT. "Der Chip zeigt dir nicht die Zukunft — er zeigt dir die MÖGLICHKEIT."

Er geht um den Tisch herum. Jeder Schritt hallt in der Stille.

"Jeder Wurf, jede Karte, jede Entscheidung... splittet die Realität. Wie die Spiegel, die du gesehen hast — nur REAL. Jedes Mal, wenn eine Münze fällt, entstehen zwei Universen. Eins wo sie Kopf zeigt. Eins wo sie Zahl zeigt. Und der Chip?" Er hält inne. "Der Chip lässt dich ZWISCHEN den Universen wandern. Das ist kein Glück. Das ist keine Magie. Das ist NAVIGATION durch die Unendlichkeit."

Wolfkampf flüstert: "Everetts Viele-Welten-Interpretation... aber REAL."

Kurainu nickt. "Der Philosoph versteht es. Natürlich tut er das."`,
        character: "🎭 Kurainu",
      },
      {
        id: "c37s3",
        text: `Er bleibt vor dir stehen. Auge in Auge. Dein Gesicht — sein Gesicht — getrennt durch Jahre und Entscheidungen.

"Gambling ist nicht Glück gegen Pech." Seine Stimme wird leiser, eindringlicher, wie jemand, der eine Wahrheit ausspricht, die er Jahrzehnte lang allein getragen hat. "Es ist DU gegen ALLE MÖGLICHEN VERSIONEN VON DIR. Jeder Spieler, der dieses Casino betritt, spielt nicht gegen das Haus. Er spielt gegen sich selbst. Gegen seine eigene Angst, seinen eigenen Zweifel, seine eigene Gier."

Er legt dir die Hand auf die Schulter. Sie ist warm. Real. DEINE Hand, älter.

"Und du hast es bis hierher geschafft. Durch jeden Floor, jeden Boss, jeden Verrat. Du hast gespielt, verloren, gewonnen, und weitergespielt. Das allein ist..." Er sucht nach dem richtigen Wort. Findet es. "...bemerkenswert."

Crisio, der leise weint (wieder): "Das ist der SCHÖNSTE Bösewicht-Monolog den ich je gehört habe."`,
        character: "🎭 Kurainu",
      },
      {
        id: "c37s4",
        text: `Kurainu geht zurück zum Tisch. Setzt sich. Greift nach einem Kartendeck. Aber nicht irgendeinem Deck — die Karten schimmern, und als er sie mischt, siehst du BILDER darauf. Szenen deiner Reise. Crisio, der dir den ersten Drink mischt. Sam, der im Schatten verschwindet. Die Zwillinge, die sich vereinen. Jede Karte eine Erinnerung, jede Erinnerung ein Moment, in dem die Realität sich gespalten hat.

"Bereit für die letzte Hand?" Er fächert die Karten auf. Sie bilden einen Halbkreis vor ihm, und jede einzelne pulsiert mit goldenem Licht. Dein Leben, ausgelegt wie ein Kartenspiel.

Er schaut dich an. Mit deinen eigenen Augen. Und in diesem Blick liegt kein Hass, keine Bosheit, kein Triumph — nur die Müdigkeit von jemandem, der zu lange allein an einem Tisch gesessen hat. Und die Hoffnung, dass es bald vorbei sein könnte.

"Setz dich."

Du setzt dich. Gegenüber von dir selbst. An einem goldenen Tisch, in einem goldenen Raum, am Ende einer Reise, die mit einer letzten Münze begonnen hat.

Die letzte Hand beginnt.`,
        character: "🎭 Kurainu",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 38: Die letzte Hand
  // ═══════════════════════════════════════════════
  {
    number: 38,
    title: "Die letzte Hand",
    scenes: [
      {
        id: "c38s1",
        text: `"Fünf Runden. Wer drei gewinnt, bekommt den Chip. Für IMMER." Kurainu legt die Regeln fest wie jemand, der Verträge mit dem Universum schließt. Kein Verhandeln. Kein Nachverhandeln. Kein "Kann ich nochmal?" Dies ist es. Das Endgame.

Der Tisch LEUCHTET golden. Nicht die Lampen darüber — der Tisch SELBST. Das Holz, das Filz, die Einlegearbeiten, alles strahlt von innen heraus, als wäre in der Tischplatte eine kleine Sonne eingesperrt. Die Karten auf dem Tisch werfen keine Schatten, weil das Licht von ÜBERALL kommt.

Crisio hat sich hinter deinem Stuhl positioniert. Wie ein Cornerman beim Boxen. Oder ein sehr emotionaler Schutzengel. "Fünf Runden," wiederholt er flüsternd. "Drei Siege. Du hast schon schlimmere Odds geschlagen."

Wolfkampf steht daneben. Regungslos. Eine Statue der Konzentration. Er hat Kierkegaard ENDGÜLTIG zugeklappt. Zum allerletzten Mal. "Dies ist der Moment," sagt er leise. "Nicht der Moment VOR dem Moment. Nicht der Moment NACH dem Moment. DER Moment."`,
        character: "🦊 Crisio",
      },
      {
        id: "c38s2",
        text: `Crisio kann nicht stillhalten. Er zittert. Nicht vor Angst — vor EMOTION. Vor der Wucht dieses Augenblicks. Seine Hände umklammern den Cocktail-Shaker, den er irgendwoher gezaubert hat — wahrscheinlich trägt er ihn IMMER bei sich, wie ein Ritter sein Schwert.

"DU SCHAFFST DAS!" brüllt er plötzlich, und seine Stimme bricht, und Tränen laufen über sein Fuchsgesicht, und er wischt sie weg mit der Schürze, und neue kommen, und er wischt wieder, und es ist ein endloser Kreislauf von Tränen und Schürze. "ICH GLAUBE AN DICH!"

Wolfkampf legt ihm wortlos eine Hand auf die Schulter. Crisio schluchzt lauter. Wolfkampf' Hand drückt fester zu. Es ist der emotionalste und gleichzeitig maskulinste Moment der Casino-Geschichte.

Kurainu beobachtet das Ganze mit einem Ausdruck, der fast... SEHNSÜCHTIG aussieht. Als hätte er so etwas mal gehabt. Vor langer Zeit. In einer anderen Zeitlinie.

"Spielen wir."`,
        character: "🦊 Crisio",
      },
      {
        id: "c38s3",
        text: `Die Karten fliegen. Kurainu mischt mit einer Eleganz, die über menschliches Können hinausgeht — aber natürlich tut sie das, er hat UNENDLICHE Versionen von sich selbst, in denen er Kartentricks geübt hat. Die Karten bilden Muster in der Luft, Spiralen, Kreise, und für einen Moment sieht es aus, als würden sie von selbst fliegen.

"Zeig mir, was du gelernt hast." Er teilt aus. Fünf Karten für dich. Fünf Karten für ihn. Die größte Pokerpartie, die das CRISINO je gesehen hat. Nicht wegen des Einsatzes — obwohl der Einsatz ALLES ist — sondern weil hier zwei Versionen desselben Menschen gegeneinander spielen. Vergangenheit gegen Zukunft. Möglichkeit gegen Realität. ICH gegen ICH.

Crisio hat aufgehört zu weinen. Stattdessen betet er. Zu welchem Gott ist unklar, aber er betet zu ALLEN, sicherheitshalber. Wolfkampf meditiert. Oder schläft. Schwer zu sagen.

Das goldene Licht pulsiert. Die Karten warten.`,
        boss: {
          name: "Kurainu",
          emoji: "🎭",
          game: "poker",
          reward: 2000,
          dialog: "Zeig mir was du gelernt hast. Fünf Runden. Die letzte Hand. DER finale Boss.",
        },
      },
      {
        id: "c38s4",
        text: `Die letzte Karte liegt auf dem Tisch. Die Stille ist so absolut, dass du deinen eigenen Herzschlag hörst. Und seinen. Denselben Rhythmus. Natürlich denselben Rhythmus.

Kurainu betrachtet seine Karten. Dann deine. Dann wieder seine. Und langsam — so langsam, dass die Zeit selbst innezuhalten scheint — legt er seine Hand auf den Tisch.

Er schaut auf. Und er LÄCHELT. Nicht das kalkulierte Lächeln des Casino-Bosses. Nicht das müde Lächeln des einsamen Mannes. Ein ECHTES Lächeln. Das Lächeln von jemandem, der endlich — ENDLICH — das gefunden hat, wonach er gesucht hat.

"Gut gespielt." Seine Stimme ist weich, ruhig, fast zärtlich. "Wirklich gut gespielt."

Er schiebt den Goldenen Chip über den Tisch. Er gleitet lautlos über das leuchtende Filz und stoppt genau vor dir. Er pulsiert. Golden. Warm. Wie ein zweites Herz.

"Er gehört dir. Du hast ihn verdient."

Crisio EXPLODIERT vor Freude. Wolfkampf nickt. Einmal. Das ist sein Standing Ovation.`,
        character: "🎭 Kurainu",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 39: Der Goldene Chip
  // ═══════════════════════════════════════════════
  {
    number: 39,
    title: "Der Goldene Chip",
    scenes: [
      {
        id: "c39s1",
        text: `Der Chip schwebt. Du hast nicht bemerkt, WANN er angefangen hat zu schweben, aber er TUT es. Zwischen dir und Kurainu, genau in der Mitte, rotiert er langsam um seine eigene Achse. Golden, warm, pulsierend — wie ein Stern kurz vor der Supernova. Oder wie ein Herz kurz vor der wichtigsten Entscheidung.

Du spürst seine Macht. Nicht metaphorisch — PHYSISCH. Die Luft um den Chip vibriert. Die Realität BIEGT sich um ihn herum wie Licht um ein schwarzes Loch. Du siehst Schimmer an den Rändern — andere Welten, andere Möglichkeiten, andere DUs, die alle auf diesen Moment schauen.

Crisio steht hinter dir. Seine Hand liegt auf deiner Schulter. Sie zittert, aber sie ist DA. "Was auch immer du entscheidest..." flüstert er. "Ich stehe hinter dir. Buchstäblich. Und metaphorisch."

Wolfkampf nickt. Einmal. Fest. Endgültig.`,
        character: "🦊 Crisio",
      },
      {
        id: "c39s2",
        text: `Kurainu steht auf. Zum letzten Mal. Er tritt zurück vom Tisch, weg vom Chip, und sein Blick hat etwas... Friedliches. Als hätte er eine Last abgelegt, die er Äonen getragen hat.

"Er gehört dir. Aber WISSE:" Sein Ton wird ernst. Ernster als alles, was er bisher gesagt hat. Ernster als die Maske, ernster als die Spiele, ernster als die ganze verdammte goldene Architektur. "Wer den Chip besitzt, wird zum Dealer. Zur neuen Legende. Zur neuen Stimme im goldenen Raum."

Er macht eine Geste, die den gesamten Raum umfasst. Das Gold. Die Einsamkeit. Den leeren Stuhl am leeren Tisch.

"Zur neuen EINSAMKEIT."

Das Wort hallt nach. Einsamkeit. Es klingt in einem goldenen Raum schlimmer als irgendwo sonst. Weil Gold nicht wärmt. Gold GLÄNZT nur.

"Oder..." Kurainu hebt die Hand. "Du kannst ihn zerstören. Den Chip. Die Macht. Die Möglichkeit. Alles." Er schnippt mit den Fingern, und ein Riss erscheint im Boden — darunter NICHTS. Absolute Leere. "Ein Wurf in die Leere, und es ist vorbei. Für immer."`,
        character: "🎭 Kurainu",
      },
      {
        id: "c39s3",
        text: `Der Chip schwebt still. Wartet. Auf DICH. Die ganze Reise — jede Münze, jede Karte, jedes Würfelspiel, jeder Boss, jeder Freund und jeder Verräter — hat zu DIESEM Moment geführt. Zu dieser einen Entscheidung, die alles bestimmt.

Crisio sagt nichts. Zum ersten Mal in seiner gesamten Existenz sagt Crisio NICHTS. Weil er weiß, dass das DEINE Entscheidung ist. Nur deine.

Wolfkampf schließt die Augen. "Die Existenz geht der Essenz voraus," flüstert er. Sartre. Natürlich Sartre. "Was du WÄHLST, definiert was du BIST."

Kurainu wartet. Geduldig. Er hat EWIG gewartet. Was sind ein paar Sekunden mehr?

Der Chip pulsiert. Golden. Warm. Voller Möglichkeiten. Voller Einsamkeit. Voller Macht. Voller Freiheit. Alles gleichzeitig.

Was tust du?`,
        character: "🎭 Kurainu",
        choice: {
          prompt: "Der Goldene Chip — die letzte Entscheidung.",
          options: [
            { id: "keep", text: "👑 Den Chip behalten — Die Macht ist zu groß um sie aufzugeben" },
            { id: "destroy", text: "💥 Den Chip zerstören — Wahre Freiheit hat keinen Preis" },
          ],
        },
      },
      {
        id: "c39s4",
        text: `Die Entscheidung ist gefallen. Und im Moment, in dem du sie triffst — in dem EXAKTEN Moment, in dem dein Herz sich entscheidet — verändert sich ALLES. Die Luft im Raum. Das Licht. Die Temperatur. Sogar die Zeit selbst scheint zu stolpern, als hätte sie nicht erwartet, dass du dich SO entscheidest.

Kurainu sieht es in deinen Augen. Er WEISS es, bevor du es sagst. Natürlich weiß er es. Er IST du.

"So sei es," sagt er leise. Und in diesen drei Worten liegt alles — Akzeptanz, Stolz, Trauer, Hoffnung, Abschied.

Die goldenen Wände beginnen sich zu verändern. Langsam, wie ein Sonnenuntergang, der sich über einen ganzen Horizont erstreckt. Das Ende beginnt.

"Komm," sagt Kurainu — dein anderes Ich, dein Schatten, dein Spiegel. "Lass mich dir zeigen, wie die Geschichte endet."`,
        character: "🎭 Kurainu",
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHAPTER 40: Epilog
  // ═══════════════════════════════════════════════
  {
    number: 40,
    title: "Epilog",
    scenes: [
      {
        id: "c40s1",
        text: `Das CRISINO hält den Atem an. Jeder Spieltisch, jeder Automat, jeder Kronleuchter — alles wartet. Wartet auf das Ende einer Geschichte, die mit einer letzten Münze in einer leeren Tasche begonnen hat und jetzt, hier, in einem goldenen Raum an der Spitze der Welt, zu ihrem Abschluss kommt.

Du stehst am Fenster des Penthouses. Draußen erstreckt sich die Stadt — Lichter wie gefallene Sterne, Straßen wie Lebenslinien, und irgendwo da unten die Tür, durch die du einmal hereingekommen bist. Pleite. Verzweifelt. Mit drei Cent in der rechten Tasche und einem Loch in der linken.

Was für ein Weg.

Kurainu steht neben dir. Sein Gesicht — DEIN Gesicht — reflektiert im Fensterglas. Zwei Versionen. Ein Moment. "Jede Geschichte braucht ein Ende," sagt er. "Aber nicht jedes Ende ist gleich."

Er hat Recht. Denn was jetzt kommt, hängt davon ab, wer du auf dieser Reise GEWORDEN bist.`,
        character: "🎭 Kurainu",
      },
      {
        id: "c40s2",
        text: `Crisio kommt durch die Tür. Er trägt — unfassbarerweise — ein TABLETT. Darauf stehen Gläser. Natürlich stehen darauf Gläser. Der Mann hört NIE auf, Barkeeper zu sein.

"Ich dachte mir... egal wie es endet... einen letzten Drink." Er lächelt. Es ist das ehrlichste Lächeln, das du je an einem Fuchsgesicht gesehen hast. "Auf die Reise. Auf uns. Auf alles, was war, und alles, was kommt."

Wolfkampf nimmt ein Glas. Hält es hoch. "Und auf die Freiheit, zu wählen," fügt er hinzu. Zum ersten Mal klingt er nicht wie ein Philosophie-Lehrbuch, sondern wie ein FREUND.

Selbst Kurainu nimmt ein Glas. Dein anderes Ich, das Glas in der Hand, das goldene Licht im Gesicht. Einen Moment lang seid ihr keine Gegner mehr. Keine verschiedenen Zeitlinien. Einfach nur... Menschen.

"Auf die Geschichte," sagt Kurainu.

"Auf die Geschichte," sagt ihr alle.

Die Gläser klingen. Zum letzten Mal.`,
        character: "🦊 Crisio",
      },
      {
        id: "c40s3",
        text: `Der letzte Tropfen ist getrunken. Das letzte Glas ist abgestellt. Und jetzt — jetzt beginnt der WAHRE Epilog. Die Geschichte, die NUR dir gehört.

Denn dein Ende wurde nicht HIER geschrieben. Es wurde geschrieben in Kapitel 32, als du dein Glas erhoben hast. Und in Kapitel 39, als du deine Hand nach dem Chip ausgestreckt hast. Jede Entscheidung eine Weggabelung. Jede Weggabelung ein anderes Schicksal.

Kurainu tritt zurück. Das goldene Licht wird heller. Die Wände lösen sich auf — nicht zerstörerisch, sondern sanft, wie Nebel im Morgenlicht. Und was dahinter liegt...

...ist DEIN Ende. Nur deins. Geschrieben von deinen Entscheidungen. Versiegelt von deinem Mut.

Der Vorhang hebt sich ein letztes Mal.`,
      },
      // — Four endings based on ch32 + ch39 choices —
      {
        id: "c40s4_king",
        text: `═══════════════════════════════════════
ENDING 1: "DER KÖNIG"
═══════════════════════════════════════

Du hast den Chip behalten. Und du hast auf den SIEG getrunken. Der Chip wusste es. Er WUSSTE, dass du ihn wählen würdest. Und jetzt formt er sich um — von einer Münze zu einem Ring, von einem Ring zu einer Krone, die auf deiner Stirn wächst wie etwas, das schon immer dort hätte sein sollen.

Du setzt dich auf den Stuhl Kurainus. Den THRON. Er ist kalt — so kalt wie Gold sein kann, wenn niemand daneben sitzt, der es wärmt. Aber er PASST. Jede Kurve, jede Kante, als wäre er für dich gemacht worden. Weil er für dich gemacht wurde. Von einer Version von dir, die genau WUSSTE, wer ihn eines Tages besetzen würde.

Die Maske gleitet auf dein Gesicht. Sie passt perfekt. Natürlich tut sie das.

CRISINO ist DEINS. Jeder Floor, jeder Tisch, jeder Automat — sie alle gehorchen dir. Du spürst das Casino wie eine Erweiterung deines Körpers. Die Karten flüstern dir zu. Die Würfel gehorchen dir. Die Münzen fallen, wie DU es willst.

Macht jenseits der Vorstellungskraft.

Aber der Stuhl ist kalt. Und Crisio... Crisio kommt nicht mehr vorbei. Niemand kommt vorbei. Denn wer den Thron besteigt, verlässt ihn nicht. Und wer ihn nicht verlässt, verliert — langsam, unmerklich, aber unaufhaltsam — alles, was kein Gold ist.

Du bist der König. Du bist die Legende. Du bist der neue Dealer.

Du bist allein.

🎰 ENDE — "Der König" 👑`,
      },
      {
        id: "c40s4_free",
        text: `═══════════════════════════════════════
ENDING 2: "DIE FREIE SEELE"
═══════════════════════════════════════

Du hast den Chip zerstört. Und du hast auf die FREUNDSCHAFT getrunken. In dem Moment, in dem der Chip in die Leere fällt, passiert etwas, das niemand erwartet hat — am wenigsten du selbst.

NICHTS. Kein Erdbeben, kein kosmischer Zusammenbruch, kein dramatisches Finale. Der Chip fällt, glimmt einmal auf, und dann... Stille. Friedliche, warme, goldlose Stille.

Das Gold an den Wänden beginnt zu verblassen. Langsam, sanft, wie Farbe, die von einem alten Gemälde bröckelt. Und darunter kommt die ECHTE Welt zum Vorschein. Ziegel. Beton. Holz. ECHTE Materialien. ECHTE Dinge. Ohne Magie, ohne Glanz, ohne Illusion. Und irgendwie... schöner.

Du gehst nach draußen. Die Tür des CRISINO schließt sich hinter dir. Zum letzten Mal. Und vor dir: der Sonnenaufgang. Orange. Rosa. Gold — ECHTES Gold, am Himmel, wo es hingehört.

Crisio steht neben dir. Natürlich steht er neben dir. Wo sollte er sonst stehen?

"Was jetzt?" fragt er. Die ehrlichste Frage, die er je gestellt hat.

"Vielleicht..." Du atmest ein. Die Morgenluft schmeckt nach Anfang. "...ein normales Leben?"

Crisio grinst. Das breiteste, ehrlichste, fuchsigste Grinsen der Welt.

"Langweilig." Pause. "Ich bin dabei."

Ihr geht los. In den Sonnenaufgang. Zusammen. Ohne Chip, ohne Casino, ohne Legende. Nur zwei Freunde und eine Straße, die nirgendwohin und überallhin führt.

Das beste Ende. Weil die besten Geschichten nicht mit Macht enden, sondern mit jemandem, der neben dir geht.

🌅 ENDE — "Die Freie Seele" ✨`,
      },
      {
        id: "c40s4_sacrifice",
        text: `═══════════════════════════════════════
ENDING 3: "DAS OPFER"
═══════════════════════════════════════

Du hast den Chip zerstört. Und du hast auf den SIEG getrunken. Und als der Chip die Leere berührt, EXPLODIERT er. Nicht in Feuer — in LICHT. Goldenes, weißes, unmögliches Licht, das durch das gesamte CRISINO schießt wie ein Blitz durch ein Nervensystem.

Das Gebäude BEBT. Wände reißen — aber nicht zerstörerisch. Chirurgisch. Präzise. Als würde eine unsichtbare Hand das Casino UMBAUEN, Stück für Stück, während du darin stehst. Spielautomaten formen sich zu ANDEREN Dingen um. Roulette-Tische werden zu runden Tischen für GESPRÄCHE. Pokertische zu WERKBÄNKEN. Das gesamte Casino transformiert sich von einem Ort des NEHMENS zu einem Ort des GEBENS.

Aus den Ruinen des alten CRISINO wächst etwas NEUES. Ein Casino, in dem NIEMAND verliert. Wo jedes Spiel nicht um Geld geht, sondern um Erfahrung, um Freude, um VERBINDUNG. Es klingt unmöglich. Es IST unmöglich. Oder war es — bis jetzt.

Eine vertraute Stimme hinter dir: "Das war mein Plan. All along." Schrifterz — der ECHTE, unabhängig davon was er vorher getan hat — steht in der Tür. Tränen in den Augen. Aber gute Tränen. Wissenschaftler-Tränen. "Der Chip MUSSTE zerstört werden. Nur so konnte seine Energie freigesetzt werden. Nicht für EINEN Menschen — für ALLE."

Er lächelt. "Danke. Du hast die Gleichung gelöst."

🔬 ENDE — "Das Opfer" 🙏`,
      },
      {
        id: "c40s4_eternal",
        text: `═══════════════════════════════════════
ENDING 4: "DER EWIGE SPIELER"
═══════════════════════════════════════

Du hast den Chip behalten. Und du hast auf die FREUNDSCHAFT getrunken. Und genau das — GENAU DAS — macht den Unterschied. Denn der Chip REAGIERT auf Absichten. Er FÜHLT, was du fühlst. Und was du fühlst, ist nicht Gier. Nicht Macht. Nicht Herrschaft.

Sondern VERBINDUNG.

Der Chip beginnt zu LEUCHTEN — heller als je zuvor, so hell, dass selbst das Gold des Penthouses dagegen blass wirkt. Und dann — TEILT er sich. Wie eine Zelle unter dem Mikroskop. Aus einem Chip werden zwei. Aus zwei werden vier. Aus vier werden TAUSENDE. Goldene Splitter, die durch die Luft tanzen wie Glühwürmchen auf einem Sommerabend.

Jeder Splitter findet seinen Weg. Durch die Gänge des CRISINO, durch die Türen, die Fenster, die Risse in der Realität. Jeder Mensch im Casino — jeder Spieler, jeder Angestellter, jeder Besucher — spürt es. Ein Kribbeln. Ein Lächeln. Ein Glück, das nicht vom Gewinnen kommt, sondern vom SEIN.

Du hast die Macht nicht AUFGEGEBEN. Du hast sie GETEILT.

Crisio wird Co-Besitzer. NATÜRLICH wird Crisio Co-Besitzer. "Beste Business-Entscheidung meines Lebens!" ruft er, während er die Bar komplett umgestaltet. Wolfkampf wird Sicherheitschef UND Resident-Philosoph. Kurainu — dein anderes Ich — löst sich auf. Nicht in Trauer, sondern in FRIEDEN. "Du hast das geschafft, was ich nie konnte," flüstert er, bevor er verschwindet. "Du hast den Chip benutzt, ohne dich von ihm benutzen zu lassen."

Das CRISINO wird legendär. Nicht als Ort des Glücksspiels, sondern als Ort des GLÜCKS. Ein feiner, aber entscheidender Unterschied.

🎲 ENDE — "Der Ewige Spieler" 🤝`,
      },
    ],
  },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function redisKey(channelId: string, userId: string): string {
  return `casino:story:${channelId}:${userId}`;
}

function defaultState(): StoryState {
  return {
    chapter: 1,
    scene: 0,
    points: 0,
    inventory: [],
    choices: {},
    stats: { wins: 0, losses: 0, puzzlesSolved: 0, bossesDefeated: 0 },
    attempts: 0,
    startedAt: Date.now(),
    lastPlayed: Date.now(),
  };
}

function getChapter(num: number): StoryChapter | undefined {
  return chapters.find((c) => c.number === num);
}

function resolveScene(state: StoryState): StoryScene | null {
  const ch = getChapter(state.chapter);
  if (!ch) return null;

  const sceneIndex = state.scene;
  if (sceneIndex < 0 || sceneIndex >= ch.scenes.length) return null;

  const scene = ch.scenes[sceneIndex];

  // Handle choice-branching for chapter 6 scene 4
  if (scene.id === "c6s4_kitchen" || scene.id === "c6s4_office") {
    const choiceKey = `c${state.chapter}`;
    const chosen = state.choices[choiceKey];
    if (scene.id === "c6s4_kitchen" && chosen !== "kitchen") return null;
    if (scene.id === "c6s4_office" && chosen !== "office") return null;
  }

  return scene;
}

/**
 * For chapters with choice-branching, determine the right scene index for scene 4
 */
function resolveSceneIndex(state: StoryState, ch: StoryChapter): number {
  // Chapter 6 has branching at scene index 3/4
  if (state.chapter === 6 && state.scene >= 3) {
    const choiceKey = `c6`;
    const chosen = state.choices[choiceKey];
    // Find the matching branch scene
    const branchId = chosen === "office" ? "c6s4_office" : "c6s4_kitchen";
    const idx = ch.scenes.findIndex((s) => s.id === branchId);
    if (idx >= 0) return idx;
  }

  // Chapter 35 scene 2 branches based on ch12 choice (cooperate vs solo)
  if (state.chapter === 35 && state.scene >= 1 && state.scene <= 2) {
    const ch12Choice = state.choices["c12"];
    const branchId = ch12Choice === "solo" ? "c35s2_solo" : "c35s2_cooperate";
    const idx = ch.scenes.findIndex((s) => s.id === branchId);
    if (idx >= 0 && state.scene >= 1) return idx;
  }

  // Chapter 40 scene 4 branches based on ch32 toast + ch39 chip choice
  if (state.chapter === 40 && state.scene >= 3) {
    const toast = state.choices["c32"]; // "friendship" or "victory"
    const chip = state.choices["c39"];  // "keep" or "destroy"
    let endingId: string;
    if (chip === "keep" && toast === "victory") endingId = "c40s4_king";
    else if (chip === "destroy" && toast === "friendship") endingId = "c40s4_free";
    else if (chip === "destroy" && toast === "victory") endingId = "c40s4_sacrifice";
    else endingId = "c40s4_eternal"; // keep + friendship
    const idx = ch.scenes.findIndex((s) => s.id === endingId);
    if (idx >= 0) return idx;
  }

  return state.scene;
}

async function saveState(channelId: string, userId: string, state: StoryState): Promise<void> {
  state.lastPlayed = Date.now();
  await redis.set(redisKey(channelId, userId), JSON.stringify(state), "EX", 60 * 60 * 24 * 90); // 90 days TTL
}

function buildResponse(state: StoryState, scene: StoryScene | null) {
  const ch = getChapter(state.chapter);
  return {
    state,
    chapter: ch ? { number: ch.number, title: ch.title } : null,
    scene,
    progress: {
      currentChapter: state.chapter,
      currentScene: state.scene + 1,
      totalChaptersAvailable: chapters.length,
      totalScenesInChapter: ch ? ch.scenes.length : 0,
    },
  };
}

/* ──────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────── */

export async function getStoryState(channelId: string, userId: string) {
  const raw = await redis.get(redisKey(channelId, userId));
  if (!raw) return null;

  const state: StoryState = JSON.parse(raw);
  const ch = getChapter(state.chapter);
  if (!ch) return buildResponse(state, null);

  const idx = resolveSceneIndex(state, ch);
  const scene = ch.scenes[idx] ?? null;
  return buildResponse(state, scene);
}

export async function startStory(channelId: string, userId: string) {
  const state = defaultState();
  await saveState(channelId, userId, state);

  const ch = getChapter(1)!;
  const scene = ch.scenes[0];
  return buildResponse(state, scene);
}

export async function advanceStory(channelId: string, userId: string) {
  const raw = await redis.get(redisKey(channelId, userId));
  if (!raw) return { error: "Keine Story gestartet. Benutze !story start" };

  const state: StoryState = JSON.parse(raw);
  const ch = getChapter(state.chapter);
  if (!ch) return { error: "Kapitel nicht gefunden." };

  const currentIdx = resolveSceneIndex(state, ch);
  const currentScene = ch.scenes[currentIdx];

  // Block advancement if current scene has a game/boss that hasn't been played
  if (currentScene?.game || currentScene?.boss) {
    return {
      error: "Du musst zuerst das Spiel in dieser Szene abschließen!",
      scene: currentScene,
      state,
    };
  }

  // Block advancement if current scene has a choice that hasn't been made
  if (currentScene?.choice) {
    const choiceKey = `c${state.chapter}`;
    if (!state.choices[choiceKey]) {
      return {
        error: "Du musst zuerst eine Wahl treffen! Benutze !story choose <option>",
        scene: currentScene,
        state,
      };
    }
  }

  // Calculate next scene
  let nextScene = state.scene + 1;
  let nextChapter = state.chapter;

  // Handle choice branching (ch6: after choice, the branch scene replaces index 3)
  if (state.chapter === 6 && state.scene === 2 && state.choices["c6"]) {
    // After the choice scene, move to the branch scene (index 3 or 4)
    const branchId = state.choices["c6"] === "office" ? "c6s4_office" : "c6s4_kitchen";
    const branchIdx = ch.scenes.findIndex((s) => s.id === branchId);
    if (branchIdx >= 0) {
      nextScene = branchIdx;
    }
  }

  // Ch35 scene 1 -> branch to cooperate/solo based on ch12 choice
  if (state.chapter === 35 && state.scene === 0) {
    const ch12Choice = state.choices["c12"];
    const branchId = ch12Choice === "solo" ? "c35s2_solo" : "c35s2_cooperate";
    const branchIdx = ch.scenes.findIndex((s) => s.id === branchId);
    if (branchIdx >= 0) {
      nextScene = branchIdx;
    }
  }

  // Ch40 scene 3 -> branch to one of 4 endings based on ch32 toast + ch39 chip choice
  if (state.chapter === 40 && state.scene === 2) {
    const toast = state.choices["c32"];
    const chip = state.choices["c39"];
    let endingId: string;
    if (chip === "keep" && toast === "victory") endingId = "c40s4_king";
    else if (chip === "destroy" && toast === "friendship") endingId = "c40s4_free";
    else if (chip === "destroy" && toast === "victory") endingId = "c40s4_sacrifice";
    else endingId = "c40s4_eternal";
    const branchIdx = ch.scenes.findIndex((s) => s.id === endingId);
    if (branchIdx >= 0) {
      nextScene = branchIdx;
    }
  }

  // Handle scene override via nextScene
  if (currentScene?.nextScene) {
    const overrideIdx = ch.scenes.findIndex((s) => s.id === currentScene.nextScene);
    if (overrideIdx >= 0) {
      nextScene = overrideIdx;
    }
  }

  // Determine effective max scene (accounting for branches in ch6)
  const effectiveMaxScene = ch.scenes.length;

  // Check if we need to advance to next chapter
  const isChapterEndBranch =
    (state.chapter === 6 && currentScene?.id?.startsWith("c6s4")) ||
    (state.chapter === 40 && currentScene?.id?.startsWith("c40s4_"));
  if (nextScene >= effectiveMaxScene || isChapterEndBranch) {
    const nextCh = getChapter(nextChapter + 1);
    if (!nextCh) {
      return {
        state,
        scene: null,
        message: state.chapter === 40
          ? "🎉 Du hast die Geschichte abgeschlossen! Die Legende des Goldenen Chips ist zu Ende. Dein Schicksal ist besiegelt."
          : "🎉 Du hast alle verfügbaren Kapitel abgeschlossen! Mehr kommt bald...",
      };
    }
    nextChapter = nextChapter + 1;
    nextScene = 0;
  }

  state.chapter = nextChapter;
  state.scene = nextScene;
  state.attempts = 0;

  // Give items
  const newCh = getChapter(state.chapter)!;
  const newIdx = resolveSceneIndex(state, newCh);
  const newSceneObj = newCh.scenes[newIdx];
  if (newSceneObj?.giveItem && !state.inventory.includes(newSceneObj.giveItem)) {
    state.inventory.push(newSceneObj.giveItem);
  }

  await saveState(channelId, userId, state);
  return buildResponse(state, newSceneObj);
}

export async function makeChoice(channelId: string, userId: string, choiceId: string) {
  const raw = await redis.get(redisKey(channelId, userId));
  if (!raw) return { error: "Keine Story gestartet. Benutze !story start" };

  const state: StoryState = JSON.parse(raw);
  const ch = getChapter(state.chapter);
  if (!ch) return { error: "Kapitel nicht gefunden." };

  const idx = resolveSceneIndex(state, ch);
  const scene = ch.scenes[idx];

  if (!scene?.choice) {
    return { error: "Es gibt hier keine Wahl zu treffen." };
  }

  const validOption = scene.choice.options.find((o) => o.id === choiceId);
  if (!validOption) {
    const validIds = scene.choice.options.map((o) => o.id).join(", ");
    return { error: `Ungültige Wahl. Optionen: ${validIds}` };
  }

  const choiceKey = `c${state.chapter}`;
  state.choices[choiceKey] = choiceId;

  // Auto-advance to the branch scene
  if (state.chapter === 6) {
    const branchId = choiceId === "office" ? "c6s4_office" : "c6s4_kitchen";
    const branchIdx = ch.scenes.findIndex((s) => s.id === branchId);
    if (branchIdx >= 0) {
      state.scene = branchIdx;
    }
  } else {
    state.scene += 1;
  }

  state.attempts = 0;

  const newIdx = resolveSceneIndex(state, ch);
  const newScene = ch.scenes[newIdx] ?? ch.scenes[state.scene];

  if (newScene?.giveItem && !state.inventory.includes(newScene.giveItem)) {
    state.inventory.push(newScene.giveItem);
  }

  await saveState(channelId, userId, state);
  return buildResponse(state, newScene);
}

export async function reportGameResult(channelId: string, userId: string, won: boolean) {
  const raw = await redis.get(redisKey(channelId, userId));
  if (!raw) return { error: "Keine Story gestartet. Benutze !story start" };

  const state: StoryState = JSON.parse(raw);
  const ch = getChapter(state.chapter);
  if (!ch) return { error: "Kapitel nicht gefunden." };

  const idx = resolveSceneIndex(state, ch);
  const scene = ch.scenes[idx];

  if (!scene?.game && !scene?.boss) {
    return { error: "Es gibt kein aktives Spiel in dieser Szene." };
  }

  if (won) {
    // Victory
    state.stats.wins += 1;
    if (scene.boss) state.stats.bossesDefeated += 1;
    if (scene.game?.type === "sudoku4" || scene.game?.type === "sudoku9") state.stats.puzzlesSolved += 1;

    const reward = scene.game?.reward ?? scene.boss?.reward ?? 0;
    state.points += reward;

    // Advance to next scene
    let nextScene = state.scene + 1;
    const effectiveMax = ch.scenes.length;

    // Handle nextScene override on current scene (e.g. ch35 branch -> c35s3)
    if (scene.nextScene) {
      const overrideIdx = ch.scenes.findIndex((s) => s.id === scene.nextScene);
      if (overrideIdx >= 0) {
        nextScene = overrideIdx;
      }
    }

    // Check chapter boundary
    const isEndBranch =
      (state.chapter === 6 && scene.id?.startsWith("c6s4")) ||
      (state.chapter === 40 && scene.id?.startsWith("c40s4_"));
    if (nextScene >= effectiveMax || isEndBranch) {
      const nextCh = getChapter(state.chapter + 1);
      if (!nextCh) {
        state.scene = effectiveMax - 1; // stay at last
        await saveState(channelId, userId, state);
        return {
          state,
          scene: null,
          won: true,
          reward,
          message: "🎉 Du hast die Geschichte abgeschlossen! Die Legende des Goldenen Chips ist zu Ende. Dein Schicksal ist besiegelt.",
        };
      }
      state.chapter += 1;
      state.scene = 0;
    } else {
      state.scene = nextScene;
    }

    state.attempts = 0;

    const newCh = getChapter(state.chapter)!;
    const newIdx = resolveSceneIndex(state, newCh);
    const newScene = newCh.scenes[newIdx];

    if (newScene?.giveItem && !state.inventory.includes(newScene.giveItem)) {
      state.inventory.push(newScene.giveItem);
    }

    await saveState(channelId, userId, state);
    return { ...buildResponse(state, newScene), won: true, reward };
  } else {
    // Defeat
    state.stats.losses += 1;
    state.attempts += 1;

    const isMustWin = scene.game?.mustWin === true;
    const maxAttempts = isMustWin ? 999 : 3; // must-win games have unlimited attempts

    if (state.attempts >= maxAttempts) {
      // Skip after 3 failed attempts (non-mustWin only)
      let nextScene = state.scene + 1;
      const isDefeatEndBranch =
        (state.chapter === 6 && scene.id?.startsWith("c6s4")) ||
        (state.chapter === 40 && scene.id?.startsWith("c40s4_"));
      if (nextScene >= ch.scenes.length || isDefeatEndBranch) {
        const nextCh = getChapter(state.chapter + 1);
        if (nextCh) {
          state.chapter += 1;
          state.scene = 0;
        }
      } else {
        state.scene = nextScene;
      }
      state.attempts = 0;

      const newCh = getChapter(state.chapter)!;
      const newIdx = resolveSceneIndex(state, newCh);
      const newScene = newCh.scenes[newIdx];

      if (newScene?.giveItem && !state.inventory.includes(newScene.giveItem)) {
        state.inventory.push(newScene.giveItem);
      }

      await saveState(channelId, userId, state);
      return {
        ...buildResponse(state, newScene),
        won: false,
        skipped: true,
        message: "Nach 3 Versuchen übersprungen. Das Glück war diesmal nicht auf deiner Seite...",
      };
    }

    await saveState(channelId, userId, state);
    return {
      ...buildResponse(state, scene),
      won: false,
      attemptsLeft: maxAttempts === 999 ? "∞" : maxAttempts - state.attempts,
      message: isMustWin
        ? `Verloren! Versuch es nochmal — du MUSST dieses Spiel gewinnen! (Versuch ${state.attempts})`
        : `Verloren! Noch ${maxAttempts - state.attempts} Versuch(e) übrig.`,
    };
  }
}
