import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { ALERT_TYPES } from "@streamguard/shared";
import type { AlertSettingsDto, UpdateAlertSettingsDto, SoundAlertDto, CreateSoundAlertDto, UpdateSoundAlertDto, AlertType } from "@streamguard/shared";

const DEFAULT_TEMPLATES: Record<string, string> = {
  follow: "{user} just followed!",
  sub: "{user} subscribed!",
  giftsub: "{user} gifted {amount} subs!",
  raid: "{user} raided with {amount} viewers!",
  hypetrain: "Hype Train Level {amount}!",
  command: "Command executed!",
  sound: "{user} played a sound!",
};

class AlertService {
  // ── Alert Settings ──

  async getAlertSettings(channelId: string, alertType: string): Promise<AlertSettingsDto> {
    const settings = await prisma.alertSettings.upsert({
      where: { channelId_alertType: { channelId, alertType } },
      update: {},
      create: {
        channelId,
        alertType,
        textTemplate: DEFAULT_TEMPLATES[alertType] ?? "",
      },
    });
    return this.toAlertDto(settings);
  }

  async updateAlertSettings(
    channelId: string,
    alertType: string,
    data: UpdateAlertSettingsDto
  ): Promise<AlertSettingsDto> {
    // Prisma requires Prisma.JsonNull instead of null for Json? fields
    const prismaData: any = { ...data };
    if ("layoutConfig" in prismaData) {
      prismaData.layoutConfig =
        prismaData.layoutConfig === null
          ? Prisma.JsonNull
          : prismaData.layoutConfig ?? undefined;
    }

    const settings = await prisma.alertSettings.upsert({
      where: { channelId_alertType: { channelId, alertType } },
      update: prismaData,
      create: {
        channelId,
        alertType,
        textTemplate: DEFAULT_TEMPLATES[alertType] ?? "",
        ...prismaData,
      },
    });
    return this.toAlertDto(settings);
  }

  async getAllAlertSettings(channelId: string): Promise<AlertSettingsDto[]> {
    // Ensure all types exist
    const results: AlertSettingsDto[] = [];
    for (const alertType of ALERT_TYPES) {
      results.push(await this.getAlertSettings(channelId, alertType));
    }
    return results;
  }

  async seedDefaults(channelId: string): Promise<void> {
    for (const alertType of ALERT_TYPES) {
      await prisma.alertSettings.upsert({
        where: { channelId_alertType: { channelId, alertType } },
        update: {},
        create: {
          channelId,
          alertType,
          textTemplate: DEFAULT_TEMPLATES[alertType] ?? "",
        },
      });
    }
  }

  // ── Sound Alerts ──

  async listSounds(channelId: string): Promise<SoundAlertDto[]> {
    const sounds = await prisma.soundAlert.findMany({
      where: { channelId },
      orderBy: { name: "asc" },
    });
    return sounds.map(this.toSoundDto);
  }

  async createSound(channelId: string, data: CreateSoundAlertDto): Promise<SoundAlertDto> {
    const sound = await prisma.soundAlert.create({
      data: {
        channelId,
        name: data.name.toLowerCase(),
        fileUrl: data.fileUrl,
        pointsCost: data.pointsCost ?? 0,
        cooldownSeconds: data.cooldownSeconds ?? 30,
        volume: data.volume ?? 80,
        enabled: data.enabled ?? true,
      } as any,
    });
    return this.toSoundDto(sound);
  }

  async updateSound(channelId: string, soundId: string, data: UpdateSoundAlertDto): Promise<SoundAlertDto> {
    const sound = await prisma.soundAlert.update({
      where: { id: soundId, channelId },
      data,
    });
    return this.toSoundDto(sound);
  }

  async deleteSound(channelId: string, soundId: string): Promise<void> {
    await prisma.soundAlert.delete({
      where: { id: soundId, channelId },
    });
  }

  // ── Private ──

  private toAlertDto(s: any): AlertSettingsDto {
    return {
      id: s.id,
      alertType: s.alertType as AlertType,
      enabled: s.enabled,
      textTemplate: s.textTemplate,
      duration: s.duration,
      animationType: s.animationType as any,
      soundFileUrl: s.soundFileUrl,
      imageFileUrl: s.imageFileUrl,
      volume: s.volume,
      minAmount: s.minAmount,
      channelId: s.channelId,
      layoutConfig: s.layoutConfig ?? null,
      ttsEnabled: s.ttsEnabled ?? false,
      ttsVoice: s.ttsVoice ?? "",
      ttsRate: s.ttsRate ?? 1.0,
      ttsVolume: s.ttsVolume ?? 80,
      videoMuted: s.videoMuted ?? false,
    };
  }

  private toSoundDto(s: any): SoundAlertDto {
    return {
      id: s.id,
      name: s.name,
      fileUrl: s.fileUrl,
      pointsCost: s.pointsCost,
      cooldownSeconds: s.cooldownSeconds,
      volume: s.volume ?? 80,
      enabled: s.enabled,
      channelId: s.channelId,
    };
  }
}

export const alertService = new AlertService();
