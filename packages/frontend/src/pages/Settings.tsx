import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { ChannelEditorDto } from "@cristream/shared";

export function SettingsPage() {
  const { activeChannel: channel, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("channel");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Tabs
        tabs={[
          { key: "channel", label: "Channel" },
          { key: "casino", label: "Casino" },
          { key: "editors", label: "Editors" },
          { key: "account", label: "Account" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "channel" && <ChannelSettingsTab />}
      {activeTab === "casino" && channel && <CasinoSettingsTab channelId={channel.id} channelName={channel.displayName} />}
      {activeTab === "editors" && channel && <EditorsTab channelId={channel.id} />}
      {activeTab === "account" && <AccountTab />}
    </div>
  );
}

function ChannelSettingsTab() {
  const { activeChannel: channel, refreshChannels } = useAuthStore();
  const [prefix, setPrefix] = useState(channel?.commandPrefix ?? "!");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (channel) setPrefix(channel.commandPrefix);
  }, [channel]);

  const isDirty = !!channel && prefix !== channel.commandPrefix;

  const handleSave = async () => {
    if (!channel || !isDirty) return;
    setState("saving");
    try {
      const res = await api.patch(`/channels/${channel.id}`, { commandPrefix: prefix });
      if (res.error) throw new Error(res.error);
      setState("saved");
      await refreshChannels();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label =
    state === "saving" ? "Speichere..." :
    state === "saved"  ? "Gespeichert ✓" :
    state === "error"  ? "Fehler — erneut versuchen" :
    "Speichern";

  return (
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
            <Button
              onClick={handleSave}
              disabled={!isDirty || state === "saving"}
              className={state === "error" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {label}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditorsTab({ channelId }: { channelId: string }) {
  const [editors, setEditors] = useState<ChannelEditorDto[]>([]);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  useEffect(() => {
    loadEditors();
  }, [channelId]);

  const loadEditors = async () => {
    const res = await api.get<ChannelEditorDto[]>(`/channels/${channelId}/editors`);
    if (res.data) setEditors(res.data);
  };

  const handleInvite = async () => {
    if (!username.trim()) return;
    await api.post(`/channels/${channelId}/editors`, {
      twitchUsername: username.trim(),
      role,
    });
    setUsername("");
    loadEditors();
  };

  const handleRemove = async (id: string) => {
    await api.delete(`/channels/${channelId}/editors/${id}`);
    loadEditors();
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    await api.patch(`/channels/${channelId}/editors/${id}`, { role: newRole });
    loadEditors();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Editors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Twitch Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <Button onClick={handleInvite}>
            <Plus className="mr-2 h-4 w-4" /> Invite
          </Button>
        </div>

        <div className="space-y-2">
          {editors.map((editor) => (
            <div key={editor.id} className="flex items-center justify-between border-b py-2">
              <div className="flex items-center gap-3">
                {editor.avatarUrl && (
                  <img src={editor.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span className="font-medium text-sm">{editor.displayName}</span>
                <Badge variant="secondary">{editor.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={editor.role}
                  onChange={(e) => handleRoleChange(editor.id, e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => handleRemove(editor.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {editors.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No editors yet. Invite someone to help manage your channel.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const CASINO_FEATURES: { key: string; label: string; desc: string }[] = [
  { key: "casino", label: "Casino (Master)", desc: "Deaktiviert die gesamte Casino-Seite für Viewer" },
  { key: "gambling", label: "Gambling", desc: "Flip, Slots, Scratch, All-In, Glücksrad" },
  { key: "minigames", label: "Minigames", desc: "Snake, Connect4, Memory, Sudoku, Roulette, Poker, Dice, Over/Under" },
  { key: "casinoRun", label: "Casino Run", desc: "Endlos-Roguelike-Modus" },
  { key: "pets", label: "Pets", desc: "Pet-System, Breeding, Battles" },
  { key: "story", label: "Story Mode", desc: "Visual Novel mit 40 Kapiteln" },
  { key: "social", label: "Social", desc: "Gilden, Heist, Guild War" },
  { key: "progression", label: "Progression", desc: "Quests, Achievements, Battle Pass, Skill Tree" },
  { key: "dailyChallenge", label: "Daily Challenge", desc: "Tägliche Community-Challenge" },
  { key: "jackpot", label: "Jackpot", desc: "Progressiver Community-Jackpot" },
  { key: "luckyHour", label: "Lucky Hour", desc: "Zufällige Bonus-Events" },
  { key: "music", label: "Musik", desc: "Adaptive Musik-Button sichtbar" },
];

function CasinoSettingsTab({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any>(`/channels/${channelId}/casino-settings`) as any;
        // Fallback: try viewer endpoint if channel endpoint doesn't exist
        if (res.data) {
          setSettings(res.data);
        } else {
          // Use the viewer/public endpoint
          const res2 = await api.get<any>(`/viewer/${channelName}/casino/features`) as any;
          if (res2.data) setSettings(res2.data);
        }
      } catch {
        try {
          const res2 = await api.get<any>(`/viewer/${channelName}/casino/features`) as any;
          if (res2.data) setSettings(res2.data);
        } catch {}
      }
      setLoading(false);
    })();
  }, [channelId, channelName]);

  const toggle = async (key: string) => {
    const newVal = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newVal }));
    setSaving(key);
    try {
      await api.patch(`/viewer/${channelName}/casino/settings`, { [key]: newVal });
    } catch {}
    setSaving(null);
  };

  if (loading) return <Card><CardContent className="p-6 text-muted-foreground">Laden...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Casino Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground mb-4">
          Aktiviere oder deaktiviere einzelne Casino-Features für deinen Channel.
          Änderungen wirken sofort für alle Viewer.
        </p>
        {CASINO_FEATURES.map(f => (
          <div key={f.key} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <div className="text-sm font-medium">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
            <Switch
              checked={settings[f.key] !== false}
              onCheckedChange={() => toggle(f.key)}
              disabled={saving === f.key}
              aria-label={`${f.label} ${settings[f.key] !== false ? "deaktivieren" : "aktivieren"}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AccountTab() {
  const { activeChannel: channel, user } = useAuthStore();

  return (
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
  );
}
