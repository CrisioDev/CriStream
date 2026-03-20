import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { PointsSettingsDto, UpdatePointsSettingsDto, LeaderboardEntry } from "@cristream/shared";

export function PointsPage() {
  const { activeChannel: channel } = useAuthStore();
  const [settings, setSettings] = useState<PointsSettingsDto | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (channel) {
      loadSettings();
      loadLeaderboard();
    }
  }, [channel]);

  const loadSettings = async () => {
    if (!channel) return;
    const res = await api.get<PointsSettingsDto>(`/channels/${channel.id}/points/settings`);
    if (res.data) setSettings(res.data);
  };

  const loadLeaderboard = async () => {
    if (!channel) return;
    const res = await api.get<LeaderboardEntry[]>(`/channels/${channel.id}/points/leaderboard`);
    if (res.data) setLeaderboard(res.data);
  };

  const update = async (data: UpdatePointsSettingsDto) => {
    if (!channel) return;
    const res = await api.patch<PointsSettingsDto>(`/channels/${channel.id}/points/settings`, data);
    if (res.data) setSettings(res.data);
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Points / Loyalty</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Settings</CardTitle>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Points per Message</Label>
              <Input
                type="number"
                value={settings.pointsPerMessage}
                onChange={(e) => update({ pointsPerMessage: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Points per Interval</Label>
              <Input
                type="number"
                value={settings.pointsPerInterval}
                onChange={(e) => update({ pointsPerInterval: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Interval (minutes)</Label>
              <Input
                type="number"
                value={settings.intervalMinutes}
                onChange={(e) => update({ intervalMinutes: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leaderboard</CardTitle>
          <Button variant="outline" size="sm" onClick={loadLeaderboard}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {leaderboard.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">No users yet.</p>
            )}
            <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground border-b pb-2">
              <span>Rank</span>
              <span>User</span>
              <span className="text-right">Points</span>
              <span className="text-right">Watch Time</span>
            </div>
            {leaderboard.map((entry) => (
              <div key={entry.twitchUserId} className="grid grid-cols-4 text-sm py-1.5 border-b">
                <span className="font-mono text-muted-foreground">#{entry.rank}</span>
                <span className="font-medium truncate">{entry.displayName}</span>
                <span className="text-right font-mono">{entry.points.toLocaleString()}</span>
                <span className="text-right text-muted-foreground">
                  {Math.floor(entry.watchMinutes / 60)}h {entry.watchMinutes % 60}m
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
