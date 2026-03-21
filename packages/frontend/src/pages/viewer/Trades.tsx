import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { TradeOfferDto } from "@cristream/shared";

const RARITY_LABEL: Record<string, string> = {
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  accepted: "Angenommen",
  declined: "Abgelehnt",
  cancelled: "Abgebrochen",
  expired: "Abgelaufen",
};

export function TradesPage() {
  const { channelName } = useParams<{ channelName: string }>();
  const { user, login } = useAuthStore();
  const [trades, setTrades] = useState<TradeOfferDto[]>([]);

  useEffect(() => {
    if (user && channelName) loadTrades();
  }, [user, channelName]);

  const loadTrades = async () => {
    const res = await api.get<TradeOfferDto[]>(`/viewer/${channelName}/trades`);
    if (res.data) setTrades(res.data);
  };

  if (!user) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">Du musst eingeloggt sein um Trades zu sehen.</p>
        <Button onClick={login}>Login mit Twitch</Button>
      </div>
    );
  }

  const incoming = trades.filter((t) => t.receiverId === user.twitchId && t.status === "pending");
  const outgoing = trades.filter((t) => t.senderId === user.twitchId && t.status === "pending");
  const history = trades.filter((t) => t.status !== "pending");

  const accept = async (id: string) => {
    await api.post(`/viewer/${channelName}/trades/${id}/accept`);
    loadTrades();
  };

  const decline = async (id: string) => {
    await api.post(`/viewer/${channelName}/trades/${id}/decline`);
    loadTrades();
  };

  const cancel = async (id: string) => {
    await api.delete(`/viewer/${channelName}/trades/${id}`);
    loadTrades();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trades</h1>

      {incoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Eingehende Anfragen</h2>
          {incoming.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              currentUserId={user.twitchId}
              onAccept={() => accept(trade.id)}
              onDecline={() => decline(trade.id)}
            />
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Ausgehende Anfragen</h2>
          {outgoing.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              currentUserId={user.twitchId}
              onCancel={() => cancel(trade.id)}
            />
          ))}
        </div>
      )}

      {incoming.length === 0 && outgoing.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine aktiven Trades. Trades können über Viewer-Profile gestartet werden.
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg text-muted-foreground">Verlauf</h2>
          {history.slice(0, 20).map((trade) => (
            <TradeCard key={trade.id} trade={trade} currentUserId={user.twitchId} />
          ))}
        </div>
      )}
    </div>
  );
}

function TradeCard({
  trade,
  currentUserId,
  onAccept,
  onDecline,
  onCancel,
}: {
  trade: TradeOfferDto;
  currentUserId: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const offered = trade.offerItems.filter((i) => i.side === "offered");
  const requested = trade.offerItems.filter((i) => i.side === "requested");
  const isPending = trade.status === "pending";
  const otherName = currentUserId === trade.senderId ? trade.receiverName : trade.senderName;

  return (
    <Card className={isPending ? "" : "opacity-60"}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <span className="font-medium">{trade.senderName}</span>
            <ArrowRight className="inline h-3 w-3 mx-1" />
            <span className="font-medium">{trade.receiverName}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {STATUS_LABEL[trade.status] ?? trade.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Bietet an:</div>
            {offered.map((i, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span>{i.itemName} x{i.quantity}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{RARITY_LABEL[i.itemRarity] ?? i.itemRarity}</Badge>
              </div>
            ))}
            {trade.pointsOffered > 0 && (
              <div className="text-yellow-500">+{trade.pointsOffered} Punkte</div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Möchte dafür:</div>
            {requested.map((i, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span>{i.itemName} x{i.quantity}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{RARITY_LABEL[i.itemRarity] ?? i.itemRarity}</Badge>
              </div>
            ))}
            {trade.pointsRequested > 0 && (
              <div className="text-yellow-500">+{trade.pointsRequested} Punkte</div>
            )}
          </div>
        </div>

        {isPending && (onAccept || onDecline || onCancel) && (
          <div className="flex gap-2 mt-3">
            {onAccept && (
              <Button size="sm" onClick={onAccept}>
                <Check className="mr-1 h-3 w-3" /> Annehmen
              </Button>
            )}
            {onDecline && (
              <Button size="sm" variant="destructive" onClick={onDecline}>
                <X className="mr-1 h-3 w-3" /> Ablehnen
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
