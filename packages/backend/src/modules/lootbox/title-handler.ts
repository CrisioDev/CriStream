import { registerHandler } from "../../twitch/message-handler.js";
import { lootboxService } from "./service.js";

// Priority 2 = before everything else, prepends title to ctx.user
registerHandler("titles", 2, async (ctx) => {
  if (!ctx.channelId) return;
  const title = await lootboxService.getActiveTitle(ctx.channelId, ctx.msg.userInfo.userId);
  if (title) {
    ctx.user = `${title} ${ctx.user}`;
  }
});
