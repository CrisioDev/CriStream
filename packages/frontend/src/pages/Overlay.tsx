import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";

export function OverlayPage() {
  const { activeChannel: channel } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [copiedPlayer, setCopiedPlayer] = useState(false);

  if (!channel) return null;

  const overlayUrl = `${window.location.origin}/overlay/${channel.overlayToken}`;
  const playerUrl = `${window.location.origin}/overlay/${channel.overlayToken}/player`;

  const handleCopy = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlayer = () => {
    navigator.clipboard.writeText(playerUrl);
    setCopiedPlayer(true);
    setTimeout(() => setCopiedPlayer(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">OBS Overlay</h1>

      <Card>
        <CardHeader>
          <CardTitle>Browser Source URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this URL as a Browser Source in OBS to display alerts on your stream.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-sm break-all">
              {overlayUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <a href={overlayUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Song Request Player</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add this URL as a separate Browser Source in OBS to play YouTube song requests.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-sm break-all">
              {playerUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyPlayer}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedPlayer ? "Copied!" : "Copy"}
            </Button>
            <a href={playerUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OBS Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Recommended OBS Browser Source settings:</p>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Width</span>
              <Badge variant="outline">1920</Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Height</span>
              <Badge variant="outline">1080</Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">FPS</span>
              <Badge variant="outline">30</Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Custom CSS</span>
              <code className="text-xs">body {"{"} background-color: rgba(0,0,0,0); {"}"}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shutdown source when not visible</span>
              <Badge variant="outline">Disabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
