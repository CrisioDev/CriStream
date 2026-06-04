import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Terminal,
  Clock,
  Shield,
  Settings,
  LogOut,
  MessageSquare,
  Trophy,
  Music,
  Bell,
  Gift,
  Monitor,
  ListTodo,
  Hash,
  Package,
  Timer,
  Hourglass,
  Bot,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { api } from "@/api/client";

const HOME_ITEM = { to: "/", icon: LayoutDashboard, label: "Dashboard" };

const NAV_GROUPS = [
  {
    label: "Chat & Engagement",
    items: [
      { to: "/commands", icon: Terminal, label: "Commands" },
      { to: "/timers", icon: Clock, label: "Timers" },
      { to: "/alerts", icon: Bell, label: "Alerts" },
      { to: "/moderation", icon: Shield, label: "Moderation" },
      { to: "/chatlogs", icon: MessageSquare, label: "Chat Logs" },
    ],
  },
  {
    label: "Viewer-Mechaniken",
    items: [
      { to: "/points", icon: Trophy, label: "Points" },
      { to: "/channelpoints", icon: Gift, label: "Channel Points" },
      { to: "/lootbox", icon: Package, label: "Lootbox" },
      { to: "/songrequests", icon: Music, label: "Song Requests" },
      { to: "/requests", icon: ListTodo, label: "Requests" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/counters", icon: Hash, label: "Counters" },
      { to: "/stopwatch", icon: Timer, label: "Stopwatch" },
      { to: "/countdown", icon: Hourglass, label: "Countdown" },
      { to: "/sandbox", icon: Layers, label: "Sandbox" },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/overlay", icon: Monitor, label: "Overlay" },
      { to: "/discord", icon: Bot, label: "Discord" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function Sidebar() {
  const { user, channels, activeChannel, setActiveChannel, refreshChannels, logout } = useAuthStore();
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  const location = useLocation();
  // Default-expanded: the group containing the current route, so the user always
  // sees the section they're in. Other groups stay collapsed to reduce visual
  // noise from 17 flat items down to ~5 groups.
  const activeGroupLabel = NAV_GROUPS.find((g) =>
    g.items.some((i) => location.pathname === i.to)
  )?.label;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(activeGroupLabel ? [activeGroupLabel] : [NAV_GROUPS[0]!.label])
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );

  const handleAddChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await api.post("/channels", { twitchUsername: newChannelName.trim() });
      setNewChannelName("");
      setShowAddChannel(false);
      await refreshChannels();
    } catch {
      // ignore
    }
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex items-center gap-3 border-b p-4">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          CS
        </div>
        <span className="font-semibold text-lg">CriStream</span>
      </div>

      {/* Channel Switcher */}
      <div className="border-b p-3">
        <div className="relative">
          <button
            onClick={() => setShowChannelDropdown(!showChannelDropdown)}
            className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <span className="truncate">{activeChannel?.displayName ?? "Select Channel"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          {showChannelDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannel(ch);
                    setShowChannelDropdown(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-sm hover:bg-accent",
                    ch.id === activeChannel?.id && "bg-accent font-medium"
                  )}
                >
                  {ch.displayName}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowAddChannel(true);
                  setShowChannelDropdown(false);
                }}
                className="flex w-full items-center gap-2 border-t px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                <Plus className="h-3 w-3" /> Add Channel
              </button>
            </div>
          )}
        </div>

        {showAddChannel && (
          <div className="mt-2 flex gap-1">
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
              placeholder="Twitch username"
              className="flex-1 rounded-md border bg-background text-foreground px-2 py-1 text-sm"
            />
            <button
              onClick={handleAddChannel}
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <NavLink to={HOME_ITEM.to} end className={navLinkClass}>
          <HOME_ITEM.icon className="h-4 w-4" />
          {HOME_ITEM.label}
        </NavLink>

        {NAV_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          return (
            <div key={group.label} className="pt-2">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                <span>{group.label}</span>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {group.items.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} className={navLinkClass}>
                      <Icon className="h-4 w-4" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.avatarUrl && (
            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-foreground" aria-label="Abmelden">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
