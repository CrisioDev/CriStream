import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type {
  LootboxSettingsDto,
  LootboxItemDto,
  ViewerInventoryItemDto,
  LootboxItemType,
  LootboxRarity,
} from "@cristream/shared";

const ITEM_TYPES: { value: LootboxItemType; label: string }[] = [
  { value: "title", label: "Chat Title" },
  { value: "bonus_points", label: "Bonus Points" },
  { value: "card", label: "Collectible Card" },
  { value: "sound", label: "Sound Effect" },
  { value: "action_token", label: "Action Token" },
  { value: "point_multiplier", label: "Point Multiplier" },
];

const RARITIES: { value: LootboxRarity; label: string; color: string }[] = [
  { value: "common", label: "Common", color: "bg-gray-500" },
  { value: "uncommon", label: "Uncommon", color: "bg-green-500" },
  { value: "rare", label: "Rare", color: "bg-blue-500" },
  { value: "epic", label: "Epic", color: "bg-purple-500" },
  { value: "legendary", label: "Legendary", color: "bg-yellow-500" },
];

export function LootboxPage() {
  const { activeChannel: channel } = useAuthStore();
  const [activeTab, setActiveTab] = useState("settings");

  if (!channel) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Lootbox</h1>
      <Tabs
        tabs={[
          { key: "settings", label: "Settings" },
          { key: "items", label: "Items" },
          { key: "inventory", label: "Viewer Inventory" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      {activeTab === "settings" && <SettingsTab channelId={channel.id} />}
      {activeTab === "items" && <ItemsTab channelId={channel.id} />}
      {activeTab === "inventory" && <InventoryTab channelId={channel.id} />}
    </div>
  );
}

// ── Settings Tab ──

function SettingsTab({ channelId }: { channelId: string }) {
  const [settings, setSettings] = useState<LootboxSettingsDto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<LootboxSettingsDto>(`/channels/${channelId}/lootbox/settings`).then((r) => {
      if (r.data) setSettings(r.data);
    });
  }, [channelId]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    await api.patch(`/channels/${channelId}/lootbox/settings`, {
      enabled: settings.enabled,
      cost: settings.cost,
      cooldownSeconds: settings.cooldownSeconds,
    });
    setSaving(false);
  };

  if (!settings) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Lootbox Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enabled</Label>
          <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
        </div>
        <div className="space-y-2">
          <Label>Cost (Points): {settings.cost}</Label>
          <Slider value={settings.cost} onChange={(v) => setSettings({ ...settings, cost: v })} min={1} max={10000} step={10} />
        </div>
        <div className="space-y-2">
          <Label>Cooldown (Seconds): {settings.cooldownSeconds}</Label>
          <Slider value={settings.cooldownSeconds} onChange={(v) => setSettings({ ...settings, cooldownSeconds: v })} min={0} max={600} step={5} />
        </div>
        <p className="text-sm text-muted-foreground">
          Viewers use <code className="bg-muted px-1 rounded">!lootbox</code> or <code className="bg-muted px-1 rounded">!lb</code> to open.
          Other commands: <code className="bg-muted px-1 rounded">!inventory</code>, <code className="bg-muted px-1 rounded">!equip &lt;title&gt;</code>, <code className="bg-muted px-1 rounded">!unequip</code>
        </p>
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Items Tab ──

function ItemsTab({ channelId }: { channelId: string }) {
  const [items, setItems] = useState<LootboxItemDto[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "title" as LootboxItemType,
    rarity: "common" as LootboxRarity,
    config: {} as Record<string, any>,
  });

  useEffect(() => {
    loadItems();
  }, [channelId]);

  const loadItems = async () => {
    const res = await api.get<LootboxItemDto[]>(`/channels/${channelId}/lootbox/items`);
    if (res.data) setItems(res.data);
  };

  const addItem = async () => {
    if (!form.name.trim()) return;
    await api.post(`/channels/${channelId}/lootbox/items`, form);
    setForm({ name: "", description: "", type: "title", rarity: "common", config: {} });
    setShowAdd(false);
    loadItems();
  };

  const deleteItem = async (id: string) => {
    await api.delete(`/channels/${channelId}/lootbox/items/${id}`);
    loadItems();
  };

  const toggleItem = async (id: string, enabled: boolean) => {
    await api.patch(`/channels/${channelId}/lootbox/items/${id}`, { enabled });
    loadItems();
  };

  const rarityColor = (r: string) => RARITIES.find((x) => x.value === r)?.color ?? "bg-gray-500";

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} items configured. Items are drawn randomly based on weight/rarity.
        </p>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LootboxItemType, config: {} })}>
                  {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rarity</Label>
                <Select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as LootboxRarity })}>
                  {RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              </div>
            </div>

            {/* Type-specific config */}
            {form.type === "title" && (
              <div>
                <Label className="text-xs">Title Prefix (shown before username)</Label>
                <Input value={form.config.prefix ?? ""} onChange={(e) => setForm({ ...form, config: { prefix: e.target.value } })} placeholder="e.g. [👑 König]" />
              </div>
            )}
            {form.type === "bonus_points" && (
              <div>
                <Label className="text-xs">Bonus Amount</Label>
                <Input type="number" value={form.config.amount ?? 100} onChange={(e) => setForm({ ...form, config: { amount: parseInt(e.target.value) || 0 } })} />
              </div>
            )}
            {form.type === "card" && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Series</Label>
                  <Input value={form.config.series ?? ""} onChange={(e) => setForm({ ...form, config: { ...form.config, series: e.target.value } })} placeholder="Dragons" />
                </div>
                <div>
                  <Label className="text-xs">Card #</Label>
                  <Input type="number" value={form.config.number ?? 1} onChange={(e) => setForm({ ...form, config: { ...form.config, number: parseInt(e.target.value) || 1 } })} />
                </div>
                <div>
                  <Label className="text-xs">Total in Series</Label>
                  <Input type="number" value={form.config.totalInSeries ?? 100} onChange={(e) => setForm({ ...form, config: { ...form.config, totalInSeries: parseInt(e.target.value) || 100 } })} />
                </div>
              </div>
            )}
            {form.type === "sound" && (
              <div>
                <Label className="text-xs">Sound URL</Label>
                <Input value={form.config.soundUrl ?? ""} onChange={(e) => setForm({ ...form, config: { soundUrl: e.target.value, volume: 80 } })} placeholder="/uploads/.../sound.mp3" />
              </div>
            )}
            {form.type === "action_token" && (
              <div>
                <Label className="text-xs">Action Description</Label>
                <Input value={form.config.description ?? ""} onChange={(e) => setForm({ ...form, config: { description: e.target.value } })} placeholder="Streamer muss 10 Liegestütze machen" />
              </div>
            )}
            {form.type === "point_multiplier" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Multiplier</Label>
                  <Input type="number" value={form.config.multiplier ?? 2} onChange={(e) => setForm({ ...form, config: { ...form.config, multiplier: parseFloat(e.target.value) || 2 } })} />
                </div>
                <div>
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Input type="number" value={form.config.durationMinutes ?? 30} onChange={(e) => setForm({ ...form, config: { ...form.config, durationMinutes: parseInt(e.target.value) || 30 } })} />
                </div>
              </div>
            )}

            <Button onClick={addItem} disabled={!form.name.trim()}>Add Item</Button>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No items yet. Add some above.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${rarityColor(item.rarity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs">{ITEM_TYPES.find((t) => t.value === item.type)?.label}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{item.rarity}</Badge>
                    <span className="text-xs text-muted-foreground">W:{item.weight}</span>
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                </div>
                <Switch checked={item.enabled} onCheckedChange={(v) => toggleItem(item.id, v)} />
                <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inventory Tab ──

function InventoryTab({ channelId }: { channelId: string }) {
  const [inventory, setInventory] = useState<ViewerInventoryItemDto[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api.get<ViewerInventoryItemDto[]>(`/channels/${channelId}/lootbox/inventory`).then((r) => {
      if (r.data) setInventory(r.data);
    });
  }, [channelId]);

  const filtered = filter
    ? inventory.filter((i) => i.displayName.toLowerCase().includes(filter.toLowerCase()))
    : inventory;

  const rarityColor = (r: string) => RARITIES.find((x) => x.value === r)?.color ?? "bg-gray-500";

  return (
    <div className="space-y-4">
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by viewer name..." />
      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No items collected yet.</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <div className={`w-2 h-2 rounded-full shrink-0 ${rarityColor(item.itemRarity)}`} />
              <span className="font-medium w-32 truncate">{item.displayName}</span>
              <span className="flex-1">{item.itemName}</span>
              <Badge variant="outline" className="text-xs capitalize">{item.itemRarity}</Badge>
              <span className="text-muted-foreground">x{item.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
