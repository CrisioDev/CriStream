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
  const { activeChannel } = useAuthStore();
  const [commands, setCommands] = useState<CommandDto[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateCommandDto & { aliasesStr: string; chainStr: string }>({
    trigger: "",
    response: "",
    cooldownSeconds: 5,
    perUserCooldown: false,
    userLevel: "everyone",
    enabled: true,
    aliases: [],
    chain: [],
    aliasesStr: "",
    chainStr: "",
  });
  const [editForm, setEditForm] = useState<UpdateCommandDto & { aliasesStr: string; chainStr: string }>({
    aliasesStr: "",
    chainStr: "",
  });

  useEffect(() => {
    if (activeChannel) loadCommands();
  }, [activeChannel]);

  const loadCommands = async () => {
    if (!activeChannel) return;
    const res = await api.get<CommandDto[]>(`/channels/${activeChannel.id}/commands`);
    if (res.data) setCommands(res.data);
  };

  const parseList = (str: string): string[] =>
    str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleCreate = async () => {
    if (!activeChannel) return;
    await api.post(`/channels/${activeChannel.id}/commands`, {
      trigger: form.trigger,
      response: form.response,
      cooldownSeconds: form.cooldownSeconds,
      perUserCooldown: form.perUserCooldown,
      userLevel: form.userLevel,
      enabled: form.enabled,
      aliases: parseList(form.aliasesStr),
      chain: parseList(form.chainStr),
    });
    setShowCreate(false);
    setForm({ trigger: "", response: "", cooldownSeconds: 5, perUserCooldown: false, userLevel: "everyone", enabled: true, aliases: [], chain: [], aliasesStr: "", chainStr: "" });
    loadCommands();
  };

  const startEdit = (cmd: CommandDto) => {
    setEditing(cmd.id);
    setEditForm({
      trigger: cmd.trigger,
      response: cmd.response,
      cooldownSeconds: cmd.cooldownSeconds,
      perUserCooldown: cmd.perUserCooldown,
      userLevel: cmd.userLevel,
      enabled: cmd.enabled,
      aliases: cmd.aliases,
      chain: cmd.chain,
      aliasesStr: cmd.aliases.join(", "),
      chainStr: cmd.chain.join(", "),
    });
  };

  const handleUpdate = async (id: string, data?: UpdateCommandDto) => {
    if (!activeChannel) return;
    const payload = data ?? {
      trigger: editForm.trigger,
      response: editForm.response,
      cooldownSeconds: editForm.cooldownSeconds,
      perUserCooldown: editForm.perUserCooldown,
      userLevel: editForm.userLevel,
      enabled: editForm.enabled,
      aliases: parseList(editForm.aliasesStr),
      chain: parseList(editForm.chainStr),
    };
    await api.patch(`/channels/${activeChannel.id}/commands/${id}`, payload);
    setEditing(null);
    loadCommands();
  };

  const handleDelete = async (id: string) => {
    if (!activeChannel) return;
    await api.delete(`/channels/${activeChannel.id}/commands/${id}`);
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
                <p className="text-xs text-muted-foreground mt-1">
                  $(user) $(channel) $(query) $(touser) $(count) $(points) $(watchtime) $(rank) $(game) $(title) $(viewers) $(followers) $(time) $(date) $(random) $(1) $(2) $(uptime) $(customapi.URL)
                </p>
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
              <div>
                <Label>Aliases (comma-separated)</Label>
                <Input value={form.aliasesStr} onChange={(e) => setForm({ ...form, aliasesStr: e.target.value })} placeholder="hi, hey, greet" />
              </div>
              <div>
                <Label>Chain (comma-separated triggers)</Label>
                <Input value={form.chainStr} onChange={(e) => setForm({ ...form, chainStr: e.target.value })} placeholder="discord, twitter" />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.perUserCooldown ?? false}
                  onCheckedChange={(checked) => setForm({ ...form, perUserCooldown: checked })}
                />
                <Label>Per-User Cooldown</Label>
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
                    <div>
                      <Label>Aliases (comma-separated)</Label>
                      <Input
                        value={editForm.aliasesStr}
                        onChange={(e) => setEditForm({ ...editForm, aliasesStr: e.target.value })}
                        placeholder="hi, hey"
                      />
                    </div>
                    <div>
                      <Label>Chain (comma-separated triggers)</Label>
                      <Input
                        value={editForm.chainStr}
                        onChange={(e) => setEditForm({ ...editForm, chainStr: e.target.value })}
                        placeholder="discord, twitter"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.perUserCooldown ?? false}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, perUserCooldown: checked })}
                      />
                      <Label>Per-User Cooldown</Label>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-primary font-semibold">!{cmd.trigger}</code>
                      <Badge variant="secondary">{cmd.userLevel}</Badge>
                      <Badge variant={cmd.enabled ? "default" : "outline"}>
                        {cmd.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{cmd.useCount} uses</span>
                      {cmd.perUserCooldown && (
                        <Badge variant="outline">Per-User CD</Badge>
                      )}
                      {cmd.aliases.length > 0 && (
                        <Badge variant="outline">Aliases: {cmd.aliases.join(", ")}</Badge>
                      )}
                      {cmd.chain.length > 0 && (
                        <Badge variant="outline">Chain: {cmd.chain.join(" → ")}</Badge>
                      )}
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
