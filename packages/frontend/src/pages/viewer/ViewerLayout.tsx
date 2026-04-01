import { useEffect } from "react";
import { Outlet, NavLink, useParams, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

export function ViewerLayout() {
  const { channelName } = useParams<{ channelName: string }>();
  const { user, login, logout } = useAuthStore();

  // Handle token from viewer OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refresh = params.get("refresh");
    if (token && refresh) {
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refresh);
      window.history.replaceState({}, "", window.location.pathname);
      window.location.reload();
    }
  }, []);

  if (!channelName) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {/* Top navbar */}
      <nav className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                CS
              </div>
              <span className="font-semibold">CriStream</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{channelName}</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              {[
                { to: `marketplace`, label: "Marktplatz", relative: true },
                { to: `trades`, label: "Trades", relative: true },
                { to: "/casino", label: "🎰 Casino", relative: false },
              ].map(({ to, label, relative }) => (
                <NavLink
                  key={to}
                  to={relative ? `/viewer/${channelName}/${to}` : to}
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                )}
                <NavLink
                  to={`/viewer/${channelName}/profile/${user.twitchId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {user.displayName}
                </NavLink>
                <button
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-foreground ml-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <a
                href="/api/auth/twitch/viewer"
                className="rounded-md bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700 inline-block"
              >
                Login mit Twitch
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
