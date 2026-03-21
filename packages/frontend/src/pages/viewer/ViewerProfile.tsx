import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import type { ViewerProfileDto } from "@cristream/shared";

const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-500",
  uncommon: "border-green-500",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-yellow-500",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-gray-500/10",
  uncommon: "bg-green-500/10",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-yellow-500/10",
};

const RARITY_LABEL: Record<string, string> = {
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
};

export function ViewerProfilePage() {
  const { channelName, twitchUserId } = useParams<{ channelName: string; twitchUserId: string }>();
  const [profile, setProfile] = useState<ViewerProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelName || !twitchUserId) return;
    setLoading(true);
    api.get<ViewerProfileDto>(`/viewer/${channelName}/profile/${twitchUserId}`).then((r) => {
      if (r.data) setProfile(r.data);
      setLoading(false);
    });
  }, [channelName, twitchUserId]);

  if (loading) return <div className="text-muted-foreground">Laden...</div>;
  if (!profile) return <div className="text-muted-foreground">Viewer nicht gefunden.</div>;

  const watchH = Math.floor(profile.watchMinutes / 60);
  const watchM = profile.watchMinutes % 60;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
          {profile.displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {profile.activeTitle && (
              <span className="text-lg text-purple-400">{profile.activeTitle}</span>
            )}
            {profile.displayName}
          </h1>
          <p className="text-muted-foreground text-sm">auf {channelName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{profile.points.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Punkte</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{watchH}h {watchM}m</div>
            <div className="text-xs text-muted-foreground">Watchtime</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{profile.inventory.length}</div>
            <div className="text-xs text-muted-foreground">Verschiedene Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">
              {profile.inventory.reduce((sum, i) => sum + i.quantity, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Items Gesamt</div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      {profile.collectionProgress.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h2 className="font-semibold">Sammlung</h2>
            {profile.collectionProgress.map((cp) => (
              <div key={cp.rarity} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{RARITY_LABEL[cp.rarity] ?? cp.rarity}</span>
                  <span className="text-muted-foreground">{cp.owned}/{cp.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cp.rarity === "legendary" ? "bg-yellow-500" : cp.rarity === "epic" ? "bg-purple-500" : cp.rarity === "rare" ? "bg-blue-500" : cp.rarity === "uncommon" ? "bg-green-500" : "bg-gray-400"}`}
                    style={{ width: `${cp.total > 0 ? (cp.owned / cp.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Inventory */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Inventar</h2>
        {profile.inventory.length === 0 ? (
          <p className="text-muted-foreground">Noch keine Items gesammelt.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {profile.inventory.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border-2 p-3 ${RARITY_COLORS[item.itemRarity] ?? ""} ${RARITY_BG[item.itemRarity] ?? ""}`}
              >
                <div className="font-medium text-sm truncate">{item.itemName}</div>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {RARITY_LABEL[item.itemRarity] ?? item.itemRarity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
