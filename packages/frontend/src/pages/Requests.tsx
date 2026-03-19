import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X, Trash2, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/api/client";
import type { ViewerRequestDto } from "@streamguard/shared";

export function RequestsPage() {
  const { activeChannel: channel } = useAuthStore();
  const { on } = useSocket();
  const [requests, setRequests] = useState<ViewerRequestDto[]>([]);
  const [filter, setFilter] = useState<string>("open");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (channel) loadRequests();
  }, [channel, filter]);

  useEffect(() => {
    const unsub1 = on("request:new", (data) => {
      if (data.channelId === channel?.id) {
        setRequests((prev) => [data.request, ...prev]);
      }
    });
    const unsub2 = on("request:update", (data) => {
      if (data.channelId === channel?.id) {
        setRequests((prev) => prev.map((r) => (r.id === data.request.id ? data.request : r)));
      }
    });
    return () => { unsub1(); unsub2(); };
  }, [on, channel]);

  const loadRequests = async () => {
    if (!channel) return;
    const params = filter ? `?status=${filter}` : "";
    const res = await api.get<ViewerRequestDto[]>(`/channels/${channel.id}/requests${params}`);
    if (res.data) setRequests(res.data);
  };

  const updateStatus = async (id: string, status: string) => {
    if (!channel) return;
    await api.patch(`/channels/${channel.id}/requests/${id}`, { status });
  };

  const deleteRequest = async (id: string) => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/requests/${id}`);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const clearDone = async () => {
    if (!channel) return;
    await api.delete(`/channels/${channel.id}/requests`);
    loadRequests();
  };

  const requestUrl = channel ? `${window.location.origin}/requests/${channel.overlayToken}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(requestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!channel) return null;

  const statusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="default">Open</Badge>;
      case "done": return <Badge className="bg-green-600">Done</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Viewer Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>Public Request Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this link with your viewers so they can submit requests.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-sm break-all">
              {requestUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <a href={requestUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Requests</CardTitle>
          <div className="flex gap-2">
            {["open", "done", "rejected", ""].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                onClick={() => setFilter(s)}
              >
                {s || "All"}
              </Button>
            ))}
            <Button size="sm" variant="destructive" onClick={clearDone}>
              <Trash2 className="mr-1 h-3 w-3" /> Clear Done
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No requests yet.</p>
            )}
            {requests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 border-b py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{req.displayName}</span>
                    {statusBadge(req.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{req.message}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {req.status === "open" && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(req.id, "done")} title="Done">
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(req.id, "rejected")} title="Reject">
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  {req.status !== "open" && (
                    <Button size="icon" variant="ghost" onClick={() => updateStatus(req.id, "open")} title="Reopen">
                      <Badge variant="outline" className="text-xs cursor-pointer">Reopen</Badge>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => deleteRequest(req.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
