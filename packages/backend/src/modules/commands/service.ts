import { prisma } from "../../lib/prisma.js";
import type { CommandDto, CreateCommandDto, UpdateCommandDto } from "@streamguard/shared";

class CommandService {
  async getCommands(channelId: string): Promise<CommandDto[]> {
    const commands = await prisma.command.findMany({
      where: { channelId },
      orderBy: { trigger: "asc" },
    });
    return commands.map(this.toDto);
  }

  async getCommand(channelId: string, commandId: string): Promise<CommandDto> {
    const command = await prisma.command.findFirstOrThrow({
      where: { id: commandId, channelId },
    });
    return this.toDto(command);
  }

  async createCommand(channelId: string, data: CreateCommandDto): Promise<CommandDto> {
    const command = await prisma.command.create({
      data: {
        channelId,
        trigger: data.trigger.toLowerCase(),
        response: data.response,
        cooldownSeconds: data.cooldownSeconds ?? 5,
        userLevel: data.userLevel ?? "everyone",
        enabled: data.enabled ?? true,
      },
    });
    return this.toDto(command);
  }

  async updateCommand(
    channelId: string,
    commandId: string,
    data: UpdateCommandDto
  ): Promise<CommandDto> {
    const command = await prisma.command.update({
      where: { id: commandId, channelId },
      data: {
        ...(data.trigger !== undefined && { trigger: data.trigger.toLowerCase() }),
        ...data,
      },
    });
    return this.toDto(command);
  }

  async deleteCommand(channelId: string, commandId: string): Promise<void> {
    await prisma.command.delete({
      where: { id: commandId, channelId },
    });
  }

  private toDto(command: {
    id: string;
    trigger: string;
    response: string;
    cooldownSeconds: number;
    userLevel: string;
    enabled: boolean;
    useCount: number;
    channelId: string;
  }): CommandDto {
    return {
      id: command.id,
      trigger: command.trigger,
      response: command.response,
      cooldownSeconds: command.cooldownSeconds,
      userLevel: command.userLevel as CommandDto["userLevel"],
      enabled: command.enabled,
      useCount: command.useCount,
      channelId: command.channelId,
    };
  }
}

export const commandService = new CommandService();
