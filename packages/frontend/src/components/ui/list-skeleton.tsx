import { Card, CardContent } from "@/components/ui/card";

interface Props {
  rows?: number;
}

/**
 * Generic skeleton for "list of cards" pages — used while data is loading so
 * the page doesn't flash an "Empty" state during a channel switch.
 */
export function ListSkeleton({ rows = 3 }: Props) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Lade Daten">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
