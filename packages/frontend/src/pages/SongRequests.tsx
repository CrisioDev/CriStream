import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Copy, ExternalLink, SkipForward, Trash2, Volume2, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/api/client";
import type { SongRequestDto, SongRequestSettingsDto, UpdateSongRequestSettingsDto } from "@streamguard/shared";

export function SongRequestsPage() {
  const { activeChannel: channel } = useAuthStore();
  const { on, emit } = useSocket();
  const [settings, setSettings] = useState<SongRequestSettingsDto | null>(null);
  const [queue, setQueue] = useState<SongRequestDto[]>([]);
  const [nowPlaying, setNowPlaying] = useState<SongRequestDto | null>(null);
  const [playerVolume, setPlayerVolume] = useState(80);
  const [copiedPlayer, setCopiedPlayer] = useState(false);

  useEffect(() => {
    if (channel) {
      loadSettings();
      loadQueue();
    }
  }, [channel]);

  useEffect(() => {
    const unsub1 = on("songrequest:added", (data) => {
      if (data.channelId === channel?.id) {
        setQueue((prev) => [...prev, data.request]);
      }
    });
    const unsub2 = on("songrequest:skipped", (data) => {
      if (data.channelId === channel?.id) {
        setQueue((prev) => prev.slice(1));
      }
    });
    const unsub3 = on("songrequest:queue", (data) => {
      if (data.channelId === channel?.id) {
        setQueue(data.queue);
      }
    });
    const unsub4 = on("songrequest:play", (data) => {
      if (data.channelId === channel?.id) {
        setNowPlaying(data.song);
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [on, channel]);

  const loadSettings = async () => {
    if (!channel) return;
    const res = await api.get<SongRequestSettingsDto>(`/channels/${channel.id}/songrequests/settings`);
    if (res.data) setSettings(res.data);
  };

  const loadQueue = async () => {
    if (!channel) return;
    const res = await api.get<SongRequestDto[]>(`/channels/${channel.id}/songrequests/queue`);
    if (res.data) setQueue(res.data);
  };

  const update = async (data: UpdateSongRequestSettingsDto) => {
    if (!channel) return;
    const res = await api.patch<SongRequestSettingsDto>(`/channels/${channel.id}/songrequests/settings`, data);
    if (res.data) setSettings(res.data);
  };

  const skip = async () => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/songrequests/skip`, {});
    loadQueue();
  };

  const remove = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/songrequests/queue/${id}`);
    loadQueue();
  };

  const clearQueue = async () => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/songrequests/queue`);
    setQueue([]);
  };

  const playerUrl = channel ? `${window.location.origin}/overlay/${channel.overlayToken}/player` : "";

  const handleCopyPlayer = () => {
    navigator.clipboard.writeText(playerUrl);
    setCopiedPlayer(true);
    setTimeout(() => setCopiedPlayer(false), 2000);
  };

  const handleVolumeChange = (v: number) => {
    setPlayerVolume(v);
    if (channel) {
      emit("songrequest:volume", { channelId: channel.id, volume: v });
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Song Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>Player Overlay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this URL as a Browser Source in OBS to play song requests on stream.
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
          {nowPlaying && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
              <Badge variant="default">Now Playing</Badge>
              <span className="font-medium truncate flex-1">{nowPlaying.title}</span>
              <span className="text-xs text-muted-foreground">by {nowPlaying.requestedBy}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Label className="w-24">Volume ({playerVolume}%)</Label>
            <div className="flex-1">
              <Slider value={playerVolume} onChange={handleVolumeChange} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Settings</CardTitle>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Max Queue Size</Label>
              <Input
                type="number"
                value={settings.maxQueueSize}
                onChange={(e) => update({ maxQueueSize: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Max Duration (sec)</Label>
              <Input
                type="number"
                value={settings.maxDurationSeconds}
                onChange={(e) => update({ maxDurationSeconds: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>User Cooldown (sec)</Label>
              <Input
                type="number"
                value={settings.userCooldownSeconds}
                onChange={(e) => update({ userCooldownSeconds: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Queue ({queue.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={skip} disabled={queue.length === 0}>
              <SkipForward className="mr-2 h-4 w-4" /> Skip
            </Button>
            <Button variant="destructive" size="sm" onClick={clearQueue} disabled={queue.length === 0}>
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {queue.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Queue is empty. Users can request songs with !sr in chat.
              </p>
            )}
            {queue.map((song, i) => (
              <div key={song.id} className="flex items-center gap-3 text-sm border-b py-2">
                <span className="font-mono text-muted-foreground w-8">
                  {i === 0 ? (
                    <Badge variant="default">Now</Badge>
                  ) : (
                    `#${i + 1}`
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  {song.url && (
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {song.url}
                    </a>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  by {song.requestedBy}
                </span>
                <Button size="icon" variant="ghost" onClick={() => remove(song.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
