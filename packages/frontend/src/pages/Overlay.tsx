import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { Copy, ExternalLink, Save } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type { PollPredictionSettingsDto, UpdatePollPredictionSettingsDto } from "@streamguard/shared";

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
      <h1 className="text-3xl font-bold">OBS Overlay</h1>

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
