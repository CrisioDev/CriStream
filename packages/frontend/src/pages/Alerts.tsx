import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs } from "@/components/ui/tabs";
import { FileUpload } from "@/components/FileUpload";
import { Trash2, Plus, Play, ChevronLeft, ChevronRight, Paintbrush } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import { ALERT_TYPES, ANIMATION_TYPES } from "@streamguard/shared";
import { OverlayEditor } from "@/components/overlay-editor/OverlayEditor";
import type {
  AlertSettingsDto,
  SoundAlertDto,
  EventLogDto,
  PaginatedResponse,
  OverlayLayoutConfig,
} from "@streamguard/shared";

export function AlertsPage() {
  const { activeChannel: channel } = useAuthStore();
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Alerts</h1>
      <Tabs
        tabs={[
          { key: "settings", label: "Alert Settings" },
          { key: "sounds", label: "Sound Alerts" },
          { key: "events", label: "Event History" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "settings" && channel && <AlertSettingsTab channelId={channel.id} />}
      {activeTab === "sounds" && channel && <SoundAlertsTab channelId={channel.id} />}
      {activeTab === "events" && channel && <EventHistoryTab channelId={channel.id} />}
    </div>
  );
}

function AlertSettingsTab({ channelId }: { channelId: string }) {
  const [alerts, setAlerts] = useState<AlertSettingsDto[]>([]);
  const [editorAlert, setEditorAlert] = useState<AlertSettingsDto | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [channelId]);

  const loadAlerts = async () => {
    const res = await api.get<AlertSettingsDto[]>(`/channels/${channelId}/alerts`);
    if (res.data) setAlerts(res.data);
  };

  const updateAlert = async (alertType: string, data: Partial<AlertSettingsDto>) => {
    const res = await api.patch<AlertSettingsDto>(`/channels/${channelId}/alerts/${alertType}`, data);
    if (res.data) {
      setAlerts((prev) => prev.map((a) => (a.alertType === alertType ? res.data! : a)));
    }
  };

  const testAlert = async (alertType: string) => {
    await api.post(`/channels/${channelId}/alerts/test`, { alertType });
  };

  const saveLayout = async (alertType: string, layoutConfig: OverlayLayoutConfig) => {
    const res = await api.patch<AlertSettingsDto>(`/channels/${channelId}/alerts/${alertType}`, { layoutConfig });
    if (res.data) {
      setAlerts((prev) => prev.map((a) => (a.alertType === alertType ? res.data! : a)));
    }
  };

  const uploadFile = async (type: "sound" | "image" | "video", alertType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/channels/${channelId}/uploads/${type}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      const field = type === "sound" ? "soundFileUrl" : "imageFileUrl";
      await updateAlert(alertType, { [field]: data.data.url });
    }
  };

  const uploadMedia = async (alertType: string, file: File) => {
    const ext = file.name.toLowerCase();
    const isVideo = ext.endsWith('.webm') || ext.endsWith('.mp4');
    await uploadFile(isVideo ? "video" : "image", alertType, file);
  };

  return (
    <>
    {editorAlert && (
      <OverlayEditor
        alert={editorAlert}
        onSave={(layoutConfig) => saveLayout(editorAlert.alertType, layoutConfig)}
        onClose={() => setEditorAlert(null)}
      />
    )}
    <div className="grid gap-4 md:grid-cols-2">
      {alerts.map((alert) => (
        <Card key={alert.alertType}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg capitalize">{alert.alertType}</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditorAlert(alert)}>
                <Paintbrush className="h-3 w-3 mr-1" /> Layout
              </Button>
              <Button size="sm" variant="outline" onClick={() => testAlert(alert.alertType)}>
                <Play className="h-3 w-3 mr-1" /> Test
              </Button>
              <Switch
                checked={alert.enabled}
                onCheckedChange={(checked) => updateAlert(alert.alertType, { enabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Text Template</Label>
              <Input
                value={alert.textTemplate}
                onChange={(e) => updateAlert(alert.alertType, { textTemplate: e.target.value })}
                placeholder="{user} just followed!"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {"{user}"}, {"{amount}"}, {"{reward}"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration ({alert.duration}s)</Label>
                <Slider
                  value={alert.duration}
                  onChange={(v) => updateAlert(alert.alertType, { duration: v })}
                  min={1}
                  max={30}
                />
              </div>
              <div>
                <Label>Volume ({alert.volume}%)</Label>
                <Slider
                  value={alert.volume}
                  onChange={(v) => updateAlert(alert.alertType, { volume: v })}
                />
              </div>
            </div>
            <div>
              <Label>Animation</Label>
              <Select
                value={alert.animationType}
                onChange={(e) => updateAlert(alert.alertType, { animationType: e.target.value as any })}
              >
                {ANIMATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sound</Label>
                {alert.soundFileUrl ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="truncate max-w-[150px]">{alert.soundFileUrl.split("/").pop()}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => updateAlert(alert.alertType, { soundFileUrl: "" })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    accept="audio/*"
                    label="Upload Sound"
                    onUpload={(f) => uploadFile("sound", alert.alertType, f)}
                  />
                )}
              </div>
              <div>
                <Label>Image / Video</Label>
                {alert.imageFileUrl ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="truncate max-w-[150px]">{alert.imageFileUrl.split("/").pop()}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => updateAlert(alert.alertType, { imageFileUrl: "" })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    accept="image/*,video/webm,video/mp4,.webm,.mp4"
                    label="Upload Media"
                    onUpload={(f) => uploadMedia(alert.alertType, f)}
                  />
                )}
              </div>
            </div>
            {alert.imageFileUrl && /\.(webm|mp4)$/i.test(alert.imageFileUrl) && (
              <div className="flex items-center justify-between">
                <Label>Video-Ton stummschalten</Label>
                <Switch
                  checked={alert.videoMuted}
                  onCheckedChange={(checked) => updateAlert(alert.alertType, { videoMuted: checked })}
                />
              </div>
            )}
            {(alert.alertType === "giftsub" || alert.alertType === "raid") && (
              <div>
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  value={alert.minAmount}
                  onChange={(e) => updateAlert(alert.alertType, { minAmount: parseInt(e.target.value) })}
                />
              </div>
            )}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Text-to-Speech</Label>
                <Switch
                  checked={alert.ttsEnabled}
                  onCheckedChange={(checked) => updateAlert(alert.alertType, { ttsEnabled: checked })}
                />
              </div>
              {alert.ttsEnabled && (
                <>
                  <div>
                    <Label>Voice</Label>
                    <Input
                      value={alert.ttsVoice}
                      onChange={(e) => updateAlert(alert.alertType, { ttsVoice: e.target.value })}
                      placeholder="e.g. Google Deutsch, Microsoft Katja"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for browser default. Voice names vary by OS/browser.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Rate ({alert.ttsRate}x)</Label>
                      <Slider
                        value={alert.ttsRate * 10}
                        onChange={(v) => updateAlert(alert.alertType, { ttsRate: v / 10 })}
                        min={5}
                        max={20}
                      />
                    </div>
                    <div>
                      <Label>TTS Volume ({alert.ttsVolume}%)</Label>
                      <Slider
                        value={alert.ttsVolume}
                        onChange={(v) => updateAlert(alert.alertType, { ttsVolume: v })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    </>
  );
}

function SoundAlertsTab({ channelId }: { channelId: string }) {
  const [sounds, setSounds] = useState<SoundAlertDto[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", pointsCost: 0, cooldownSeconds: 30 });
  const [uploadedUrl, setUploadedUrl] = useState("");

  useEffect(() => {
    loadSounds();
  }, [channelId]);

  const loadSounds = async () => {
    const res = await api.get<SoundAlertDto[]>(`/channels/${channelId}/sounds`);
    if (res.data) setSounds(res.data);
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/channels/${channelId}/uploads/sound`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setUploadedUrl(data.data.url);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !uploadedUrl) return;
    await api.post(`/channels/${channelId}/sounds`, {
      name: form.name,
      fileUrl: uploadedUrl,
      pointsCost: form.pointsCost,
      cooldownSeconds: form.cooldownSeconds,
    });
    setShowCreate(false);
    setForm({ name: "", pointsCost: 0, cooldownSeconds: 30 });
    setUploadedUrl("");
    loadSounds();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/channels/${channelId}/sounds/${id}`);
    loadSounds();
  };

  const updateSound = async (id: string, data: Partial<SoundAlertDto>) => {
    await api.patch(`/channels/${channelId}/sounds/${id}`, data);
    loadSounds();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? "Cancel" : "Add Sound"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Sound Alert</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Name (trigger: !sound name)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="airhorn"
                />
              </div>
              <div>
                <Label>Points Cost</Label>
                <Input
                  type="number"
                  value={form.pointsCost}
                  onChange={(e) => setForm({ ...form, pointsCost: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Cooldown (sec)</Label>
                <Input
                  type="number"
                  value={form.cooldownSeconds}
                  onChange={(e) => setForm({ ...form, cooldownSeconds: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Sound File</Label>
              {uploadedUrl ? (
                <Badge variant="outline">{uploadedUrl.split("/").pop()}</Badge>
              ) : (
                <FileUpload accept="audio/*" label="Upload Sound" onUpload={handleUpload} />
              )}
            </div>
            <Button onClick={handleCreate} disabled={!form.name || !uploadedUrl}>Create Sound</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sounds.map((sound) => (
          <Card key={sound.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <code className="font-mono text-primary font-semibold">!sound {sound.name}</code>
                  <Badge variant={sound.enabled ? "default" : "outline"}>
                    {sound.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => new Audio(sound.fileUrl).play()}>
                    <Play className="h-3 w-3" />
                  </Button>
                  <Switch checked={sound.enabled} onCheckedChange={(v) => updateSound(sound.id, { enabled: v })} />
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(sound.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name (trigger)</Label>
                  <Input
                    value={sound.name}
                    onChange={(e) => updateSound(sound.id, { name: e.target.value.toLowerCase() })}
                  />
                </div>
                <div>
                  <Label>Sound File</Label>
                  {sound.fileUrl ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="truncate max-w-[180px]">{sound.fileUrl.split("/").pop()}</Badge>
                      <FileUpload
                        accept="audio/*"
                        label="Replace"
                        onUpload={async (f) => {
                          const formData = new FormData();
                          formData.append("file", f);
                          const token = localStorage.getItem("token");
                          const res = await fetch(`/api/channels/${channelId}/uploads/sound`, {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: formData,
                          });
                          const data = await res.json();
                          if (data.success) updateSound(sound.id, { fileUrl: data.data.url });
                        }}
                      />
                    </div>
                  ) : (
                    <FileUpload
                      accept="audio/*"
                      label="Upload"
                      onUpload={async (f) => {
                        const formData = new FormData();
                        formData.append("file", f);
                        const token = localStorage.getItem("token");
                        const res = await fetch(`/api/channels/${channelId}/uploads/sound`, {
                          method: "POST",
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.success) updateSound(sound.id, { fileUrl: data.data.url });
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Points Cost</Label>
                  <Input
                    type="number"
                    value={sound.pointsCost}
                    onChange={(e) => updateSound(sound.id, { pointsCost: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Cooldown (sec)</Label>
                  <Input
                    type="number"
                    value={sound.cooldownSeconds}
                    onChange={(e) => updateSound(sound.id, { cooldownSeconds: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Volume ({sound.volume}%)</Label>
                  <Slider
                    value={sound.volume}
                    onChange={(v) => updateSound(sound.id, { volume: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sounds.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No sound alerts yet.</p>
        )}
      </div>
    </div>
  );
}

function EventHistoryTab({ channelId }: { channelId: string }) {
  const [result, setResult] = useState<PaginatedResponse<EventLogDto> | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadEvents(1);
  }, [channelId]);

  const loadEvents = async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: "50" });
    if (filter) params.set("eventType", filter);
    const res = await api.get<PaginatedResponse<EventLogDto>>(`/channels/${channelId}/events?${params}`);
    if (res.data) {
      setResult(res.data);
      setPage(p);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={filter} onChange={(e) => { setFilter(e.target.value); }}>
          <option value="">All Events</option>
          <option value="channel.follow">Follow</option>
          <option value="channel.subscribe">Subscribe</option>
          <option value="channel.subscription.gift">Gift Sub</option>
          <option value="channel.raid">Raid</option>
          <option value="channel.hype_train.begin">Hype Train</option>
          <option value="channel.channel_points_custom_reward_redemption.add">Redemption</option>
        </Select>
        <Button variant="outline" onClick={() => loadEvents(1)}>Filter</Button>
      </div>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Events ({result.total})</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => loadEvents(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {result.totalPages || 1}</span>
              <Button size="sm" variant="outline" disabled={page >= result.totalPages} onClick={() => loadEvents(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {result.items.length === 0 && (
                <p className="text-muted-foreground text-sm py-4 text-center">No events yet.</p>
              )}
              {result.items.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 text-sm border-b py-2">
                  <Badge variant="secondary" className="shrink-0">{evt.eventType.split(".").pop()}</Badge>
                  <span className="text-xs text-muted-foreground w-36 shrink-0">
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {JSON.stringify(evt.data).slice(0, 120)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
