import Anthropic from "@anthropic-ai/sdk";
import { EmbedBuilder, ChannelType, type TextChannel } from "discord.js";
import { config } from "../../config/index.js";
import { getDiscordClientRaw } from "../../discord/discord-client.js";
import { logger } from "../../lib/logger.js";

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (!config.anthropicApiKey) return null;
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropic;
}

interface DiscordMessage {
  author: string;
  content: string;
  timestamp: string;
  channel: string;
}

export async function fetchDiscordMessages(
  guildId: string,
  hoursBack: number = 24
): Promise<DiscordMessage[]> {
  const client = getDiscordClientRaw();
  if (!client?.isReady()) return [];

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return [];

  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
  const messages: DiscordMessage[] = [];

  const textChannels = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildText
  );

  for (const [, channel] of textChannels) {
    try {
      let lastId: string | undefined;
      let done = false;

      while (!done) {
        const options: { limit: number; before?: string } = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await (channel as TextChannel).messages.fetch(options);
        if (fetched.size === 0) break;

        for (const [, msg] of fetched) {
          if (msg.author.bot) continue;
          if (msg.createdTimestamp < cutoff) {
            done = true;
            break;
          }
          if (msg.content.trim()) {
            messages.push({
              author: msg.author.displayName ?? msg.author.username,
              content: msg.content,
              timestamp: msg.createdAt.toISOString(),
              channel: channel.name,
            });
          }
        }

        lastId = fetched.last()?.id;
        if (fetched.size < 100) break;
      }
    } catch {
      // Skip channels without read access
    }
  }

  // Sort chronologically
  messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return messages;
}

export async function summarizeDiscordChat(
  guildId: string,
  hoursBack: number = 24,
  minMessages: number = 20
): Promise<EmbedBuilder | null> {
  const ai = getAnthropic();
  if (!ai) {
    logger.warn("No ANTHROPIC_API_KEY set — Discord chat summaries disabled");
    return null;
  }

  const messages = await fetchDiscordMessages(guildId, hoursBack);

  if (messages.length < minMessages) {
    logger.debug({ guildId, count: messages.length, minMessages }, "Too few Discord messages for summary");
    return null;
  }

  // Build conversation text for the AI
  // Group by channel for context
  const channelGroups = new Map<string, DiscordMessage[]>();
  for (const msg of messages) {
    const group = channelGroups.get(msg.channel) || [];
    group.push(msg);
    channelGroups.set(msg.channel, group);
  }

  let chatText = "";
  for (const [channelName, msgs] of channelGroups) {
    chatText += `\n--- #${channelName} ---\n`;
    for (const msg of msgs) {
      chatText += `${msg.author}: ${msg.content}\n`;
    }
  }

  // Truncate to ~100k chars to stay within token limits
  if (chatText.length > 100_000) {
    chatText = chatText.slice(-100_000);
  }

  try {
    const response = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Du bist ein Discord-Community-Zusammenfasser. Fasse die folgenden Discord-Chat-Nachrichten der letzten ${hoursBack} Stunden zusammen.

Schreibe die Zusammenfassung auf Deutsch. Strukturiere sie so:
- **Hauptthemen**: Die wichtigsten besprochenen Themen (2-5 Punkte)
- **Highlights**: Besondere Momente, lustige Aussagen oder wichtige Ankündigungen
- **Aktivste Channels**: Welche Channels waren am aktivsten

Halte die Zusammenfassung kurz und knackig (max 1500 Zeichen). Keine Begrüßung oder Einleitung.

${messages.length} Nachrichten von ${new Set(messages.map((m) => m.author)).size} Usern:

${chatText}`,
        },
      ],
    });

    const summaryText =
      response.content[0]?.type === "text" ? response.content[0].text : null;

    if (!summaryText) return null;

    const uniqueUsers = new Set(messages.map((m) => m.author)).size;
    const activeChannels = [...channelGroups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([name, msgs]) => `#${name} (${msgs.length})`)
      .join(", ");

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Discord Zusammenfassung (${hoursBack}h)`)
      .setDescription(summaryText)
      .addFields(
        { name: "Nachrichten", value: String(messages.length), inline: true },
        { name: "User", value: String(uniqueUsers), inline: true },
        { name: "Top Channels", value: activeChannels || "-", inline: true }
      )
      .setFooter({ text: "Powered by Claude AI" })
      .setTimestamp();

    logger.info(
      { guildId, messages: messages.length, users: uniqueUsers },
      "Discord chat summary generated"
    );

    return embed;
  } catch (err) {
    logger.error({ err }, "Failed to generate Discord chat summary");
    return null;
  }
}
