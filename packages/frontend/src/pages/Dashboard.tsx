import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/api/client";
import type { BotStatusDto, WsEvents } from "@streamguard/shared";

export function DashboardPage() {
  const { activeChannel: channel } = useAuthStore();
  const { on } = useSocket();
  const [botStatus, setBotStatus] = useState<BotStatusDto | null>(null);
  const [chatMessages, setChatMessages] = useState<WsEvents["chat:message"][]>([]);

  useEffect(() => {
    api.get<BotStatusDto>("/bot/status").then((res) => {
      if (res.data) setBotStatus(res.data);
    });
  }, []);

  useEffect(() => {
    const unsub = on("chat:message", (msg) => {
      setChatMessages((prev) => [...prev.slice(-99), msg]);
    });
    const unsubStatus = on("bot:status", (status) => {
      setBotStatus((prev) => prev ? { ...prev, ...status } : null);
    });
    return () => { unsub(); unsubStatus(); };
  }, [on]);

  const handleJoin = async () => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/join`);
    api.get<BotStatusDto>("/bot/status").then((res) => {
      if (res.data) setBotStatus(res.data);
    });
  };

  const handleLeave = async () => {
    if (!channel) return;
    await api.post(`/channels/${channel.id}/leave`);
    api.get<BotStatusDto>("/bot/status").then((res) => {
      if (res.data) setBotStatus(res.data);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={botStatus?.connected ? "default" : "destructive"}>
              {botStatus?.connected ? "Connected" : "Disconnected"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{channel?.displayName ?? "None"}</p>
            <div className="mt-2 flex gap-2">
              {channel?.botJoined ? (
                <Button size="sm" variant="outline" onClick={handleLeave}>Leave</Button>
              ) : (
                <Button size="sm" onClick={handleJoin}>Join Channel</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {botStatus ? `${Math.floor(botStatus.uptime / 3600)}h ${Math.floor((botStatus.uptime % 3600) / 60)}m` : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Chat Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto space-y-1 font-mono text-sm bg-muted/50 rounded-md p-3">
            {chatMessages.length === 0 && (
              <p className="text-muted-foreground">No messages yet...</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i}>
                <span style={{ color: msg.color || "#9147ff" }} className="font-semibold">
                  {msg.user}
                </span>
                <span className="text-muted-foreground">: </span>
                <span>{msg.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
