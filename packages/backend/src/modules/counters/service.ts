import { prisma } from "../../lib/prisma.js";
import type { CounterDto } from "@cristream/shared";

class CounterService {
  async getAll(channelId: string): Promise<CounterDto[]> {
    const counters = await prisma.counter.findMany({
      where: { channelId },
      orderBy: { name: "asc" },
    });
    return counters;
  }

  async create(channelId: string, name: string, value = 0): Promise<CounterDto> {
    return prisma.counter.create({
      data: { channelId, name: name.toLowerCase(), value },
    });
  }

  async update(channelId: string, id: string, data: { name?: string; value?: number }): Promise<CounterDto> {
    return prisma.counter.update({
      where: { id, channelId },
      data: {
        ...(data.name !== undefined && { name: data.name.toLowerCase() }),
        ...(data.value !== undefined && { value: data.value }),
      },
    });
  }

  async delete(channelId: string, id: string): Promise<void> {
    await prisma.counter.delete({ where: { id, channelId } });
  }

  async increment(channelId: string, name: string, amount = 1): Promise<CounterDto | null> {
    try {
      return await prisma.counter.update({
        where: { channelId_name: { channelId, name: name.toLowerCase() } },
        data: { value: { increment: amount } },
      });
    } catch {
      return null;
    }
  }

  async decrement(channelId: string, name: string, amount = 1): Promise<CounterDto | null> {
    try {
      return await prisma.counter.update({
        where: { channelId_name: { channelId, name: name.toLowerCase() } },
        data: { value: { decrement: amount } },
      });
    } catch {
      return null;
    }
  }

  async getValue(channelId: string, name: string): Promise<number | null> {
    const counter = await prisma.counter.findUnique({
      where: { channelId_name: { channelId, name: name.toLowerCase() } },
    });
    return counter?.value ?? null;
  }
}

export const counterService = new CounterService();
