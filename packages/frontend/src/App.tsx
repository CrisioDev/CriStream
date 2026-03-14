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

export function App() {
  const { user, isLoading, loadFromUrl } = useAuthStore();

  useEffect(() => {
    loadFromUrl();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
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
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
