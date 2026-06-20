import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { Copy, ExternalLink, Save, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import type { PollPredictionSettingsDto, UpdatePollPredictionSettingsDto } from "@cristream/shared";

interface SceneData {
  handle: string;
  twitchHandle: string;
  youtubeHandle: string;
  discordHandle: string;
  instagramHandle: string;
  brbNote: string;
  startingToday: string;
  defaultGame: string;
  defaultMode: string;
  streamPlan: Array<{ day: string; time: string; title: string }>;
}

const SCENES: { key: "starting" | "brb" | "offline" | "ingame" | "alerts"; label: string; desc: string }[] = [
  { key: "starting", label: "Starting Soon", desc: "Vor dem Stream (Countdown). URL-Param ?min=5 für die Dauer." },
  { key: "brb",      label: "Be Right Back",  desc: "Pause-Scene während des Streams." },
  { key: "offline",  label: "Offline",        desc: "Wenn der Stream beendet ist (mit Stream-Plan)." },
  { key: "ingame",   label: "In-Game HUD",    desc: "Overlay über dem Game. Cam-Rahmen + Now-Playing-Bar." },
  { key: "alerts",   label: "Alerts (Live)",  desc: "Verbindet sich live mit dem Server und zeigt Follow/Sub/Raid/... an." },
];

export function OverlayPage() {
  const { activeChannel: channel } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [copiedPlayer, setCopiedPlayer] = useState(false);
  const [copiedSandbox, setCopiedSandbox] = useState(false);

  if (!channel) return null;

  const overlayUrl = `${window.location.origin}/overlay/${channel.overlayToken}`;
  const playerUrl = `${window.location.origin}/overlay/${channel.overlayToken}/player`;
  const sandboxUrl = `${window.location.origin}/overlay/${channel.overlayToken}/sandbox`;

  const handleCopy = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlayer = () => {
    navigator.clipboard.writeText(playerUrl);
    setCopiedPlayer(true);
    setTimeout(() => setCopiedPlayer(false), 2000);
  };

  const handleCopySandbox = () => {
    navigator.clipboard.writeText(sandboxUrl);
    setCopiedSandbox(true);
    setTimeout(() => setCopiedSandbox(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">OBS Overlay</h1>

      <Card>
        <CardHeader>
          <CardTitle>Browser Source URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this URL as a Browser Source in OBS to display alerts on your stream.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-sm break-all">
              {overlayUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <a href={overlayUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Song Request Player</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this URL as a separate Browser Source in OBS to play YouTube song requests.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-sm break-all">
              {playerUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyPlayer}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedPlayer ? "Copied!" : "Copy"}
            </Button>
            <a href={playerUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Sandbox Overlay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this URL as a Browser Source in OBS for the live sandbox layer. Control it from the Sandbox page.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-sm break-all">
              {sandboxUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopySandbox}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedSandbox ? "Copied!" : "Copy"}
            </Button>
            <a href={sandboxUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <ScenesCard channelId={channel.id} overlayToken={channel.overlayToken} />

      <PollPredictionSettingsCard channelId={channel.id} />

      <Card>
        <CardHeader>
          <CardTitle>OBS Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Recommended OBS Browser Source settings:</p>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Width</span>
              <Badge variant="outline">1920</Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Height</span>
              <Badge variant="outline">1080</Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">FPS</span>
              <Badge variant="outline">30</Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Custom CSS</span>
              <code className="text-xs">body {"{"} background-color: rgba(0,0,0,0); {"}"}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shutdown source when not visible</span>
              <Badge variant="outline">Disabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenesCard({ channelId, overlayToken }: { channelId: string; overlayToken: string }) {
  const { show: toast } = useToast();
  const [data, setData] = useState<SceneData | null>(null);
  const [saving, setSaving] = useState(false);
  const origin = window.location.origin;

  useEffect(() => {
    api.get<SceneData>(`/channels/${channelId}/scenes`).then((res) => {
      if (res.data) setData(res.data);
    });
  }, [channelId]);

  if (!data) return null;

  const update = (patch: Partial<SceneData>) => setData({ ...data, ...patch });

  const save = async () => {
    setSaving(true);
    const res = await api.patch<SceneData>(`/channels/${channelId}/scenes`, data);
    setSaving(false);
    if (res.success && res.data) {
      setData(res.data);
      toast("success", "Scene-Einstellungen gespeichert");
    } else {
      toast("error", "Speichern fehlgeschlagen");
    }
  };

  const addPlanRow = () => update({ streamPlan: [...data.streamPlan, { day: "", time: "", title: "" }] });
  const updatePlanRow = (i: number, patch: Partial<{ day: string; time: string; title: string }>) =>
    update({ streamPlan: data.streamPlan.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const removePlanRow = (i: number) => update({ streamPlan: data.streamPlan.filter((_, idx) => idx !== i) });

  const copyUrl = (path: string, label: string) => {
    navigator.clipboard.writeText(`${origin}${path}`);
    toast("success", `${label}-URL kopiert`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenes — Browser-Sources für OBS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Komplette Szenen-Overlays (Starting Soon / BRB / Offline / In-Game / Alerts) mit
          dem CRISIO-Style. Jede URL als separate Browser-Source in OBS hinzufügen — die
          Inhalte werden aus den Einstellungen unten gezogen.
        </p>

        <div className="space-y-2">
          {SCENES.map((s) => {
            const url = `${origin}/overlay/${overlayToken}/scene/${s.key}`;
            return (
              <div key={s.key} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => copyUrl(`/overlay/${overlayToken}/scene/${s.key}`, s.label)} aria-label={`${s.label} URL kopieren`}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" aria-label={`${s.label} Vorschau öffnen`}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
                <code className="block text-xs text-muted-foreground break-all">{url}</code>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-6 space-y-5">
          <h3 className="text-base font-semibold">Customization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scene-handle">Handle (in allen Szenen)</Label>
              <Input id="scene-handle" value={data.handle} onChange={(e) => update({ handle: e.target.value })} placeholder="@thecrisio" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scene-starting-today">Starting-Caption</Label>
              <Input id="scene-starting-today" value={data.startingToday} onChange={(e) => update({ startingToday: e.target.value })} placeholder="Dark Souls III — Run #4" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scene-twitch">Twitch</Label>
              <Input id="scene-twitch" value={data.twitchHandle} onChange={(e) => update({ twitchHandle: e.target.value })} placeholder="/thecrisio" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scene-youtube">YouTube</Label>
              <Input id="scene-youtube" value={data.youtubeHandle} onChange={(e) => update({ youtubeHandle: e.target.value })} placeholder="/thecrisio" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scene-discord">Discord</Label>
              <Input id="scene-discord" value={data.discordHandle} onChange={(e) => update({ discordHandle: e.target.value })} placeholder="/crisio" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scene-instagram">Instagram</Label>
              <Input id="scene-instagram" value={data.instagramHandle} onChange={(e) => update({ instagramHandle: e.target.value })} placeholder="@thecrisio" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scene-game">Default-Game (In-Game-HUD)</Label>
              <Input id="scene-game" value={data.defaultGame} onChange={(e) => update({ defaultGame: e.target.value })} placeholder="Dark Souls III" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scene-mode">Default-Mode</Label>
              <Input id="scene-mode" value={data.defaultMode} onChange={(e) => update({ defaultMode: e.target.value })} placeholder="THERMOMIX-RUN · NG+2" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="scene-brb">BRB-Text (Zeilenumbrüche erlaubt)</Label>
            <textarea
              id="scene-brb"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.brbNote}
              onChange={(e) => update({ brbNote: e.target.value })}
              placeholder="Hol dir was zu trinken,&#10;der Thermomix wird gewartet.&#10;Gleich geht's weiter."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stream-Plan (Offline-Scene)</Label>
              <Button size="sm" variant="outline" onClick={addPlanRow}>
                <Plus className="h-3 w-3 mr-1" /> Eintrag
              </Button>
            </div>
            {data.streamPlan.length === 0 && (
              <p className="text-xs text-muted-foreground">Noch keine Einträge — füge deinen Stream-Plan oben hinzu.</p>
            )}
            {data.streamPlan.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={row.day}
                  onChange={(e) => updatePlanRow(i, { day: e.target.value })}
                  placeholder="MITTWOCH"
                  className="w-32"
                  aria-label={`Stream-Plan Zeile ${i + 1} Tag`}
                />
                <Input
                  value={row.time}
                  onChange={(e) => updatePlanRow(i, { time: e.target.value })}
                  placeholder="20:00"
                  className="w-24"
                  aria-label={`Stream-Plan Zeile ${i + 1} Uhrzeit`}
                />
                <Input
                  value={row.title}
                  onChange={(e) => updatePlanRow(i, { title: e.target.value })}
                  placeholder="Souls-Games auf absurden Controllern"
                  className="flex-1"
                  aria-label={`Stream-Plan Zeile ${i + 1} Titel`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePlanRow(i)}
                  aria-label={`Stream-Plan Zeile ${i + 1} entfernen`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Speichere..." : "Scene-Einstellungen speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const POSITION_OPTIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "center", label: "Center" },
];

function PollPredictionSettingsCard({ channelId }: { channelId: string }) {
  const [settings, setSettings] = useState<PollPredictionSettingsDto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [channelId]);

  const loadSettings = async () => {
    const res = await api.get<PollPredictionSettingsDto>(`/channels/${channelId}/poll-prediction-settings`);
    if (res.data) setSettings(res.data);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const body: UpdatePollPredictionSettingsDto = {
      pollEnabled: settings.pollEnabled,
      predictionEnabled: settings.predictionEnabled,
      resultDuration: settings.resultDuration,
      position: settings.position,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      accentColor: settings.accentColor,
      barHeight: settings.barHeight,
      width: settings.width,
      fontSize: settings.fontSize,
    };
    await api.patch(`/channels/${channelId}/poll-prediction-settings`, body);
    setSaving(false);
  };

  const update = (patch: Partial<PollPredictionSettingsDto>) => {
    if (settings) setSettings({ ...settings, ...patch });
  };

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Polls & Predictions Widget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Configure how Twitch Polls and Predictions are displayed in the overlay.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Polls Enabled</Label>
              <Switch checked={settings.pollEnabled} onCheckedChange={(v) => update({ pollEnabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Predictions Enabled</Label>
              <Switch checked={settings.predictionEnabled} onCheckedChange={(v) => update({ predictionEnabled: v })} />
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={settings.position} onChange={(e) => update({ position: e.target.value })}>
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Result Display Duration: {settings.resultDuration}s</Label>
              <Slider
                value={settings.resultDuration}
                onChange={(v) => update({ resultDuration: v })}
                min={10}
                max={300}
                step={5}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Background Color</Label>
              <ColorPicker value={settings.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <ColorPicker value={settings.textColor} onChange={(v) => update({ textColor: v })} />
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <ColorPicker value={settings.accentColor} onChange={(v) => update({ accentColor: v })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Widget Width: {settings.width}px</Label>
            <Slider value={settings.width} onChange={(v) => update({ width: v })} min={250} max={600} step={10} />
          </div>
          <div className="space-y-2">
            <Label>Bar Height: {settings.barHeight}px</Label>
            <Slider value={settings.barHeight} onChange={(v) => update({ barHeight: v })} min={16} max={48} step={2} />
          </div>
          <div className="space-y-2">
            <Label>Font Size: {settings.fontSize}px</Label>
            <Slider value={settings.fontSize} onChange={(v) => update({ fontSize: v })} min={10} max={28} step={1} />
          </div>
        </div>

        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
