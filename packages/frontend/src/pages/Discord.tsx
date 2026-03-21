import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import type { DiscordSettingsDto, UpdateDiscordSettingsDto } from "@cristream/shared";

export function DiscordPage() {
  const { activeChannel } = useAuthStore();
  const [settings, setSettings] = useState<DiscordSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!activeChannel) return;
    setLoading(true);
    api
      .get<DiscordSettingsDto>(`/channels/${activeChannel.id}/discord`)
      .then((res) => {
        if (res.success && res.data) setSettings(res.data);
      })
      .finally(() => setLoading(false));
  }, [activeChannel]);

  const save = async (updates: UpdateDiscordSettingsDto) => {
    if (!activeChannel) return;
    setSaving(true);
    const res = await api.patch<DiscordSettingsDto>(`/channels/${activeChannel.id}/discord`, updates);
    if (res.success && res.data) {
      setSettings(res.data);
      setMessage("Settings saved!");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const saveAll = () => {
    if (!settings) return;
    save({
      guildId: settings.guildId,
      commandChannelId: settings.commandChannelId,
      timerChannelId: settings.timerChannelId,
      summaryChannelId: settings.summaryChannelId,
      notifyChannelId: settings.notifyChannelId,
      commandsEnabled: settings.commandsEnabled,
      timersEnabled: settings.timersEnabled,
      summariesEnabled: settings.summariesEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      notifyFollow: settings.notifyFollow,
      notifySub: settings.notifySub,
      notifyGiftSub: settings.notifyGiftSub,
      notifyRaid: settings.notifyRaid,
      notifyHypeTrain: settings.notifyHypeTrain,
      notifyStreamOnline: settings.notifyStreamOnline,
      notifyStreamOffline: settings.notifyStreamOffline,
    });
  };

  const syncCommands = async () => {
    if (!activeChannel) return;
    setSyncing(true);
    const res = await api.post(`/channels/${activeChannel.id}/discord/sync-commands`);
    setMessage(res.success ? "Slash commands synced!" : "Sync failed");
    setSyncing(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (!activeChannel) {
    return <div className="p-6 text-muted-foreground">Select a channel first.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (settings && !settings.hasBotToken) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Discord Integration</h1>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-muted-foreground">
            Discord bot is not configured. Add <code className="text-foreground">DISCORD_BOT_TOKEN</code> and{" "}
            <code className="text-foreground">DISCORD_CLIENT_ID</code> to your environment variables to enable
            Discord features.
          </p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  const inviteUrl = settings.discordClientId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(
        settings.discordClientId
      )}&scope=bot+applications.commands&permissions=2147485696`
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discord Integration</h1>
        {message && <span className="text-sm text-green-400">{message}</span>}
      </div>

      {/* Guild Config */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Server Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Enter your Discord Server (Guild) ID and the Channel IDs where the bot should operate.
          Right-click on a server or channel in Discord and select "Copy ID" (requires Developer Mode).
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Guild ID</label>
            <Input
              value={settings.guildId}
              onChange={(e) => setSettings({ ...settings, guildId: e.target.value })}
              placeholder="Discord Server ID"
            />
          </div>
        </div>
      </div>

      {/* Commands */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Commands</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.commandsEnabled}
              onChange={(e) => setSettings({ ...settings, commandsEnabled: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Allow your Twitch commands to work in Discord (text commands with prefix and slash commands).
        </p>
        <div>
          <label className="text-sm font-medium mb-1 block">Command Channel ID</label>
          <Input
            value={settings.commandChannelId}
            onChange={(e) => setSettings({ ...settings, commandChannelId: e.target.value })}
            placeholder="Leave empty for all channels"
          />
        </div>
        <button
          onClick={syncCommands}
          disabled={syncing || !settings.commandsEnabled}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Slash Commands"}
        </button>
      </div>

      {/* Timers */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Timers</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.timersEnabled}
              onChange={(e) => setSettings({ ...settings, timersEnabled: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Send timer messages to a Discord channel in addition to Twitch chat.
        </p>
        <div>
          <label className="text-sm font-medium mb-1 block">Timer Channel ID</label>
          <Input
            value={settings.timerChannelId}
            onChange={(e) => setSettings({ ...settings, timerChannelId: e.target.value })}
            placeholder="Channel for timer messages"
          />
        </div>
      </div>

      {/* Summaries */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stream Summaries</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.summariesEnabled}
              onChange={(e) => setSettings({ ...settings, summariesEnabled: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Post stream summaries when a stream ends and daily at 00:00 UTC with chat stats, events, and top commands.
        </p>
        <div>
          <label className="text-sm font-medium mb-1 block">Summary Channel ID</label>
          <Input
            value={settings.summaryChannelId}
            onChange={(e) => setSettings({ ...settings, summaryChannelId: e.target.value })}
            placeholder="Channel for summary embeds"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Event Notifications</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Send Discord notifications for Twitch events. Enable/disable individual event types below.
        </p>
        <div>
          <label className="text-sm font-medium mb-1 block">Notification Channel ID</label>
          <Input
            value={settings.notifyChannelId}
            onChange={(e) => setSettings({ ...settings, notifyChannelId: e.target.value })}
            placeholder="Channel for event notifications"
          />
        </div>

        {settings.notificationsEnabled && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {([
              { key: "notifyStreamOnline" as const, label: "Stream Online" },
              { key: "notifyStreamOffline" as const, label: "Stream Offline" },
              { key: "notifyFollow" as const, label: "Follows" },
              { key: "notifySub" as const, label: "Subscriptions" },
              { key: "notifyGiftSub" as const, label: "Gift Subs" },
              { key: "notifyRaid" as const, label: "Raids" },
              { key: "notifyHypeTrain" as const, label: "Hype Trains" },
            ]).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 hover:bg-accent">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                  className="rounded border-input"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Save + Invite */}
      <div className="flex gap-3">
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {inviteUrl && (
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Invite Bot to Server
          </a>
        )}
      </div>
    </div>
  );
}
