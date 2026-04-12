import { useState, useEffect } from "react";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { Hourglass, Plus, Trash2, Copy, ExternalLink, Pencil } from "lucide-react";

interface CountdownTimer {
  id: string;
  name: string;
  mode: "duration" | "target";
  durationSeconds: number | null;
  targetDate: string | null;
  style: {
    fontSize: number;
    color: string;
    backgroundColor: string;
    showLabels: boolean;
    separator: string;
    completedText: string;
  };
  createdAt: number;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CountdownPage() {
  const { activeChannel } = useAuthStore();
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("Neuer Timer");
  const [mode, setMode] = useState<"duration" | "target">("duration");
  const [durationMin, setDurationMin] = useState(5);
  const [durationSec, setDurationSec] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [fontSize, setFontSize] = useState(72);
  const [color, setColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("transparent");
  const [showLabels, setShowLabels] = useState(true);
  const [separator, setSeparator] = useState(":");
  const [completedText, setCompletedText] = useState("TIME'S UP!");

  const channelId = activeChannel?.id;

  const fetchTimers = async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const res = await api.get<any>(`/channels/${channelId}/countdown`) as any;
      if (res.success) setTimers(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTimers(); }, [channelId]);

  const createTimer = async () => {
    if (!channelId) return;
    const totalSeconds = durationMin * 60 + durationSec;
    const data: any = {
      name,
      mode,
      style: { fontSize, color, backgroundColor: bgColor, showLabels, separator, completedText },
    };
    if (mode === "duration") data.durationSeconds = totalSeconds;
    if (mode === "target" && targetDate) data.targetDate = new Date(`${targetDate}T${targetTime || "00:00"}`).toISOString();

    try {
      const res = await api.post<any>(`/channels/${channelId}/countdown`, data) as any;
      if (res.success) {
        setShowCreate(false);
        setName("Neuer Timer");
        fetchTimers();
      }
    } catch {}
  };

  const deleteTimer = async (id: string) => {
    if (!channelId) return;
    await api.delete(`/channels/${channelId}/countdown/${id}`);
    fetchTimers();
  };

  const getOverlayUrl = (timer: CountdownTimer) => {
    if (!activeChannel) return "";
    return `${window.location.origin}/overlay/${activeChannel.overlayToken}/countdown/${timer.id}`;
  };

  const copyUrl = (timer: CountdownTimer) => {
    navigator.clipboard.writeText(getOverlayUrl(timer));
    setCopied(timer.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!activeChannel) return <div className="p-6 text-muted-foreground">Bitte einen Channel auswählen.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Hourglass className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold">Countdown Timer</h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Neuer Timer
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Erstelle Countdown-Timer mit eigenen Overlay-Seiten für OBS.
        Jeder Timer bekommt eine eigene URL die du als Browser-Source einbinden kannst.
      </p>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border bg-card p-5 mb-6 space-y-4">
          <h3 className="font-bold text-lg">Timer erstellen</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Modus</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                <option value="duration">Feste Dauer (Neustart bei Seitenaufruf)</option>
                <option value="target">Zieldatum (fester Zeitpunkt)</option>
              </select>
            </div>
          </div>

          {mode === "duration" && (
            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Minuten</label>
                <input type="number" min={0} value={durationMin} onChange={e => setDurationMin(+e.target.value)}
                  className="w-24 mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Sekunden</label>
                <input type="number" min={0} max={59} value={durationSec} onChange={e => setDurationSec(+e.target.value)}
                  className="w-24 mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <span className="text-sm text-muted-foreground mt-5">= {formatDuration(durationMin * 60 + durationSec)}</span>
            </div>
          )}

          {mode === "target" && (
            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Datum</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                  className="mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Uhrzeit</label>
                <input type="time" value={targetTime} onChange={e => setTargetTime(e.target.value)}
                  className="mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
            </div>
          )}

          <details className="group">
            <summary className="text-sm font-medium cursor-pointer text-purple-400 hover:text-purple-300">
              Darstellung anpassen
            </summary>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Schriftgröße (px)</label>
                <input type="number" min={16} max={200} value={fontSize} onChange={e => setFontSize(+e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Textfarbe</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                  <input value={color} onChange={e => setColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Hintergrund</label>
                <div className="flex items-center gap-2 mt-1">
                  <input value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="transparent" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Trennzeichen</label>
                <input value={separator} onChange={e => setSeparator(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Text bei 0</label>
                <input value={completedText} onChange={e => setCompletedText(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} id="labels" />
                <label htmlFor="labels" className="text-sm">Labels zeigen (Std/Min/Sek)</label>
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border text-sm">Abbrechen</button>
            <button onClick={createTimer}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium">Erstellen</button>
          </div>
        </div>
      )}

      {/* Timer list */}
      {loading ? (
        <div className="text-muted-foreground text-sm">Laden...</div>
      ) : timers.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Hourglass className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Noch keine Countdown-Timer erstellt.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Klicke "Neuer Timer" um loszulegen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timers.map(timer => (
            <div key={timer.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Hourglass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{timer.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${timer.mode === "duration" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"}`}>
                        {timer.mode === "duration" ? "Dauer" : "Ziel"}
                      </span>
                      {timer.mode === "duration" && timer.durationSeconds && (
                        <span>{formatDuration(timer.durationSeconds)}</span>
                      )}
                      {timer.mode === "target" && timer.targetDate && (
                        <span>{new Date(timer.targetDate).toLocaleString("de-DE")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyUrl(timer)} title="URL kopieren"
                    className="p-2 rounded-lg hover:bg-muted transition-colors">
                    {copied === timer.id ? <span className="text-green-400 text-xs font-bold">Kopiert!</span> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <a href={getOverlayUrl(timer)} target="_blank" title="Vorschau"
                    className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                  <button onClick={() => deleteTimer(timer.id)} title="Löschen"
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              {/* Overlay URL */}
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-[11px] px-3 py-1.5 rounded bg-muted font-mono truncate">
                  {getOverlayUrl(timer)}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OBS Instructions */}
      <div className="mt-6 rounded-xl border bg-card p-4">
        <h3 className="font-semibold text-sm mb-2">OBS Einrichtung</h3>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Timer erstellen und Overlay-URL kopieren</li>
          <li>In OBS: Quellen &rarr; Browser-Source hinzufügen</li>
          <li>URL einfügen, Breite/Höhe nach Bedarf (z.B. 800x200)</li>
          <li>Custom CSS: <code className="bg-muted px-1 rounded">body {"{"} background: transparent !important; {"}"}</code></li>
          <li><strong>Dauer-Modus:</strong> Timer startet bei jedem Seitenaufruf/Refresh neu</li>
          <li><strong>Ziel-Modus:</strong> Zählt bis zum eingestellten Datum/Zeitpunkt herunter</li>
        </ol>
      </div>
    </div>
  );
}
