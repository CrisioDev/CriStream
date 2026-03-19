import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/api/client";
import type { ModerationSettingsDto, ModerationActionDto, UpdateModerationSettingsDto, BannedWordDto } from "@streamguard/shared";

export function ModerationPage() {
  const { activeChannel: channel } = useAuthStore();
  const { on } = useSocket();
  const [settings, setSettings] = useState<ModerationSettingsDto | null>(null);
  const [log, setLog] = useState<ModerationActionDto[]>([]);
  const [bannedWords, setBannedWords] = useState<BannedWordDto[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newWordIsRegex, setNewWordIsRegex] = useState(false);

  useEffect(() => {
    if (channel) {
      loadSettings();
      loadLog();
      loadBannedWords();
    }
  }, [channel]);

  useEffect(() => {
    const unsub = on("moderation:action", (action) => {
      setLog((prev) => [action, ...prev].slice(0, 50));
    });
    return unsub;
  }, [on]);

  const loadSettings = async () => {
    if (!channel) return;
    const res = await api.get<ModerationSettingsDto>(`/channels/${channel.id}/moderation`);
    if (res.data) setSettings(res.data);
  };

  const loadLog = async () => {
    if (!channel) return;
    const res = await api.get<ModerationActionDto[]>(`/channels/${channel.id}/moderation/log`);
    if (res.data) setLog(res.data);
  };

  const loadBannedWords = async () => {
    if (!channel) return;
    const res = await api.get<BannedWordDto[]>(`/channels/${channel.id}/moderation/banned-words`);
    if (res.data) setBannedWords(res.data);
  };

  const update = async (data: UpdateModerationSettingsDto) => {
    if (!channel) return;
    const res = await api.patch<ModerationSettingsDto>(`/channels/${channel.id}/moderation`, data);
    if (res.data) setSettings(res.data);
  };

  const addBannedWord = async () => {
    if (!channel || !newWord.trim()) return;
    await api.post(`/channels/${channel.id}/moderation/banned-words`, {
      pattern: newWord.trim(),
      isRegex: newWordIsRegex,
    });
    setNewWord("");
    setNewWordIsRegex(false);
    loadBannedWords();
  };

  const deleteBannedWord = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/moderation/banned-words/${id}`);
    loadBannedWords();
  };

  if (!settings) return null;

  const filters = [
    {
      key: "links" as const,
      title: "Link Filter",
      enabled: settings.linksEnabled,
      fields: [{ label: "Timeout (sec)", key: "linksTimeoutDuration" as const, value: settings.linksTimeoutDuration }],
    },
    {
      key: "caps" as const,
      title: "Caps Filter",
      enabled: settings.capsEnabled,
      fields: [
        { label: "Min Length", key: "capsMinLength" as const, value: settings.capsMinLength },
        { label: "Threshold (%)", key: "capsThreshold" as const, value: settings.capsThreshold },
        { label: "Timeout (sec)", key: "capsTimeoutDuration" as const, value: settings.capsTimeoutDuration },
      ],
    },
    {
      key: "symbols" as const,
      title: "Symbol Filter",
      enabled: settings.symbolsEnabled,
      fields: [
        { label: "Threshold (%)", key: "symbolsThreshold" as const, value: settings.symbolsThreshold },
        { label: "Timeout (sec)", key: "symbolsTimeoutDuration" as const, value: settings.symbolsTimeoutDuration },
      ],
    },
    {
      key: "emotes" as const,
      title: "Emote Filter",
      enabled: settings.emotesEnabled,
      fields: [
        { label: "Max Emotes", key: "emotesMaxCount" as const, value: settings.emotesMaxCount },
        { label: "Timeout (sec)", key: "emotesTimeoutDuration" as const, value: settings.emotesTimeoutDuration },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Moderation</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {filters.map((filter) => (
          <Card key={filter.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{filter.title}</CardTitle>
              <Switch
                checked={filter.enabled}
                onCheckedChange={(checked) =>
                  update({ [`${filter.key}Enabled`]: checked } as any)
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {filter.fields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="w-32 text-sm">{field.label}</Label>
                  <Input
                    type="number"
                    value={field.value}
                    className="w-24"
                    onChange={(e) =>
                      update({ [field.key]: parseInt(e.target.value) } as any)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Spam Filter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Spam Filter</CardTitle>
            <Switch
              checked={settings.spamEnabled}
              onCheckedChange={(checked) => update({ spamEnabled: checked })}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="w-32 text-sm">Max Repeats</Label>
              <Input
                type="number"
                value={settings.spamMaxRepeat}
                className="w-24"
                onChange={(e) => update({ spamMaxRepeat: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32 text-sm">Window (sec)</Label>
              <Input
                type="number"
                value={settings.spamWindowSeconds}
                className="w-24"
                onChange={(e) => update({ spamWindowSeconds: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32 text-sm">Timeout (sec)</Label>
              <Input
                type="number"
                value={settings.spamTimeoutDuration}
                className="w-24"
                onChange={(e) => update({ spamTimeoutDuration: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Banned Words */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Banned Words</CardTitle>
            <Switch
              checked={settings.bannedWordsEnabled}
              onCheckedChange={(checked) => update({ bannedWordsEnabled: checked })}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="w-32 text-sm">Timeout (sec)</Label>
              <Input
                type="number"
                value={settings.bannedWordsTimeoutDuration}
                className="w-24"
                onChange={(e) => update({ bannedWordsTimeoutDuration: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Pattern</Label>
                <Input
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="bad word or regex..."
                  onKeyDown={(e) => e.key === "Enter" && addBannedWord()}
                />
              </div>
              <label className="flex items-center gap-1 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={newWordIsRegex}
                  onChange={(e) => setNewWordIsRegex(e.target.checked)}
                  className="rounded"
                />
                Regex
              </label>
              <Button size="sm" onClick={addBannedWord}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {bannedWords.map((word) => (
                <div key={word.id} className="flex items-center justify-between text-sm border-b py-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{word.pattern}</code>
                    {word.isRegex && <Badge variant="outline">Regex</Badge>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteBannedWord(word.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {bannedWords.length === 0 && (
                <p className="text-xs text-muted-foreground">No banned words yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Log */}
      <Card>
        <CardHeader>
          <CardTitle>Action Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {log.length === 0 && (
              <p className="text-muted-foreground text-sm">No moderation actions yet.</p>
            )}
            {log.map((action) => (
              <div key={action.id} className="flex items-center gap-3 text-sm border-b pb-2">
                <Badge variant="destructive">{action.filterName}</Badge>
                <span className="font-medium">{action.targetUser}</span>
                <span className="text-muted-foreground">
                  {action.action} {action.duration}s
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(action.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
