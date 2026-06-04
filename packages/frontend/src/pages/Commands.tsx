import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Trash2, Plus, Pencil, X, Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { CommandDto, CreateCommandDto, UpdateCommandDto } from "@cristream/shared";
import { USER_LEVELS } from "@cristream/shared";

export function CommandsPage() {
  const { activeChannel } = useAuthStore();
  const [commands, setCommands] = useState<CommandDto[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (activeChannel) {
      // Clear stale rows immediately so the user doesn't see the previous
      // channel's commands during the fetch.
      setCommands([]);
      loadCommands();
    }
  }, [activeChannel?.id]);

  const loadCommands = async () => {
    if (!activeChannel) return;
    setLoading(true);
    try {
      const res = await api.get<CommandDto[]>(`/channels/${activeChannel.id}/commands`);
      if (res.data) setCommands(res.data);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-semibold">Commands</h1>
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
                  {/* Body dimmed when disabled so the row's status is readable
                      at a glance — controls stay full-opacity and clickable. */}
                  <div className={`flex-1 ${cmd.enabled ? "" : "opacity-50"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-primary font-semibold">!{cmd.trigger}</code>
                      <Badge variant="secondary">{cmd.userLevel}</Badge>
                      <span className="text-xs text-muted-foreground">{cmd.useCount} uses</span>
                      {cmd.perUserCooldown && (
                        <Badge variant="outline">Per-User CD</Badge>
                      )}
                      {cmd.aliases.length > 0 && (
                        <Badge variant="outline" title={`Aliases: ${cmd.aliases.join(", ")}`}>
                          {cmd.aliases.length <= 3
                            ? `Aliases: ${cmd.aliases.join(", ")}`
                            : `Aliases: ${cmd.aliases.slice(0, 3).join(", ")} +${cmd.aliases.length - 3}`}
                        </Badge>
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
                      aria-label={`Command !${cmd.trigger} ${cmd.enabled ? "deaktivieren" : "aktivieren"}`}
                    />
                    <Button size="icon" variant="ghost" onClick={() => startEdit(cmd)} aria-label={`Command !${cmd.trigger} bearbeiten`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {/* Visual + spatial separator so toggle and destructive
                        delete don't share the same hit-zone (Fitt's Law). */}
                    <div className="ml-2 border-l pl-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Command "!${cmd.trigger}" wirklich löschen?`)) handleDelete(cmd.id);
                        }}
                        aria-label={`Command !${cmd.trigger} löschen`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {loading && commands.length === 0 && <ListSkeleton rows={4} />}
        {!loading && commands.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No commands yet. Click "Add Command" to get started.</p>
        )}
      </div>
    </div>
  );
}
