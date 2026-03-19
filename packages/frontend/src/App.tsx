import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { CommandsPage } from "@/pages/Commands";
import { TimersPage } from "@/pages/Timers";
import { ModerationPage } from "@/pages/Moderation";
import { SettingsPage } from "@/pages/Settings";
import { ChatLogsPage } from "@/pages/ChatLogs";
import { PointsPage } from "@/pages/Points";
import { SongRequestsPage } from "@/pages/SongRequests";
import { AlertsPage } from "@/pages/Alerts";
import { ChannelPointsPage } from "@/pages/ChannelPoints";
import { OverlayPage } from "@/pages/Overlay";
import { RequestsPage } from "@/pages/Requests";
import { DiscordPage } from "@/pages/Discord";

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

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
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
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/discord" element={<DiscordPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
