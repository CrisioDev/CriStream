import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, X, Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { TimerDto, CreateTimerDto, UpdateTimerDto } from "@streamguard/shared";

export function TimersPage() {
  const { channel } = useAuthStore();
  const [timers, setTimers] = useState<TimerDto[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateTimerDto>({
    name: "",
    message: "",
    intervalMinutes: 15,
    minChatLines: 5,
    enabled: true,
  });
  const [editForm, setEditForm] = useState<UpdateTimerDto>({});

  useEffect(() => {
    if (channel) loadTimers();
  }, [channel]);

  const loadTimers = async () => {
    if (!channel) return;
    const res = await api.get<TimerDto[]>(`/channels/${channel.id}/timers`);
    if (res.data) setTimers(res.data);
  };

  const handleCreate = async () => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/timers`, form);
    setShowCreate(false);
    setForm({ name: "", message: "", intervalMinutes: 15, minChatLines: 5, enabled: true });
    loadTimers();
  };

  const startEdit = (timer: TimerDto) => {
    setEditing(timer.id);
    setEditForm({
      name: timer.name,
      message: timer.message,
      intervalMinutes: timer.intervalMinutes,
      minChatLines: timer.minChatLines,
      enabled: timer.enabled,
    });
  };

  const handleUpdate = async (id: string, data?: UpdateTimerDto) => {
    if (!channel) return;
    await api.patch(`/channels/${channel.id}/timers/${id}`, data ?? editForm);
    setEditing(null);
    loadTimers();
  };

  const handleDelete = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/timers/${id}`);
    loadTimers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Timers</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showCreate ? "Cancel" : "Add Timer"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Timer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="follow-reminder" />
              </div>
              <div>
                <Label>Message</Label>
                <Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Don't forget to follow!" />
              </div>
              <div>
                <Label>Interval (minutes)</Label>
                <Input type="number" value={form.intervalMinutes} onChange={(e) => setForm({ ...form, intervalMinutes: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Min Chat Lines</Label>
                <Input type="number" value={form.minChatLines} onChange={(e) => setForm({ ...form, minChatLines: parseInt(e.target.value) })} />
              </div>
            </div>
            <Button onClick={handleCreate}>Create Timer</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {timers.map((timer) => (
          <Card key={timer.id}>
            <CardContent className="p-4">
              {editing === timer.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={editForm.name ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Input
                        value={editForm.message ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Interval (minutes)</Label>
                      <Input
                        type="number"
                        value={editForm.intervalMinutes ?? 15}
                        onChange={(e) => setEditForm({ ...editForm, intervalMinutes: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Min Chat Lines</Label>
                      <Input
                        type="number"
                        value={editForm.minChatLines ?? 5}
                        onChange={(e) => setEditForm({ ...editForm, minChatLines: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(timer.id)}>
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
                      <span className="font-semibold">{timer.name}</span>
                      <Badge variant="secondary">Every {timer.intervalMinutes}m</Badge>
                      <Badge variant="outline">Min {timer.minChatLines} lines</Badge>
                      <Badge variant={timer.enabled ? "default" : "outline"}>
                        {timer.enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{timer.message}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Switch
                      checked={timer.enabled}
                      onCheckedChange={(checked) => handleUpdate(timer.id, { enabled: checked })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => startEdit(timer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(timer.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {timers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No timers yet. Click "Add Timer" to get started.</p>
        )}
      </div>
    </div>
  );
}
