import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, X, Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { CommandDto, CreateCommandDto, UpdateCommandDto } from "@streamguard/shared";
import { USER_LEVELS } from "@streamguard/shared";

export function CommandsPage() {
  const { channel } = useAuthStore();
  const [commands, setCommands] = useState<CommandDto[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateCommandDto>({
    trigger: "",
    response: "",
    cooldownSeconds: 5,
    userLevel: "everyone",
    enabled: true,
  });
  const [editForm, setEditForm] = useState<UpdateCommandDto>({});

  useEffect(() => {
    if (channel) loadCommands();
  }, [channel]);

  const loadCommands = async () => {
    if (!channel) return;
    const res = await api.get<CommandDto[]>(`/channels/${channel.id}/commands`);
    if (res.data) setCommands(res.data);
  };

  const handleCreate = async () => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/commands`, form);
    setShowCreate(false);
    setForm({ trigger: "", response: "", cooldownSeconds: 5, userLevel: "everyone", enabled: true });
    loadCommands();
  };

  const startEdit = (cmd: CommandDto) => {
    setEditing(cmd.id);
    setEditForm({
      trigger: cmd.trigger,
      response: cmd.response,
      cooldownSeconds: cmd.cooldownSeconds,
      userLevel: cmd.userLevel,
      enabled: cmd.enabled,
    });
  };

  const handleUpdate = async (id: string, data?: UpdateCommandDto) => {
    if (!channel) return;
    await api.patch(`/channels/${channel.id}/commands/${id}`, data ?? editForm);
    setEditing(null);
    loadCommands();
  };

  const handleDelete = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/commands/${id}`);
    loadCommands();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Commands</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showCreate ? "Cancel" : "Add Command"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Command</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Trigger</Label>
                <Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="hello" />
              </div>
              <div>
                <Label>Response</Label>
                <Input value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} placeholder="Hello $(user)!" />
              </div>
              <div>
                <Label>Cooldown (seconds)</Label>
                <Input type="number" value={form.cooldownSeconds} onChange={(e) => setForm({ ...form, cooldownSeconds: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>User Level</Label>
                <Select value={form.userLevel} onChange={(e) => setForm({ ...form, userLevel: e.target.value as any })}>
                  {USER_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate}>Create Command</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {commands.map((cmd) => (
          <Card key={cmd.id}>
            <CardContent className="p-4">
              {editing === cmd.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Trigger</Label>
                      <Input
                        value={editForm.trigger ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Response</Label>
                      <Input
                        value={editForm.response ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, response: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Cooldown (seconds)</Label>
                      <Input
                        type="number"
                        value={editForm.cooldownSeconds ?? 5}
                        onChange={(e) => setEditForm({ ...editForm, cooldownSeconds: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>User Level</Label>
                      <Select
                        value={editForm.userLevel ?? "everyone"}
                        onChange={(e) => setEditForm({ ...editForm, userLevel: e.target.value as any })}
                      >
                        {USER_LEVELS.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(cmd.id)}>
                      <Check className="mr-2 h-4 w-4" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-primary font-semibold">!{cmd.trigger}</code>
                      <Badge variant="secondary">{cmd.userLevel}</Badge>
                      <Badge variant={cmd.enabled ? "default" : "outline"}>
                        {cmd.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{cmd.useCount} uses</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{cmd.response}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Switch
                      checked={cmd.enabled}
                      onCheckedChange={(checked) => handleUpdate(cmd.id, { enabled: checked })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => startEdit(cmd)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(cmd.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {commands.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No commands yet. Click "Add Command" to get started.</p>
        )}
      </div>
    </div>
  );
}
