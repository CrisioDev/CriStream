import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { logger } from "../../lib/logger.js";
import type {
  RewardAction,
  OverlayAlertPayload,
  AlertType,
  AnimationType,
} from "@cristream/shared";

export async function executeRewardActions(
  channelId: string,
  channelName: string,
  userName: string,
  userInput: string,
  rewardTitle: string,
  actions: RewardAction[]
): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "sound": {
          const soundUrl = pickRandomSound(action.soundFileUrl);
          if (soundUrl) {
            emitToChannel(channelId, "sound:play", {
              channelId,
              soundUrl,
              volume: action.volume,
            });
          }
          break;
        }

        case "alert": {
          const text = await resolveTemplate(action.textTemplate, channelId, userName, rewardTitle, userInput);
          const soundUrl = pickRandomSound(action.soundFileUrl);
          const payload: OverlayAlertPayload = {
            alertType: "command" as AlertType,
            text,
            duration: action.duration,
            animationType: action.animationType as AnimationType,
            soundUrl,
            imageUrl: action.imageFileUrl,
            volume: action.volume,
            layoutConfig: action.layoutConfig ?? null,
            ttsEnabled: action.ttsEnabled,
            ttsVoice: action.ttsVoice,
            ttsRate: action.ttsRate,
            ttsVolume: action.ttsVolume,
            videoMuted: action.videoMuted,
            videoLoop: action.videoLoop,
          };
          emitToChannel(channelId, "alert:trigger", { channelId, payload });
          break;
        }

        case "command": {
          const cmd = await prisma.command.findFirst({
            where: {
              channelId,
              trigger: action.commandTrigger.replace(/^!/, ""),
              enabled: true,
            },
          });
          if (cmd) {
            const response = await resolveTemplate(cmd.response, channelId, userName, rewardTitle, userInput);
            sayInChannel(channelName, response);
            await prisma.command.update({
              where: { id: cmd.id },
              data: { useCount: { increment: 1 } },
            });
          } else {
            logger.warn({ channelId, trigger: action.commandTrigger }, "Reward action: command not found");
          }
          break;
        }

        case "chat_message": {
          const msg = await resolveTemplate(action.messageTemplate, channelId, userName, rewardTitle, userInput);
          sayInChannel(channelName, msg);
          break;
        }

        case "tts":
          logger.warn("TTS reward action not yet implemented");
          break;

        case "webhook":
          logger.warn("Webhook reward action not yet implemented");
          break;
      }
    } catch (err) {
      logger.error({ err, channelId, actionType: action.type }, "Failed to execute reward action");
    }
  }
}

/**
 * Pick a random sound from a field that may contain multiple URLs separated by newlines or commas.
 */
export function pickRandomSound(soundFileUrl: string): string {
  if (!soundFileUrl) return "";
  const urls = soundFileUrl
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return "";
  if (urls.length === 1) return urls[0]!;
  return urls[Math.floor(Math.random() * urls.length)]!;
}

async function resolveTemplate(
  template: string,
  channelId: string,
  user: string,
  reward: string,
  input: string
): Promise<string> {
  let result = template
    .replace(/\{user\}/g, user)
    .replace(/\{reward\}/g, reward)
    .replace(/\{input\}/g, input);

  // Resolve $(variable) style variables too
  if (result.includes("$(")) {
    try {
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (channel) {
        const { parseVariables } = await import("../commands/variable-parser.js");
        result = await parseVariables(result, {
          channel: channel.displayName,
          user,
          userId: "", // No Twitch userId available for reward redemptions
          message: input,
        });
      }
    } catch {
      // Variable parsing is best-effort
    }
  }

  return result;
}
