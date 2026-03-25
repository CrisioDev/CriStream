import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Play, Pause, RotateCcw, Trash2, Timer } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { StopwatchDto } from "@cristream/shared";

export function StopwatchPage() {
  const { activeChannel: channel } = useAuthStore();
  const [watches, setWatches] = useState<StopwatchDto[]>([]);
  const [newName, setNewName] = useState("");
  const [newGame, setNewGame] = useState("");

  useEffect(() => {
    if (channel) loadWatches();
  }, [channel]);

  const loadWatches = async () => {
    if (!channel) return;
    const res = await api.get<StopwatchDto[]>(`/channels/${channel.id}/stopwatch`);
    if (res.data) setWatches(res.data);
  };

  const add = async () => {
    if (!channel || !newName.trim()) return;
    await api.post(`/channels/${channel.id}/stopwatch`, { name: newName.trim(), game: newGame.trim() });
    setNewName("");
    setNewGame("");
    loadWatches();
  };

  const start = async (id: string) => {
    if (!channel) return;
    const res = await api.post<StopwatchDto>(`/channels/${channel.id}/stopwatch/${id}/start`);
    if (res.data) setWatches((prev) => prev.map((w) => (w.id === id ? res.data! : w)));
  };

  const stop = async (id: string) => {
    if (!channel) return;
    const res = await api.post<StopwatchDto>(`/channels/${channel.id}/stopwatch/${id}/stop`);
    if (res.data) setWatches((prev) => prev.map((w) => (w.id === id ? res.data! : w)));
  };

  const reset = async (id: string) => {
    if (!channel) return;
    const res = await api.post<StopwatchDto>(`/channels/${channel.id}/stopwatch/${id}/reset`);
    if (res.data) setWatches((prev) => prev.map((w) => (w.id === id ? res.data! : w)));
  };

  const remove = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/stopwatch/${id}`);
    setWatches((prev) => prev.filter((w) => w.id !== id));
  };

  if (!channel) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Stopwatch</h1>

      <Card>
        <CardHeader><CardTitle>Neue Stoppuhr</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (z.B. Elden Ring Any%)" className="flex-1" />
            <Input value={newGame} onChange={(e) => setNewGame(e.target.value)} placeholder="Spiel (optional)" className="w-48" />
            <Button onClick={add} disabled={!newName.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Erstellen
            </Button>
          </div>
        </CardContent>
      </Card>

      {watches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine Stoppuhren. Erstelle eine oben.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {watches.map((sw) => (
            <StopwatchCard
              key={sw.id}
              sw={sw}
              onStart={() => start(sw.id)}
              onStop={() => stop(sw.id)}
              onReset={() => reset(sw.id)}
              onDelete={() => remove(sw.id)}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Info</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Die Stoppuhr wird automatisch im <strong>Alert Overlay</strong> (OBS Browser Source) angezeigt wenn sie läuft.</p>
          <p>Position: unten rechts. Die Zeit läuft auch wenn der Stream offline ist — perfekt für Runs über mehrere Sessions.</p>
          <p>Nach Reset verschwindet die Anzeige aus dem Overlay.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StopwatchCard({
  sw,
  onStart,
  onStop,
  onReset,
  onDelete,
}: {
  sw: StopwatchDto;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const [displayTime, setDisplayTime] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      let ms = sw.elapsedMs;
      if (sw.running && sw.startedAt) {
        ms += Date.now() - new Date(sw.startedAt).getTime();
      }
      setDisplayTime(formatTime(ms));
    };
    update();
    if (sw.running) {
      intervalRef.current = setInterval(update, 50);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sw.elapsedMs, sw.running, sw.startedAt]);

  return (
    <Card className={sw.running ? "border-green-500/50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4" />
              {sw.name}
            </h3>
            {sw.game && <p className="text-xs text-muted-foreground">{sw.game}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="text-center my-4">
          <div className="text-4xl font-mono font-bold tracking-wider">
            {displayTime}
          </div>
          {sw.running && (
            <div className="text-xs text-green-400 mt-1 animate-pulse">Läuft</div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {sw.running ? (
            <Button onClick={onStop} variant="outline">
              <Pause className="mr-2 h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button onClick={onStart}>
              <Play className="mr-2 h-4 w-4" /> Start
            </Button>
          )}
          <Button onClick={onReset} variant="outline" disabled={sw.running && sw.elapsedMs === 0}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const frac = Math.floor((ms % 1000) / 10);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}
