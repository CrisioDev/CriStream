import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { ChatLogDto, PaginatedResponse } from "@cristream/shared";

export function ChatLogsPage() {
  const { activeChannel: channel } = useAuthStore();
  const [result, setResult] = useState<PaginatedResponse<ChatLogDto> | null>(null);
  const [user, setUser] = useState("");
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [platform, setPlatform] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (channel) search(1);
  }, [channel]);

  const search = async (p: number) => {
    if (!channel) return;
    const params = new URLSearchParams();
    if (user) params.set("user", user);
    if (keyword) params.set("keyword", keyword);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (platform) params.set("platform", platform);
    params.set("page", String(p));
    params.set("pageSize", "50");

    const res = await api.get<PaginatedResponse<ChatLogDto>>(
      `/channels/${channel.id}/chatlogs?${params}`
    );
    if (res.data) {
      setResult(res.data);
      setPage(p);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Chat Logs</h1>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label>Username</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username" />
            </div>
            <div>
              <Label>Keyword</Label>
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search text..." />
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">All</option>
                <option value="twitch">Twitch</option>
                <option value="discord">Discord</option>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => search(1)}>
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Results ({result.total})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => search(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {result.totalPages || 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= result.totalPages}
                onClick={() => search(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {result.items.length === 0 && (
                <p className="text-muted-foreground text-sm py-4 text-center">No results found.</p>
              )}
              {result.items.map((log) => (
                <div key={log.id} className="flex gap-3 text-sm border-b py-2">
                  <span className="text-xs text-muted-foreground w-36 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <Badge variant="outline" className={`w-16 shrink-0 text-center text-xs ${log.platform === "discord" ? "text-indigo-400 border-indigo-400/50" : "text-purple-400 border-purple-400/50"}`}>
                    {log.platform}
                  </Badge>
                  <span className="font-medium text-primary w-32 shrink-0 truncate">
                    {log.displayName}
                  </span>
                  <span className="text-foreground break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
