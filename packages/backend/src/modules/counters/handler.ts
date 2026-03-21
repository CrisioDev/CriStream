import { registerHandler } from "../../twitch/message-handler.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { counterService } from "./service.js";
import type { MessageContext } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";

// Priority 49 = just before commands (50)
registerHandler("counters", 49, async (ctx: MessageContext) => {
  if (!ctx.channelId) return;

  const channel = await prisma.channel.findUnique({ where: { id: ctx.channelId } });
  if (!channel) return;

  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(prefix)) return;

  const body = ctx.message.slice(prefix.length).trim();

  // !name+ or !name- (mod/broadcaster only)
  if (body.endsWith("+") || body.endsWith("-")) {
    if (!ctx.isMod && !ctx.isBroadcaster) return;

    const name = body.slice(0, -1).toLowerCase();
    if (!name) return;

    const isIncrement = body.endsWith("+");
    const counter = isIncrement
      ? await counterService.increment(ctx.channelId, name)
      : await counterService.decrement(ctx.channelId, name);

    if (counter) {
      sayInChannel(ctx.channel, `${counter.name}: ${counter.value}`);
      ctx.handled = true;
    }
    return;
  }

  // !name= (show current value, everyone)
  if (body.includes("=")) return; // don't interfere with set commands

  // Check if the trigger matches a counter name (show value)
  const triggerName = body.split(" ")[0]!.toLowerCase();
  const value = await counterService.getValue(ctx.channelId, triggerName);
  if (value !== null) {
    sayInChannel(ctx.channel, `${triggerName}: ${value}`);
    ctx.handled = true;
  }
});
