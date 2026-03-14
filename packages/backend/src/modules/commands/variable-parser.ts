import type { MessageContext } from "../../twitch/message-handler.js";

type VariableResolver = (args: string[], ctx: MessageContext) => string | Promise<string>;

const variables = new Map<string, VariableResolver>();

export function registerVariable(name: string, resolver: VariableResolver) {
  variables.set(name, resolver);
}

// Built-in variables
registerVariable("user", (_args, ctx) => ctx.user);
registerVariable("channel", (_args, ctx) => ctx.channel);
registerVariable("query", (_args, ctx) => {
  const parts = ctx.message.split(" ");
  return parts.slice(1).join(" ") || "";
});
registerVariable("touser", (_args, ctx) => {
  const parts = ctx.message.split(" ");
  return parts[1]?.replace("@", "") || ctx.user;
});
registerVariable("count", () => "{count}"); // replaced by command handler with useCount
registerVariable("time", () => new Date().toLocaleTimeString("de-DE"));
registerVariable("random", (args) => {
  const max = parseInt(args[0] ?? "100", 10);
  return String(Math.floor(Math.random() * max) + 1);
});
registerVariable("uptime", () => {
  const seconds = Math.floor(process.uptime());
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
});

export async function parseVariables(template: string, ctx: MessageContext): Promise<string> {
  let result = template;
  // Match $(name) or $(name.arg)
  const regex = /\$\((\w+)(?:\.(\w+))?\)/g;
  const matches = [...template.matchAll(regex)];

  for (const match of matches) {
    const [full, name, arg] = match;
    const resolver = variables.get(name!);
    if (resolver) {
      const args = arg ? [arg] : [];
      const value = await resolver(args, ctx);
      result = result.replace(full, value);
    }
  }

  return result;
}
