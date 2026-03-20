import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { FileUpload } from "@/components/FileUpload";
import { OverlayEditor } from "@/components/overlay-editor/OverlayEditor";
import {
  Trash2, Plus, Play, ChevronDown, ChevronUp, Paintbrush,
  RefreshCw, Upload, Download, Cloud, CloudOff,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import { ANIMATION_TYPES, REWARD_ACTION_TYPES_AVAILABLE } from "@streamguard/shared";
import type {
  ChannelPointRewardDto,
  RewardAction, RewardActionSound, RewardActionAlert, RewardActionCommand, RewardActionChatMessage,
  CommandDto, OverlayLayoutConfig, TwitchRewardDto,
} from "@streamguard/shared";

export function ChannelPointsPage() {
  const { activeChannel: channel } = useAuthStore();
  const [rewards, setRewards] = useState<ChannelPointRewardDto[]>([]);
  const [commands, setCommands] = useState<CommandDto[]>([]);
  const [twitchCount, setTwitchCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorReward, setEditorReward] = useState<{ rewardId: string; actionIdx: number } | null>(null);

  useEffect(() => { if (channel) { loadAll(); loadCommands(); } }, [channel?.id]);

  const loadAll = async () => {
    if (!channel) return;
    setLoading(true);
    // Import from Twitch + get all local rewards in one call
    const importRes = await api.post<ChannelPointRewardDto[]>(`/channels/${channel.id}/channelpoints/import`);
    if (importRes.data) {
      setRewards(importRes.data);
      setTwitchCount(importRes.data.filter((r) => r.isSynced).length);
    }
    setLoading(false);
  };

  const loadCommands = async () => {
    if (!channel) return;
    const res = await api.get<CommandDto[]>(`/channels/${channel.id}/commands`);
    if (res.data) setCommands(res.data);
  };

  const createReward = async () => {
    if (!channel) return;
    const res = await api.post<ChannelPointRewardDto>(`/channels/${channel.id}/channelpoints`, {
      rewardTitle: "Neue Belohnung", actionConfig: [], cost: 100,
    });
    if (res.data) { setRewards((prev) => [...prev, res.data!]); setExpandedId(res.data.id); }
  };

  const updateReward = async (id: string, data: Partial<ChannelPointRewardDto>) => {
    if (!channel) return;
    const res = await api.patch<ChannelPointRewardDto>(`/channels/${channel.id}/channelpoints/${id}`, data);
    if (res.data) setRewards((prev) => prev.map((r) => (r.id === id ? res.data! : r)));
  };

  const deleteReward = async (id: string) => {
    if (!channel) return;
    const reward = rewards.find((r) => r.id === id);
    if (reward?.isSynced) {
      if (!confirm("Belohnung ist auf Twitch aktiv. Lokale Konfiguration wirklich löschen?\n(Die Twitch-Belohnung bleibt bestehen)")) return;
    }
    await api.delete(`/channels/${channel.id}/channelpoints/${id}`);
    setRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const testReward = async (id: string) => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/channelpoints/${id}/test`);
  };

  const pushToTwitch = async (id: string) => {
    if (!channel) return;
    if (twitchCount >= 50) { alert("Twitch-Limit erreicht (50/50). Ziehe zuerst eine andere Belohnung von Twitch ab."); return; }
    const res = await api.post<ChannelPointRewardDto>(`/channels/${channel.id}/channelpoints/${id}/push`);
    if (res.data) {
      setRewards((prev) => prev.map((r) => (r.id === id ? res.data! : r)));
      setTwitchCount((c) => c + 1);
    }
  };

  const pullFromTwitch = async (id: string) => {
    if (!channel) return;
    const alsoDelete = confirm(
      "Belohnung von Twitch-Tracking entfernen.\n\n" +
      "OK = Nur lokal entlinken (Reward bleibt auf Twitch)\n" +
      "Abbrechen = Nichts tun"
    );
    const res = await api.post<ChannelPointRewardDto>(`/channels/${channel.id}/channelpoints/${id}/pull?deleteFromTwitch=false`);
    if (res.data) {
      setRewards((prev) => prev.map((r) => (r.id === id ? res.data! : r)));
      setTwitchCount((c) => c - 1);
    }
  };

  const addAction = (rewardId: string, type: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    let action: RewardAction;
    switch (type) {
      case "sound": action = { type: "sound", soundFileUrl: "", volume: 80 }; break;
      case "alert": action = { type: "alert", textTemplate: "{user} redeemed {reward}!", imageFileUrl: "", duration: 5, animationType: "fade", volume: 80, soundFileUrl: "" }; break;
      case "command": action = { type: "command", commandTrigger: "" }; break;
      case "chat_message": action = { type: "chat_message", messageTemplate: "{user} redeemed {reward}!" }; break;
      default: return;
    }
    updateReward(rewardId, { actionConfig: [...reward.actionConfig, action] });
  };

  const updateAction = (rewardId: string, idx: number, patch: Partial<RewardAction>) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const a = [...reward.actionConfig]; a[idx] = { ...a[idx], ...patch } as RewardAction;
    updateReward(rewardId, { actionConfig: a });
  };

  const removeAction = (rewardId: string, idx: number) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    updateReward(rewardId, { actionConfig: reward.actionConfig.filter((_, i) => i !== idx) });
  };

  const uploadFile = async (type: "sound" | "image", file: File): Promise<string> => {
    if (!channel) return "";
    const formData = new FormData(); formData.append("file", file);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/channels/${channel.id}/uploads/${type}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
    const data = await res.json(); return data.success ? data.data.url : "";
  };

  const saveLayout = async (rewardId: string, actionIdx: number, layoutConfig: OverlayLayoutConfig) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const a = [...reward.actionConfig]; a[actionIdx] = { ...(a[actionIdx] as RewardActionAlert), layoutConfig };
    updateReward(rewardId, { actionConfig: a }); setEditorReward(null);
  };

  const editorAlertData = (() => {
    if (!editorReward) return null;
    const r = rewards.find((r) => r.id === editorReward.rewardId);
    if (!r) return null;
    const a = r.actionConfig[editorReward.actionIdx] as RewardActionAlert;
    if (!a || a.type !== "alert") return null;
    return { reward: r, action: a };
  })();

  const syncedCount = rewards.filter((r) => r.isSynced).length;
  const localCount = rewards.filter((r) => !r.isSynced).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Channel Points</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {syncedCount} auf Twitch
          </span>
          {localCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              {localCount} lokal
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded ${twitchCount >= 50 ? "bg-red-500/20 text-red-400" : twitchCount >= 45 ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"}`}>
            {twitchCount}/50 Twitch-Limit
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aktualisieren
          </Button>
          <Button onClick={createReward}>
            <Plus className="mr-2 h-4 w-4" /> Neue Belohnung
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Erstelle Belohnungen lokal und entscheide welche auf Twitch aktiv sind. Lokale Belohnungen haben kein Twitch-Limit.
      </p>

      {editorAlertData && (
        <OverlayEditor
          alert={{
            alertType: "command", textTemplate: editorAlertData.action.textTemplate,
            imageFileUrl: editorAlertData.action.imageFileUrl, soundFileUrl: editorAlertData.action.soundFileUrl,
            duration: editorAlertData.action.duration, animationType: editorAlertData.action.animationType,
            volume: editorAlertData.action.volume, layoutConfig: editorAlertData.action.layoutConfig ?? null,
            enabled: true, id: "", minAmount: 0, channelId: channel?.id ?? "",
            ttsEnabled: false, ttsVoice: "", ttsRate: 1.0, ttsVolume: 80,
          }}
          onSave={(lc) => saveLayout(editorReward!.rewardId, editorReward!.actionIdx, lc)}
          onClose={() => setEditorReward(null)}
        />
      )}

      <div className="space-y-3">
        {rewards.map((reward) => {
          const isExpanded = expandedId === reward.id;
          const actionCount = reward.actionConfig.length;

          return (
            <Card key={reward.id} className={!reward.isSynced ? "border-dashed" : ""}>
              <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer py-3"
                onClick={() => setExpandedId(isExpanded ? null : reward.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <div className="h-4 w-4 rounded shrink-0" style={{ backgroundColor: reward.backgroundColor }} />
                  <CardTitle className="text-base">{reward.rewardTitle}</CardTitle>
                  <span className="text-sm text-muted-foreground">{reward.cost} Punkte</span>
                  {reward.isSynced ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1"><Cloud className="h-3 w-3" /> Twitch</span>
                  ) : (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1"><CloudOff className="h-3 w-3" /> Lokal</span>
                  )}
                  {actionCount > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{actionCount} Action{actionCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {reward.isSynced ? (
                    <Button size="sm" variant="outline" onClick={() => pullFromTwitch(reward.id)} title="Von Twitch entfernen">
                      <Download className="h-3 w-3 mr-1" /> Pull
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => pushToTwitch(reward.id)} title="Zu Twitch senden" disabled={twitchCount >= 50}>
                      <Upload className="h-3 w-3 mr-1" /> Push
                    </Button>
                  )}
                  {actionCount > 0 && (
                    <Button size="sm" variant="outline" onClick={() => testReward(reward.id)}><Play className="h-3 w-3 mr-1" /> Test</Button>
                  )}
                  <Switch checked={reward.enabled} onCheckedChange={(checked) => updateReward(reward.id, { enabled: checked })} />
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteReward(reward.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                  {/* Reward settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Titel</Label><Input value={reward.rewardTitle} onChange={(e) => updateReward(reward.id, { rewardTitle: e.target.value })} /></div>
                    <div><Label>Kosten</Label><Input type="number" value={reward.cost} onChange={(e) => updateReward(reward.id, { cost: parseInt(e.target.value) || 0 })} /></div>
                  </div>
                  <div><Label>Beschreibung</Label><Input value={reward.prompt} onChange={(e) => updateReward(reward.id, { prompt: e.target.value })} placeholder="Optional" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Max/Stream</Label><Input type="number" value={reward.maxPerStream ?? ""} onChange={(e) => updateReward(reward.id, { maxPerStream: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unbegr." /></div>
                    <div><Label>Max/User/Stream</Label><Input type="number" value={reward.maxPerUserPerStream ?? ""} onChange={(e) => updateReward(reward.id, { maxPerUserPerStream: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unbegr." /></div>
                    <div><Label>Cooldown (s)</Label><Input type="number" value={reward.globalCooldown ?? ""} onChange={(e) => updateReward(reward.id, { globalCooldown: e.target.value ? parseInt(e.target.value) : null })} placeholder="Kein" /></div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={reward.isUserInputRequired} onChange={(e) => updateReward(reward.id, { isUserInputRequired: e.target.checked })} className="rounded border-input" />
                    <span className="text-sm">User-Eingabe erforderlich</span>
                  </label>

                  {reward.isSynced && (
                    <p className="text-xs text-muted-foreground">
                      Twitch-Einstellungen (Titel, Kosten, etc.) werden nur lokal gespeichert. Um Änderungen zu Twitch zu übertragen: Pull → bearbeiten → Push.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Actions bei Einlösung</Label>
                      <div className="flex gap-1">
                        {REWARD_ACTION_TYPES_AVAILABLE.map((t) => (
                          <Button key={t} size="sm" variant="outline" onClick={() => addAction(reward.id, t)}>
                            <Plus className="h-3 w-3 mr-1" /> {t.replace("_", " ")}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {reward.actionConfig.map((action, idx) => (
                      <ActionCard key={idx} action={action} index={idx} commands={commands} channelId={channel?.id ?? ""}
                        onUpdate={(patch) => updateAction(reward.id, idx, patch)} onRemove={() => removeAction(reward.id, idx)}
                        onUploadFile={uploadFile} onOpenLayout={() => setEditorReward({ rewardId: reward.id, actionIdx: idx })} />
                    ))}
                    {actionCount === 0 && <p className="text-sm text-muted-foreground text-center py-3">Keine Actions konfiguriert.</p>}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {rewards.length === 0 && !loading && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Belohnungen. Klicke "Aktualisieren" um Twitch-Rewards zu importieren oder erstelle eine neue.</CardContent></Card>
        )}
        {loading && <Card><CardContent className="py-8 text-center text-muted-foreground">Lade...</CardContent></Card>}
      </div>
    </div>
  );
}

function ActionCard({ action, index, commands, channelId, onUpdate, onRemove, onUploadFile, onOpenLayout }: {
  action: RewardAction; index: number; commands: CommandDto[]; channelId: string;
  onUpdate: (patch: Partial<RewardAction>) => void; onRemove: () => void;
  onUploadFile: (type: "sound" | "image", file: File) => Promise<string>; onOpenLayout: () => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">#{index + 1} {action.type.replace("_", " ")}</span>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
      {action.type === "sound" && <SoundActionForm action={action} onUpdate={onUpdate} onUploadFile={onUploadFile} />}
      {action.type === "alert" && <AlertActionForm action={action} onUpdate={onUpdate} onUploadFile={onUploadFile} onOpenLayout={onOpenLayout} />}
      {action.type === "command" && <CommandActionForm action={action} commands={commands} onUpdate={onUpdate} />}
      {action.type === "chat_message" && <ChatMessageActionForm action={action} onUpdate={onUpdate} />}
    </div>
  );
}

function SoundActionForm({ action, onUpdate, onUploadFile }: { action: RewardActionSound; onUpdate: (p: Partial<RewardActionSound>) => void; onUploadFile: (t: "sound"|"image", f: File) => Promise<string> }) {
  const sounds = action.soundFileUrl ? action.soundFileUrl.split(",").map(s => s.trim()).filter(Boolean) : [];
  const addSound = async (file: File) => {
    const url = await onUploadFile("sound", file);
    if (url) {
      const updated = sounds.length > 0 ? [...sounds, url].join(",") : url;
      onUpdate({ soundFileUrl: updated });
    }
  };
  const removeSound = (idx: number) => {
    const updated = sounds.filter((_, i) => i !== idx).join(",");
    onUpdate({ soundFileUrl: updated });
  };
  return (
    <div className="space-y-3">
      <div>
        <Label>Sounds {sounds.length > 1 && <span className="text-muted-foreground font-normal">(zufällig)</span>}</Label>
        {sounds.map((url, idx) => (
          <div key={idx} className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground truncate flex-1">{url.split("/").pop()}</span>
            <Button size="sm" variant="outline" onClick={() => removeSound(idx)}>Remove</Button>
          </div>
        ))}
        <div className="mt-1">
          <FileUpload accept=".mp3,.wav,.ogg,.webm" label={sounds.length > 0 ? "+ Sound hinzufügen" : "Upload Sound"} onUpload={addSound} />
        </div>
      </div>
      <div><Label>Volume: {action.volume}%</Label><Slider value={action.volume} min={0} max={100} onChange={(v) => onUpdate({ volume: v })} /></div>
    </div>
  );
}

function AlertActionForm({ action, onUpdate, onUploadFile, onOpenLayout }: { action: RewardActionAlert; onUpdate: (p: Partial<RewardActionAlert>) => void; onUploadFile: (t: "sound"|"image", f: File) => Promise<string>; onOpenLayout: () => void }) {
  return (
    <div className="space-y-3">
      <div><Label>Text Template</Label><Input value={action.textTemplate} onChange={(e) => onUpdate({ textTemplate: e.target.value })} placeholder="{user} redeemed {reward}!" /><p className="text-xs text-muted-foreground mt-1">{"{user}"} {"{reward}"} {"{input}"} + $(points) $(watchtime) $(rank) $(game) $(title) $(viewers) $(random)</p></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Duration (s)</Label><Input type="number" value={action.duration} onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 5 })} /></div><div><Label>Animation</Label><Select value={action.animationType} onChange={(e) => onUpdate({ animationType: e.target.value as any })}>{ANIMATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></div></div>
      <div><Label>Volume: {action.volume}%</Label><Slider value={action.volume} min={0} max={100} onChange={(v) => onUpdate({ volume: v })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Image</Label>{action.imageFileUrl ? (<div className="flex items-center gap-2"><img src={action.imageFileUrl} alt="" className="h-10 w-10 rounded object-cover" /><Button size="sm" variant="outline" onClick={() => onUpdate({ imageFileUrl: "" })}>Remove</Button></div>) : (<FileUpload accept=".png,.jpg,.jpeg,.gif,.webp" label="Upload Image" onUpload={async (f) => { const u = await onUploadFile("image", f); if (u) onUpdate({ imageFileUrl: u }); }} />)}</div>
        <div><Label>Sounds {(() => { const s = action.soundFileUrl?.split(",").filter(Boolean) ?? []; return s.length > 1 ? <span className="text-muted-foreground font-normal">(zufällig)</span> : null; })()}</Label>
          {(action.soundFileUrl?.split(",").filter(Boolean) ?? []).map((url, idx) => (
            <div key={idx} className="flex items-center gap-2 mt-1"><span className="text-sm text-muted-foreground truncate flex-1">{url.trim().split("/").pop()}</span><Button size="sm" variant="outline" onClick={() => { const urls = action.soundFileUrl.split(",").filter(Boolean); urls.splice(idx, 1); onUpdate({ soundFileUrl: urls.join(",") }); }}>Remove</Button></div>
          ))}
          <div className="mt-1"><FileUpload accept=".mp3,.wav,.ogg,.webm" label={action.soundFileUrl ? "+ Sound" : "Upload Sound"} onUpload={async (f) => { const u = await onUploadFile("sound", f); if (u) { const existing = action.soundFileUrl ? action.soundFileUrl + "," + u : u; onUpdate({ soundFileUrl: existing }); } }} /></div>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onOpenLayout}><Paintbrush className="h-3 w-3 mr-1" /> Edit Layout</Button>
    </div>
  );
}

function CommandActionForm({ action, commands, onUpdate }: { action: RewardActionCommand; commands: CommandDto[]; onUpdate: (p: Partial<RewardActionCommand>) => void }) {
  return (<div><Label>Command</Label><Select value={action.commandTrigger} onChange={(e) => onUpdate({ commandTrigger: e.target.value })}><option value="">Select a command...</option>{commands.map((c) => <option key={c.id} value={c.trigger}>!{c.trigger}</option>)}</Select></div>);
}

function ChatMessageActionForm({ action, onUpdate }: { action: RewardActionChatMessage; onUpdate: (p: Partial<RewardActionChatMessage>) => void }) {
  return (<div><Label>Message Template</Label><Input value={action.messageTemplate} onChange={(e) => onUpdate({ messageTemplate: e.target.value })} placeholder="{user} redeemed {reward}!" /><p className="text-xs text-muted-foreground mt-1">{"{user}"} {"{reward}"} {"{input}"} + $(points) $(watchtime) $(rank) $(game) $(title) $(viewers) $(random)</p></div>);
}
