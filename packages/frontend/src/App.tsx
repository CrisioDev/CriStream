import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Eager imports: things shown on initial render or by every authed user.
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";

// Everything else is lazy so the initial JS bundle doesn't ship code for 24
// routes the user may never visit. Lighthouse reported ~514 KiB of unused JS
// per route before this; each lazy() call becomes its own Vite chunk.
const CommandsPage      = lazy(() => import("@/pages/Commands").then(m => ({ default: m.CommandsPage })));
const TimersPage        = lazy(() => import("@/pages/Timers").then(m => ({ default: m.TimersPage })));
const ModerationPage    = lazy(() => import("@/pages/Moderation").then(m => ({ default: m.ModerationPage })));
const SettingsPage      = lazy(() => import("@/pages/Settings").then(m => ({ default: m.SettingsPage })));
const ChatLogsPage      = lazy(() => import("@/pages/ChatLogs").then(m => ({ default: m.ChatLogsPage })));
const PointsPage        = lazy(() => import("@/pages/Points").then(m => ({ default: m.PointsPage })));
const SongRequestsPage  = lazy(() => import("@/pages/SongRequests").then(m => ({ default: m.SongRequestsPage })));
const AlertsPage        = lazy(() => import("@/pages/Alerts").then(m => ({ default: m.AlertsPage })));
const ChannelPointsPage = lazy(() => import("@/pages/ChannelPoints").then(m => ({ default: m.ChannelPointsPage })));
const OverlayPage       = lazy(() => import("@/pages/Overlay").then(m => ({ default: m.OverlayPage })));
const RequestsPage      = lazy(() => import("@/pages/Requests").then(m => ({ default: m.RequestsPage })));
const DiscordPage       = lazy(() => import("@/pages/Discord").then(m => ({ default: m.DiscordPage })));
const SandboxPage       = lazy(() => import("@/pages/Sandbox").then(m => ({ default: m.SandboxPage })));
const CountersPage      = lazy(() => import("@/pages/Counters").then(m => ({ default: m.CountersPage })));
const LootboxPage       = lazy(() => import("@/pages/Lootbox").then(m => ({ default: m.LootboxPage })));
const StatusPage        = lazy(() => import("@/pages/Status").then(m => ({ default: m.StatusPage })));
const CasinoPage        = lazy(() => import("@/pages/casino").then(m => ({ default: m.CasinoPage })));
const StopwatchPage     = lazy(() => import("@/pages/Stopwatch").then(m => ({ default: m.StopwatchPage })));
const CountdownPage     = lazy(() => import("@/pages/Countdown").then(m => ({ default: m.CountdownPage })));
const CasinoAdminPage   = lazy(() => import("@/pages/CasinoAdmin").then(m => ({ default: m.CasinoAdminPage })));
const ViewerLayout      = lazy(() => import("@/pages/viewer/ViewerLayout").then(m => ({ default: m.ViewerLayout })));
const ViewerProfilePage = lazy(() => import("@/pages/viewer/ViewerProfile").then(m => ({ default: m.ViewerProfilePage })));
const MarketplacePage   = lazy(() => import("@/pages/viewer/Marketplace").then(m => ({ default: m.MarketplacePage })));
const TradesPage        = lazy(() => import("@/pages/viewer/Trades").then(m => ({ default: m.TradesPage })));

function RouteLoading() {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <div className="text-sm text-muted-foreground">Lade...</div>
    </div>
  );
}

export function App() {
  const { user, isLoading, loadFromUrl } = useAuthStore();

  useEffect(() => {
    loadFromUrl();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background text-foreground">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary scope="App">
    <ToastProvider>
    <Suspense fallback={<RouteLoading />}>
    <Routes>
      {/* Public pages */}
      <Route path="/status" element={<StatusPage />} />
      <Route path="/casino" element={<CasinoPage />} />

      {/* Viewer section — accessible without dashboard login */}
      <Route path="/viewer/:channelName" element={<ViewerLayout />}>
        <Route path="profile/:twitchUserId" element={<ViewerProfilePage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route index element={<Navigate to="marketplace" />} />
      </Route>

      {/* Dashboard — requires login */}
      {!user ? (
        <Route path="*" element={<LoginPage />} />
      ) : (
        <>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/commands" element={<CommandsPage />} />
            <Route path="/timers" element={<TimersPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/chatlogs" element={<ChatLogsPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/songrequests" element={<SongRequestsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/channelpoints" element={<ChannelPointsPage />} />
            <Route path="/counters" element={<CountersPage />} />
            <Route path="/lootbox" element={<LootboxPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/overlay" element={<OverlayPage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="/stopwatch" element={<StopwatchPage />} />
            <Route path="/countdown" element={<CountdownPage />} />
            <Route path="/admin/casino" element={<CasinoAdminPage />} />
            <Route path="/discord" element={<DiscordPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
    </Suspense>
    </ToastProvider>
    </ErrorBoundary>
  );
}
