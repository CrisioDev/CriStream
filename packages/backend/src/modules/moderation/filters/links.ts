import type { MessageContext } from "../../../twitch/message-handler.js";

const URL_REGEX = /https?:\/\/\S+|www\.\S+|\S+\.\S{2,}\/\S*/i;

export function checkLinks(message: string, _ctx: MessageContext): boolean {
  return URL_REGEX.test(message);
}
