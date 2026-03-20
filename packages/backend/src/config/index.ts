function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  nodeEnv: env("NODE_ENV", "development"),
  port: parseInt(env("PORT", "3000"), 10),
  logLevel: env("LOG_LEVEL", "info"),

  // Twitch
  twitchClientId: env("TWITCH_CLIENT_ID", ""),
  twitchClientSecret: env("TWITCH_CLIENT_SECRET", ""),
  twitchRedirectUri: env("TWITCH_REDIRECT_URI", "http://localhost:3000/api/auth/twitch/callback"),
  twitchBotUsername: env("TWITCH_BOT_USERNAME", ""),

  // JWT
  jwtSecret: env("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: env("JWT_EXPIRES_IN", "7d"),

  // Encryption
  encryptionKey: env("ENCRYPTION_KEY", "0".repeat(64)),

  // Database
  databaseUrl: env("DATABASE_URL", "postgresql://cristream:cristream@localhost:5432/cristream"),

  // Redis
  redisUrl: env("REDIS_URL", "redis://localhost:6379"),

  // CORS
  corsOrigin: env("CORS_ORIGIN", "http://localhost:5173"),

  // Uploads
  uploadsDir: env("UPLOADS_DIR", "uploads"),
  publicUrl: env("PUBLIC_URL", "http://localhost:3000"),

  // Discord
  discordBotToken: env("DISCORD_BOT_TOKEN", ""),
  discordClientId: env("DISCORD_CLIENT_ID", ""),

  // Anthropic (for AI summaries)
  anthropicApiKey: env("ANTHROPIC_API_KEY", ""),

  // EventSub
  eventsubSecret: env("EVENTSUB_SECRET", "cristream-eventsub-secret"),
  eventsubCallbackUrl: env("EVENTSUB_CALLBACK_URL", "http://localhost:3000/api/eventsub/webhook"),
};
