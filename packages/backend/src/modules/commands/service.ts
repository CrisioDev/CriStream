import { prisma } from "../../lib/prisma.js";
import type { CommandDto, CreateCommandDto, UpdateCommandDto } from "@cristream/shared";

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
        perUserCooldown: data.perUserCooldown ?? false,
        userLevel: data.userLevel ?? "everyone",
        enabled: data.enabled ?? true,
        aliases: data.aliases?.map((a) => a.toLowerCase()) ?? [],
        chain: data.chain?.map((c) => c.toLowerCase()) ?? [],
      },
    });
    return this.toDto(command);
  }

  async updateCommand(
    channelId: string,
    commandId: string,
    data: UpdateCommandDto
  ): Promise<CommandDto> {
    const updateData: any = { ...data };
    if (data.trigger !== undefined) {
      updateData.trigger = data.trigger.toLowerCase();
    }
    if (data.aliases !== undefined) {
      updateData.aliases = data.aliases.map((a) => a.toLowerCase());
    }
    if (data.chain !== undefined) {
      updateData.chain = data.chain.map((c) => c.toLowerCase());
    }

    const command = await prisma.command.update({
      where: { id: commandId, channelId },
      data: updateData,
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
    perUserCooldown: boolean;
    userLevel: string;
    enabled: boolean;
    useCount: number;
    aliases: string[];
    chain: string[];
    channelId: string;
  }): CommandDto {
    return {
      id: command.id,
      trigger: command.trigger,
      response: command.response,
      cooldownSeconds: command.cooldownSeconds,
      perUserCooldown: command.perUserCooldown,
      userLevel: command.userLevel as CommandDto["userLevel"],
      enabled: command.enabled,
      useCount: command.useCount,
      aliases: command.aliases,
      chain: command.chain,
      channelId: command.channelId,
    };
  }
}

export const commandService = new CommandService();
