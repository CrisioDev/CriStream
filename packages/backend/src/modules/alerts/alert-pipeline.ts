import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";
import { pickRandomSound } from "../channelpoints/action-executor.js";
import type { OverlayAlertPayload, AlertType, AnimationType } from "@streamguard/shared";

const EVENT_TO_ALERT_TYPE: Record<string, AlertType> = {
  "channel.follow": "follow",
  "channel.subscribe": "sub",
  "channel.subscription.gift": "giftsub",
  "channel.raid": "raid",
  "channel.hype_train.begin": "hypetrain",
};

export async function processAlertEvent(
  channelId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  const alertType = EVENT_TO_ALERT_TYPE[eventType];
  if (!alertType) return;

  const settings = await prisma.alertSettings.findUnique({
    where: { channelId_alertType: { channelId, alertType } },
  });

  if (!settings || !settings.enabled) return;

  // Check minimum amount
  const amount = extractAmount(eventType, eventData);
  if (settings.minAmount > 0 && amount < settings.minAmount) return;

  // Resolve template variables
  const text = resolveTemplate(settings.textTemplate, eventData, amount);

  const payload: OverlayAlertPayload = {
    alertType: alertType as AlertType,
    text,
    duration: settings.duration,
    animationType: settings.animationType as AnimationType,
    soundUrl: pickRandomSound(settings.soundFileUrl),
    imageUrl: settings.imageFileUrl,
    volume: settings.volume,
    layoutConfig: (settings as any).layoutConfig ?? null,
    ttsEnabled: (settings as any).ttsEnabled ?? false,
    ttsVoice: (settings as any).ttsVoice ?? "",
    ttsRate: (settings as any).ttsRate ?? 1.0,
    ttsVolume: (settings as any).ttsVolume ?? 80,
  };

  emitToChannel(channelId, "alert:trigger", { channelId, payload });
  logger.info({ channelId, alertType, text }, "Alert triggered");
}

function extractAmount(eventType: string, data: any): number {
  switch (eventType) {
    case "channel.subscription.gift":
      return data.total ?? 1;
    case "channel.raid":
      return data.viewers ?? 0;
    case "channel.hype_train.begin":
      return data.level ?? 1;
    default:
      return 1;
  }
}

function resolveTemplate(template: string, data: any, amount: number): string {
  const user =
    data.user_name ?? data.user_login ?? data.from_broadcaster_user_name ?? "Someone";
  const reward = data.reward?.title ?? "";

  return template
    .replace(/\{user\}/g, user)
    .replace(/\{amount\}/g, String(amount))
    .replace(/\{reward\}/g, reward);
}
