import { registerHandler } from "../../twitch/message-handler.js";
import { sayInChannel } from "../../twitch/twitch-client.js";

// Auto-responses: keyword triggers that don't require a command prefix
// Priority 42 = after moderation (10), before commands (50)
registerHandler("autoresponse", 42, async (ctx) => {
  if (!ctx.channelId) return;

  const lower = ctx.message.toLowerCase();

  if (lower.includes("was wird")) {
    sayInChannel(ctx.channel, "was wird");
    ctx.handled = true;
  }
});
