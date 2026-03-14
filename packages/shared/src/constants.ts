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
];
