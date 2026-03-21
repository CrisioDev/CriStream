import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Minus, PlusIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { CounterDto } from "@cristream/shared";

export function CountersPage() {
  const { activeChannel: channel } = useAuthStore();
  const [counters, setCounters] = useState<CounterDto[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (channel) loadCounters();
  }, [channel]);

  const loadCounters = async () => {
    if (!channel) return;
    const res = await api.get<CounterDto[]>(`/channels/${channel.id}/counters`);
    if (res.data) setCounters(res.data);
  };

  const addCounter = async () => {
    if (!channel || !newName.trim()) return;
    const res = await api.post<CounterDto>(`/channels/${channel.id}/counters`, { name: newName.trim() });
    if (res.data) {
      setCounters((prev) => [...prev, res.data!]);
      setNewName("");
    }
  };

  const deleteCounter = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/counters/${id}`);
    setCounters((prev) => prev.filter((c) => c.id !== id));
  };

  const updateValue = async (id: string, value: number) => {
    if (!channel) return;
    const res = await api.patch<CounterDto>(`/channels/${channel.id}/counters/${id}`, { value });
    if (res.data) {
      setCounters((prev) => prev.map((c) => (c.id === id ? res.data! : c)));
    }
  };

  const setCounterValue = async (id: string, valueStr: string) => {
    const value = parseInt(valueStr, 10);
    if (isNaN(value)) return;
    await updateValue(id, value);
  };

  if (!channel) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Counters</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCounter()}
              placeholder="Counter name (e.g. deaths, wins)"
              className="flex-1"
            />
            <Button onClick={addCounter} disabled={!newName.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {counters.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No counters yet. Create one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counters.map((counter) => (
            <Card key={counter.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{counter.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => deleteCounter(counter.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateValue(counter.id, counter.value - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={counter.value}
                    onChange={(e) => setCounterValue(counter.id, e.target.value)}
                    className="w-24 text-center text-2xl font-bold"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateValue(counter.id, counter.value + 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Chat: <code className="bg-muted px-1 rounded">!{counter.name}+</code> / <code className="bg-muted px-1 rounded">!{counter.name}-</code> (Mod only)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Variable: <code className="bg-muted px-1 rounded">$(counter.{counter.name})</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Chat commands</strong> (Mod/Broadcaster only):</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code className="bg-muted px-1 rounded">!name+</code> — increment counter</li>
            <li><code className="bg-muted px-1 rounded">!name-</code> — decrement counter</li>
            <li><code className="bg-muted px-1 rounded">!name</code> — show current value</li>
          </ul>
          <p className="pt-2"><strong>In command responses</strong>:</p>
          <p>Use <code className="bg-muted px-1 rounded">$(counter.name)</code> to display a counter value in any command response.</p>
          <p>Example: <code className="bg-muted px-1 rounded">Deaths today: $(counter.deaths)</code></p>
        </CardContent>
      </Card>
    </div>
  );
}
