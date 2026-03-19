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
import { Trash2, Plus, Play, ChevronDown, ChevronUp, Paintbrush } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import { ANIMATION_TYPES, REWARD_ACTION_TYPES_AVAILABLE } from "@streamguard/shared";
import type {
  ChannelPointRewardDto,
  RewardAction,
  RewardActionSound,
  RewardActionAlert,
  RewardActionCommand,
  RewardActionChatMessage,
  CommandDto,
  OverlayLayoutConfig,
} from "@streamguard/shared";

export function ChannelPointsPage() {
  const { activeChannel: channel } = useAuthStore();
  const [rewards, setRewards] = useState<ChannelPointRewardDto[]>([]);
  const [commands, setCommands] = useState<CommandDto[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorReward, setEditorReward] = useState<{ rewardId: string; actionIdx: number } | null>(null);

  useEffect(() => {
    if (channel) {
      loadRewards();
      loadCommands();
    }
  }, [channel?.id]);

  const loadRewards = async () => {
    if (!channel) return;
    const res = await api.get<ChannelPointRewardDto[]>(`/channels/${channel.id}/channelpoints`);
    if (res.data) setRewards(res.data);
  };

  const loadCommands = async () => {
    if (!channel) return;
    const res = await api.get<CommandDto[]>(`/channels/${channel.id}/commands`);
    if (res.data) setCommands(res.data);
  };

  const createReward = async () => {
    if (!channel) return;
    const res = await api.post<ChannelPointRewardDto>(`/channels/${channel.id}/channelpoints`, {
      rewardTitle: "New Reward",
      actionConfig: [],
    });
    if (res.data) {
      setRewards((prev) => [...prev, res.data!]);
      setExpandedId(res.data.id);
    }
  };

  const updateReward = async (id: string, data: Partial<ChannelPointRewardDto>) => {
    if (!channel) return;
    const res = await api.patch<ChannelPointRewardDto>(
      `/channels/${channel.id}/channelpoints/${id}`,
      data
    );
    if (res.data) {
      setRewards((prev) => prev.map((r) => (r.id === id ? res.data! : r)));
    }
  };

  const deleteReward = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/channelpoints/${id}`);
    setRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const testReward = async (id: string) => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/channelpoints/${id}/test`);
  };

  const addAction = (rewardId: string, type: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    let action: RewardAction;
    switch (type) {
      case "sound":
        action = { type: "sound", soundFileUrl: "", volume: 80 };
        break;
      case "alert":
        action = {
          type: "alert",
          textTemplate: "{user} redeemed {reward}!",
          imageFileUrl: "",
          duration: 5,
          animationType: "fade",
          volume: 80,
          soundFileUrl: "",
        };
        break;
      case "command":
        action = { type: "command", commandTrigger: "" };
        break;
      case "chat_message":
        action = { type: "chat_message", messageTemplate: "{user} redeemed {reward}!" };
        break;
      default:
        return;
    }
    const newActions = [...reward.actionConfig, action];
    updateReward(rewardId, { actionConfig: newActions });
  };

  const updateAction = (rewardId: string, idx: number, patch: Partial<RewardAction>) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const newActions = [...reward.actionConfig];
    newActions[idx] = { ...newActions[idx], ...patch } as RewardAction;
    updateReward(rewardId, { actionConfig: newActions });
  };

  const removeAction = (rewardId: string, idx: number) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const newActions = reward.actionConfig.filter((_, i) => i !== idx);
    updateReward(rewardId, { actionConfig: newActions });
  };

  const uploadFile = async (type: "sound" | "image", file: File): Promise<string> => {
    if (!channel) return "";
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/channels/${channel.id}/uploads/${type}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    return data.success ? data.data.url : "";
  };

  const saveLayout = async (rewardId: string, actionIdx: number, layoutConfig: OverlayLayoutConfig) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const newActions = [...reward.actionConfig];
    const action = newActions[actionIdx] as RewardActionAlert;
    newActions[actionIdx] = { ...action, layoutConfig };
    updateReward(rewardId, { actionConfig: newActions });
    setEditorReward(null);
  };

  // Find alert action for overlay editor
  const editorAlertData = (() => {
    if (!editorReward) return null;
    const reward = rewards.find((r) => r.id === editorReward.rewardId);
    if (!reward) return null;
    const action = reward.actionConfig[editorReward.actionIdx] as RewardActionAlert;
    if (!action || action.type !== "alert") return null;
    return { reward, action };
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Channel Points</h1>
        <Button onClick={createReward}>
          <Plus className="mr-2 h-4 w-4" /> Add Reward
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Map Twitch Channel Point rewards to actions. Enter the exact reward title from Twitch -
        the Twitch reward ID will be auto-captured on first redemption.
      </p>

      {editorAlertData && (
        <OverlayEditor
          alert={{
            alertType: "command",
            textTemplate: editorAlertData.action.textTemplate,
            imageFileUrl: editorAlertData.action.imageFileUrl,
            soundFileUrl: editorAlertData.action.soundFileUrl,
            duration: editorAlertData.action.duration,
            animationType: editorAlertData.action.animationType,
            volume: editorAlertData.action.volume,
            layoutConfig: editorAlertData.action.layoutConfig ?? null,
            enabled: true,
            id: "",
            minAmount: 0,
            channelId: channel?.id ?? "",
            ttsEnabled: false,
            ttsVoice: "",
            ttsRate: 1.0,
            ttsVolume: 80,
          }}
          onSave={(lc) => saveLayout(editorReward!.rewardId, editorReward!.actionIdx, lc)}
          onClose={() => setEditorReward(null)}
        />
      )}

      <div className="space-y-4">
        {rewards.map((reward) => (
          <Card key={reward.id}>
            <CardHeader
              className="flex flex-row items-center justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === reward.id ? null : reward.id)}
            >
              <div className="flex items-center gap-3">
                {expandedId === reward.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-lg">{reward.rewardTitle}</CardTitle>
                {reward.rewardId && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    ID linked
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {reward.actionConfig.length} action{reward.actionConfig.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={() => testReward(reward.id)}>
                  <Play className="h-3 w-3 mr-1" /> Test
                </Button>
                <Switch
                  checked={reward.enabled}
                  onCheckedChange={(checked) => updateReward(reward.id, { enabled: checked })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => deleteReward(reward.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {expandedId === reward.id && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Twitch Reward Title (exact match)</Label>
                  <Input
                    value={reward.rewardTitle}
                    onChange={(e) => updateReward(reward.id, { rewardTitle: e.target.value })}
                    placeholder="e.g. Highlight My Message"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Actions</Label>
                    <div className="flex gap-1">
                      {REWARD_ACTION_TYPES_AVAILABLE.map((t) => (
                        <Button
                          key={t}
                          size="sm"
                          variant="outline"
                          onClick={() => addAction(reward.id, t)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> {t.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {reward.actionConfig.map((action, idx) => (
                    <ActionCard
                      key={idx}
                      action={action}
                      index={idx}
                      commands={commands}
                      channelId={channel?.id ?? ""}
                      onUpdate={(patch) => updateAction(reward.id, idx, patch)}
                      onRemove={() => removeAction(reward.id, idx)}
                      onUploadFile={uploadFile}
                      onOpenLayout={() => setEditorReward({ rewardId: reward.id, actionIdx: idx })}
                    />
                  ))}

                  {reward.actionConfig.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No actions configured. Add an action above.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {rewards.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No channel point rewards configured. Click "Add Reward" to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  action,
  index,
  commands,
  channelId,
  onUpdate,
  onRemove,
  onUploadFile,
  onOpenLayout,
}: {
  action: RewardAction;
  index: number;
  commands: CommandDto[];
  channelId: string;
  onUpdate: (patch: Partial<RewardAction>) => void;
  onRemove: () => void;
  onUploadFile: (type: "sound" | "image", file: File) => Promise<string>;
  onOpenLayout: () => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">
          #{index + 1} {action.type.replace("_", " ")}
        </span>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {action.type === "sound" && (
        <SoundActionForm
          action={action}
          onUpdate={onUpdate}
          onUploadFile={onUploadFile}
        />
      )}
      {action.type === "alert" && (
        <AlertActionForm
          action={action}
          onUpdate={onUpdate}
          onUploadFile={onUploadFile}
          onOpenLayout={onOpenLayout}
        />
      )}
      {action.type === "command" && (
        <CommandActionForm action={action} commands={commands} onUpdate={onUpdate} />
      )}
      {action.type === "chat_message" && (
        <ChatMessageActionForm action={action} onUpdate={onUpdate} />
      )}
    </div>
  );
}

function SoundActionForm({
  action,
  onUpdate,
  onUploadFile,
}: {
  action: RewardActionSound;
  onUpdate: (patch: Partial<RewardActionSound>) => void;
  onUploadFile: (type: "sound" | "image", file: File) => Promise<string>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Sound File</Label>
        {action.soundFileUrl ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate flex-1">
              {action.soundFileUrl.split("/").pop()}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate({ soundFileUrl: "" })}
            >
              Remove
            </Button>
          </div>
        ) : (
          <FileUpload
            accept=".mp3,.wav,.ogg,.webm"
            label="Upload Sound"
            onUpload={async (file) => {
              const url = await onUploadFile("sound", file);
              if (url) onUpdate({ soundFileUrl: url });
            }}
          />
        )}
      </div>
      <div>
        <Label>Volume: {action.volume}%</Label>
        <Slider
          value={action.volume}
          min={0}
          max={100}
          onChange={(v) => onUpdate({ volume: v })}
        />
      </div>
    </div>
  );
}

function AlertActionForm({
  action,
  onUpdate,
  onUploadFile,
  onOpenLayout,
}: {
  action: RewardActionAlert;
  onUpdate: (patch: Partial<RewardActionAlert>) => void;
  onUploadFile: (type: "sound" | "image", file: File) => Promise<string>;
  onOpenLayout: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Text Template</Label>
        <Input
          value={action.textTemplate}
          onChange={(e) => onUpdate({ textTemplate: e.target.value })}
          placeholder="{user} redeemed {reward}!"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Variables: {"{user}"}, {"{reward}"}, {"{input}"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Duration (s)</Label>
          <Input
            type="number"
            value={action.duration}
            onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 5 })}
          />
        </div>
        <div>
          <Label>Animation</Label>
          <Select
            value={action.animationType}
            onChange={(e) => onUpdate({ animationType: e.target.value as any })}
          >
            {ANIMATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Volume: {action.volume}%</Label>
        <Slider
          value={action.volume}
          min={0}
          max={100}
          onChange={(v) => onUpdate({ volume: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Image</Label>
          {action.imageFileUrl ? (
            <div className="flex items-center gap-2">
              <img src={action.imageFileUrl} alt="" className="h-10 w-10 rounded object-cover" />
              <Button size="sm" variant="outline" onClick={() => onUpdate({ imageFileUrl: "" })}>
                Remove
              </Button>
            </div>
          ) : (
            <FileUpload
              accept=".png,.jpg,.jpeg,.gif,.webp"
              label="Upload Image"
              onUpload={async (file) => {
                const url = await onUploadFile("image", file);
                if (url) onUpdate({ imageFileUrl: url });
              }}
            />
          )}
        </div>
        <div>
          <Label>Sound</Label>
          {action.soundFileUrl ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground truncate flex-1">
                {action.soundFileUrl.split("/").pop()}
              </span>
              <Button size="sm" variant="outline" onClick={() => onUpdate({ soundFileUrl: "" })}>
                Remove
              </Button>
            </div>
          ) : (
            <FileUpload
              accept=".mp3,.wav,.ogg,.webm"
              label="Upload Sound"
              onUpload={async (file) => {
                const url = await onUploadFile("sound", file);
                if (url) onUpdate({ soundFileUrl: url });
              }}
            />
          )}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onOpenLayout}>
        <Paintbrush className="h-3 w-3 mr-1" /> Edit Layout
      </Button>
    </div>
  );
}

function CommandActionForm({
  action,
  commands,
  onUpdate,
}: {
  action: RewardActionCommand;
  commands: CommandDto[];
  onUpdate: (patch: Partial<RewardActionCommand>) => void;
}) {
  return (
    <div>
      <Label>Command</Label>
      <Select
        value={action.commandTrigger}
        onChange={(e) => onUpdate({ commandTrigger: e.target.value })}
      >
        <option value="">Select a command...</option>
        {commands.map((cmd) => (
          <option key={cmd.id} value={cmd.trigger}>
            !{cmd.trigger}
          </option>
        ))}
      </Select>
    </div>
  );
}

function ChatMessageActionForm({
  action,
  onUpdate,
}: {
  action: RewardActionChatMessage;
  onUpdate: (patch: Partial<RewardActionChatMessage>) => void;
}) {
  return (
    <div>
      <Label>Message Template</Label>
      <Input
        value={action.messageTemplate}
        onChange={(e) => onUpdate({ messageTemplate: e.target.value })}
        placeholder="{user} redeemed {reward}!"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Variables: {"{user}"}, {"{reward}"}, {"{input}"}
      </p>
    </div>
  );
}
