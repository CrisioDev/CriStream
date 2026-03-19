import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Trash2, Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { ChannelEditorDto } from "@streamguard/shared";

export function SettingsPage() {
  const { activeChannel: channel, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("channel");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Tabs
        tabs={[
          { key: "channel", label: "Channel" },
          { key: "editors", label: "Editors" },
          { key: "account", label: "Account" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "channel" && <ChannelSettingsTab />}
      {activeTab === "editors" && channel && <EditorsTab channelId={channel.id} />}
      {activeTab === "account" && <AccountTab />}
    </div>
  );
}

function ChannelSettingsTab() {
  const { activeChannel: channel } = useAuthStore();
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
