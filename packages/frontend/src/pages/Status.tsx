import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

interface StatusData {
  status: string;
  uptime: number;
  version: string;
  twitch: { connected: boolean; channels: string[]; channelCount: number };
  discord: { connected: boolean; guilds: number };
  stats: {
    totalChannels: number;
    totalUsers: number;
    totalCommands: number;
    totalChatLogs: number;
    totalLootboxItems: number;
  };
  timestamp: string;
}

export function StatusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);

  // Fetch status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setError(false);
        }
      } catch {
        setError(true);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Globe
  useEffect(() => {
    if (!canvasRef.current) return;

    let phi = 0;
    let animFrame: number;
    const width = 800;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.56, 0.28, 1.0],
      glowColor: [0.15, 0.1, 0.3],
      markers: [
        { location: [51.1657, 10.4515], size: 0.08 },
        { location: [48.8566, 2.3522], size: 0.05 },
        { location: [52.52, 13.405], size: 0.07 },
        { location: [48.2082, 16.3738], size: 0.06 },
        { location: [47.3769, 8.5417], size: 0.05 },
        { location: [50.0755, 14.4378], size: 0.04 },
        { location: [52.3676, 4.9041], size: 0.04 },
        { location: [40.4168, -3.7038], size: 0.03 },
        { location: [41.9028, 12.4964], size: 0.03 },
        { location: [51.5074, -0.1278], size: 0.04 },
        { location: [59.9139, 10.7522], size: 0.03 },
        { location: [55.6761, 12.5683], size: 0.03 },
        { location: [37.7749, -122.4194], size: 0.03 },
        { location: [40.7128, -74.006], size: 0.03 },
        { location: [35.6762, 139.6503], size: 0.02 },
        { location: [-33.8688, 151.2093], size: 0.02 },
        { location: [-23.5505, -46.6333], size: 0.02 },
      ],
    });

    function animate() {
      phi += 0.003;
      globe.update({ phi });
      animFrame = requestAnimationFrame(animate);
    }
    animFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrame);
      globe.destroy();
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isOnline = data?.status === "online";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Globe background */}
      <div className="fixed inset-0 flex items-center justify-center opacity-40 pointer-events-none">
        <canvas
          ref={canvasRef}
          style={{ width: 800, height: 800, maxWidth: "100vw", maxHeight: "100vh", aspectRatio: "1" }}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
              CS
            </div>
            <h1 className="text-4xl font-bold tracking-tight">CriStream</h1>
          </div>
          <p className="text-gray-400 text-lg">System Status</p>
        </div>

        {/* Status indicator */}
        <div className="mb-10">
          {error ? (
            <div className="flex items-center gap-3 rounded-full bg-red-500/10 border border-red-500/30 px-6 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-medium">Unreachable</span>
            </div>
          ) : isOnline ? (
            <div className="flex items-center gap-3 rounded-full bg-green-500/10 border border-green-500/30 px-6 py-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-medium">All Systems Operational</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 px-6 py-3">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-yellow-400 font-medium">Partially Online</span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10">
            <StatCard label="Uptime" value={formatUptime(data.uptime)} />
            <StatCard label="Channels" value={String(data.stats.totalChannels)} />
            <StatCard label="Users" value={data.stats.totalUsers.toLocaleString()} />
            <StatCard label="Chat Messages" value={data.stats.totalChatLogs.toLocaleString()} />
          </div>
        )}

        {/* Service status */}
        {data && (
          <div className="max-w-2xl w-full space-y-3 mb-10">
            <ServiceRow
              name="Twitch Chat Bot"
              status={data.twitch.connected}
              detail={`${data.twitch.channelCount} channels`}
            />
            <ServiceRow
              name="Discord Bot"
              status={data.discord.connected}
              detail={`${data.discord.guilds} server${data.discord.guilds !== 1 ? "" : ""}`}
            />
            <ServiceRow name="API Server" status={true} detail="Fastify" />
            <ServiceRow name="Database" status={true} detail="PostgreSQL" />
            <ServiceRow name="Cache" status={true} detail="Redis" />
          </div>
        )}

        {/* Active channels */}
        {data && data.twitch.channels.length > 0 && (
          <div className="max-w-2xl w-full mb-10">
            <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3 text-center">Active Channels</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {data.twitch.channels.map((ch) => (
                <a
                  key={ch}
                  href={`https://twitch.tv/${ch.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 text-sm text-purple-300 hover:bg-purple-500/20 transition-colors"
                >
                  {ch}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>
            v{data?.version ?? "1.0.0"} &middot; Last updated:{" "}
            {data ? new Date(data.timestamp).toLocaleTimeString("de-DE") : "..."}
          </p>
          <p className="mt-1">
            <a href="https://github.com/CrisioDev/CriStream" className="text-gray-500 hover:text-gray-400">
              GitHub
            </a>
            {" "}&middot;{" "}
            <a href="https://ko-fi.com/thecrisio" className="text-gray-500 hover:text-gray-400">
              Ko-fi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function ServiceRow({ name, status, detail }: { name: string; status: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm px-5 py-3">
      <div className="flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`} />
        <span className="font-medium">{name}</span>
      </div>
      <span className="text-sm text-gray-500">{detail}</span>
    </div>
  );
}
