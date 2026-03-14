import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";

export function SettingsPage() {
  const { channel, user } = useAuthStore();
  const [prefix, setPrefix] = useState(channel?.commandPrefix ?? "!");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (channel) setPrefix(channel.commandPrefix);
  }, [channel]);

  const handleSave = async () => {
    if (!channel) return;
    await api.patch(`/channels/${channel.id}`, { commandPrefix: prefix });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Channel Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Command Prefix</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-24"
                maxLength={3}
              />
              <Button onClick={handleSave}>
                {saved ? "Saved!" : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Display Name:</span> {user?.displayName}</p>
          <p><span className="text-muted-foreground">Twitch ID:</span> {user?.twitchId}</p>
          <p><span className="text-muted-foreground">Channel ID:</span> {channel?.id}</p>
        </CardContent>
      </Card>
    </div>
  );
}
