export const USER_LEVELS = ["everyone", "subscriber", "vip", "moderator", "broadcaster"] as const;

export const USER_LEVEL_HIERARCHY: Record<string, number> = {
  everyone: 0,
  subscriber: 1,
  vip: 2,
  moderator: 3,
  broadcaster: 4,
};

export const DEFAULT_COMMAND_COOLDOWN = 5;
export const DEFAULT_TIMER_INTERVAL = 15;
export const DEFAULT_TIMER_MIN_LINES = 5;
export const DEFAULT_COMMAND_PREFIX = "!";

export const TWITCH_SCOPES = [
  "chat:read",
  "chat:edit",
  "channel:moderate",
  "moderator:manage:banned_users",
  "moderator:manage:chat_messages",
  "user:read:email",
  "moderator:read:followers",
  "channel:read:subscriptions",
  "channel:read:hype_train",
  "channel:read:redemptions",
  "channel:manage:redemptions",
  "user:manage:whispers",
  "user:read:moderated_channels",
  "channel:read:polls",
  "channel:read:predictions",
];

// Custom API Variables
export const CUSTOM_API_TIMEOUT_MS = 5000;
export const CUSTOM_API_CACHE_TTL = 30;
export const CUSTOM_API_MAX_RESPONSE_LENGTH = 400;

// Alert Types
export const ALERT_TYPES = [
  "follow",
  "sub",
  "giftsub",
  "raid",
  "hypetrain",
  "command",
  "sound",
] as const;

// Animation Types
export const ANIMATION_TYPES = ["slide", "fade", "bounce", "zoom"] as const;

// Overlay Fonts
export const OVERLAY_FONTS = [
  "Segoe UI",
  "Arial",
  "Georgia",
  "Impact",
  "Comic Sans MS",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Oswald",
  "Lobster",
  "Bebas Neue",
  "Bangers",
  "Permanent Marker",
  "Press Start 2P",
] as const;

// Google Fonts (subset of OVERLAY_FONTS that need loading)
export const GOOGLE_FONTS = [
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Oswald",
  "Lobster",
  "Bebas Neue",
  "Bangers",
  "Permanent Marker",
  "Press Start 2P",
] as const;

// Default Overlay Layout
export const DEFAULT_LAYOUT_CONFIG = {
  version: 1 as const,
  canvas: { width: 1920, height: 1080, background: "transparent" },
  elements: [
    {
      type: "image" as const,
      id: "image-1",
      x: 710,
      y: 90,
      width: 500,
      height: 500,
      zIndex: 1,
      borderRadius: 12,
      borderWidth: 0,
      borderColor: "#ffffff",
      objectFit: "contain" as const,
    },
    {
      type: "text" as const,
      id: "text-1",
      x: 360,
      y: 650,
      width: 1200,
      height: 100,
      zIndex: 2,
      fontFamily: "Segoe UI",
      fontSize: 32,
      fontWeight: "bold" as const,
      fontStyle: "normal" as const,
      color: "#ffffff",
      textAlign: "center" as const,
      textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
      textStroke: "",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: 12,
      borderRadius: 12,
    },
  ],
};

// Channel Points Reward Action Types
export const REWARD_ACTION_TYPES_AVAILABLE = ["sound", "alert", "command", "chat_message"] as const;

// Upload Limits
export const UPLOAD_LIMITS = {
  sound: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedExtensions: [".mp3", ".wav", ".ogg", ".webm"],
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
  },
  image: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  },
  video: {
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedExtensions: [".webm", ".mp4"],
    allowedMimeTypes: ["video/webm", "video/mp4"],
  },
} as const;
