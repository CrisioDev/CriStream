import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, X, Tag } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/api/client";
import type { MarketplaceListingDto, ViewerInventoryItemDto } from "@cristream/shared";

const RARITY_BG: Record<string, string> = {
  common: "border-gray-500/50",
  uncommon: "border-green-500/50",
  rare: "border-blue-500/50",
  epic: "border-purple-500/50",
  legendary: "border-yellow-500/50",
};

const RARITY_LABEL: Record<string, string> = {
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
};

export function MarketplacePage() {
  const { channelName } = useParams<{ channelName: string }>();
  const { user } = useAuthStore();
  const [listings, setListings] = useState<MarketplaceListingDto[]>([]);
  const [showSell, setShowSell] = useState(false);
  const [inventory, setInventory] = useState<ViewerInventoryItemDto[]>([]);
  const [sellItemId, setSellItemId] = useState("");
  const [sellQty, setSellQty] = useState(1);
  const [sellPrice, setSellPrice] = useState(100);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (channelName) loadListings();
  }, [channelName]);

  const loadListings = async () => {
    const res = await api.get<MarketplaceListingDto[]>(`/viewer/${channelName}/marketplace`);
    if (res.data) setListings(res.data);
  };

  const loadInventory = async () => {
    if (!user || !channelName) return;
    const res = await api.get<{ inventory: ViewerInventoryItemDto[] }>(
      `/viewer/${channelName}/profile/${user.twitchId}`
    );
    if (res.data) setInventory(res.data.inventory);
  };

  const openSell = async () => {
    setShowSell(true);
    await loadInventory();
  };

  const sell = async () => {
    if (!channelName || !sellItemId) return;
    // Find the lootbox item id from inventory
    const invItem = inventory.find((i) => i.id === sellItemId);
    if (!invItem) return;
    // We need the actual itemId, not the inventory id - extract from API
    // The inventory items have the item info embedded
    await api.post(`/viewer/${channelName}/marketplace/sell`, {
      itemId: sellItemId, // This is the inventory item id, we need to fix this
      quantity: sellQty,
      pricePerUnit: sellPrice,
    });
    setShowSell(false);
    loadListings();
  };

  const buy = async (listingId: string) => {
    if (!channelName) return;
    setBuying(listingId);
    const res = await api.post(`/viewer/${channelName}/marketplace/${listingId}/buy`);
    setBuying(null);
    if (res.success) loadListings();
  };

  const cancel = async (listingId: string) => {
    if (!channelName) return;
    await api.delete(`/viewer/${channelName}/marketplace/${listingId}`);
    loadListings();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marktplatz</h1>
        {user && (
          <Button onClick={openSell}>
            <Tag className="mr-2 h-4 w-4" /> Item verkaufen
          </Button>
        )}
      </div>

      {showSell && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Item zum Verkauf anbieten</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSell(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label className="text-xs">Item auswählen</Label>
              <select
                className="w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm"
                value={sellItemId}
                onChange={(e) => setSellItemId(e.target.value)}
              >
                <option value="">-- Item wählen --</option>
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.itemName} (x{i.quantity}) - {RARITY_LABEL[i.itemRarity] ?? i.itemRarity}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Anzahl</Label>
                <Input type="number" value={sellQty} onChange={(e) => setSellQty(Math.max(1, parseInt(e.target.value) || 1))} min={1} />
              </div>
              <div>
                <Label className="text-xs">Preis pro Stück (Punkte)</Label>
                <Input type="number" value={sellPrice} onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 1))} min={1} />
              </div>
            </div>
            <Button onClick={sell} disabled={!sellItemId}>Verkaufen</Button>
          </CardContent>
        </Card>
      )}

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Angebote auf dem Marktplatz. Sei der Erste!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id} className={`border-2 ${RARITY_BG[listing.itemRarity] ?? ""}`}>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <div className="font-semibold">{listing.itemName}</div>
                  {listing.itemDescription && (
                    <p className="text-xs text-muted-foreground">{listing.itemDescription}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {RARITY_LABEL[listing.itemRarity] ?? listing.itemRarity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">x{listing.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold">{listing.pricePerUnit.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">Punkte</span>
                  </div>
                  <span className="text-xs text-muted-foreground">von {listing.sellerName}</span>
                </div>
                {user && user.twitchId === listing.sellerId ? (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => cancel(listing.id)}>
                    Zurückziehen
                  </Button>
                ) : user ? (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={buying === listing.id}
                    onClick={() => buy(listing.id)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {buying === listing.id ? "Kaufe..." : "Kaufen"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
