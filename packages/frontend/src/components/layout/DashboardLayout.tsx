import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/commands": "Commands",
  "/timers": "Timers",
  "/moderation": "Moderation",
  "/chatlogs": "Chat Logs",
  "/points": "Points",
  "/songrequests": "Song Requests",
  "/alerts": "Alerts",
  "/channelpoints": "Channel Points",
  "/counters": "Counters",
  "/lootbox": "Lootbox",
  "/requests": "Requests",
  "/overlay": "Overlay",
  "/sandbox": "Sandbox",
  "/stopwatch": "Stopwatch",
  "/countdown": "Countdown",
  "/discord": "Discord",
  "/settings": "Settings",
  "/admin/casino": "Casino Admin",
};

export function DashboardLayout() {
  const activeChannel = useAuthStore((s) => s.activeChannel);
  const location = useLocation();
  usePageTitle(ROUTE_TITLES[location.pathname] ?? "Dashboard");

  return (
    <div className="flex h-screen dark bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-6 py-2 text-xs backdrop-blur">
          <span className="text-muted-foreground">Aktiver Channel:</span>
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-semibold text-primary">
            {activeChannel?.displayName ?? "—"}
          </span>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
