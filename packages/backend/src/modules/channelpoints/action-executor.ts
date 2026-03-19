import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { logger } from "../../lib/logger.js";
import type {
  RewardAction,
  OverlayAlertPayload,
  AlertType,
  AnimationType,
} from "@streamguard/shared";

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
        case "sound":
          emitToChannel(channelId, "sound:play", {
            channelId,
            soundUrl: action.soundFileUrl,
            volume: action.volume,
          });
          break;

        case "alert": {
          const text = resolveTemplate(action.textTemplate, userName, rewardTitle, userInput);
          const payload: OverlayAlertPayload = {
            alertType: "command" as AlertType,
            text,
            duration: action.duration,
            animationType: action.animationType as AnimationType,
            soundUrl: action.soundFileUrl,
            imageUrl: action.imageFileUrl,
            volume: action.volume,
            layoutConfig: action.layoutConfig ?? null,
            ttsEnabled: action.ttsEnabled,
            ttsVoice: action.ttsVoice,
            ttsRate: action.ttsRate,
            ttsVolume: action.ttsVolume,
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
            const response = resolveTemplate(cmd.response, userName, rewardTitle, userInput);
            sayInChannel(channelName, response);
            await prisma.command.update({
              where: { id: cmd.id },
              data: { useCount: { increment: 1 } },
            });
          } else {
            logger.warn(
              { channelId, trigger: action.commandTrigger },
              "Reward action: command not found"
            );
          }
          break;
        }

        case "chat_message": {
          const msg = resolveTemplate(action.messageTemplate, userName, rewardTitle, userInput);
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

function resolveTemplate(
  template: string,
  user: string,
  reward: string,
  input: string
): string {
  return template
    .replace(/\{user\}/g, user)
    .replace(/\{reward\}/g, reward)
    .replace(/\{input\}/g, input);
}
