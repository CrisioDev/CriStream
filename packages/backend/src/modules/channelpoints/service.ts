import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import type {
  ChannelPointRewardDto,
  CreateChannelPointRewardDto,
  UpdateChannelPointRewardDto,
  RewardAction,
} from "@streamguard/shared";

class ChannelPointService {
  async list(channelId: string): Promise<ChannelPointRewardDto[]> {
    const rewards = await prisma.channelPointReward.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
    });
    return rewards.map(this.toDto);
  }

  async create(
    channelId: string,
    data: CreateChannelPointRewardDto
  ): Promise<ChannelPointRewardDto> {
    const reward = await prisma.channelPointReward.create({
      data: {
        channelId,
        rewardTitle: data.rewardTitle,
        enabled: data.enabled ?? true,
        actionConfig: data.actionConfig as any,
      },
    });
    return this.toDto(reward);
  }

  async update(
    channelId: string,
    rewardId: string,
    data: UpdateChannelPointRewardDto
  ): Promise<ChannelPointRewardDto> {
    const updateData: any = {};
    if (data.rewardTitle !== undefined) updateData.rewardTitle = data.rewardTitle;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.actionConfig !== undefined) updateData.actionConfig = data.actionConfig as any;

    const reward = await prisma.channelPointReward.update({
      where: { id: rewardId, channelId },
      data: updateData,
    });
    return this.toDto(reward);
  }

  async delete(channelId: string, rewardId: string): Promise<void> {
    await prisma.channelPointReward.delete({
      where: { id: rewardId, channelId },
    });
  }

  async findByReward(
    channelId: string,
    twitchRewardId: string,
    rewardTitle: string
  ): Promise<ChannelPointRewardDto | null> {
    // Primary: match by Twitch reward ID
    if (twitchRewardId) {
      const byId = await prisma.channelPointReward.findFirst({
        where: { channelId, rewardId: twitchRewardId },
      });
      if (byId) return this.toDto(byId);
    }

    // Fallback: match by title
    if (rewardTitle) {
      const byTitle = await prisma.channelPointReward.findUnique({
        where: { channelId_rewardTitle: { channelId, rewardTitle } },
      });
      if (byTitle) {
        // Auto-capture rewardId for future matches
        if (twitchRewardId && !byTitle.rewardId) {
          await prisma.channelPointReward.update({
            where: { id: byTitle.id },
            data: { rewardId: twitchRewardId },
          });
          logger.info(
            { channelId, rewardTitle, twitchRewardId },
            "Auto-captured Twitch rewardId"
          );
        }
        return this.toDto(byTitle);
      }
    }

    return null;
  }

  private toDto(r: any): ChannelPointRewardDto {
    return {
      id: r.id,
      rewardId: r.rewardId,
      rewardTitle: r.rewardTitle,
      enabled: r.enabled,
      actionConfig: (r.actionConfig ?? []) as RewardAction[],
      channelId: r.channelId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}

export const channelPointService = new ChannelPointService();
