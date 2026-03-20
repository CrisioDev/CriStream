import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import type { ViewerRequestDto, RequestStatus } from "@cristream/shared";

// Cast for new model not yet in local Prisma client
const db = prisma as any;

class ViewerRequestService {
  async create(channelId: string, displayName: string, message: string): Promise<ViewerRequestDto> {
    const req = await db.viewerRequest.create({
      data: { channelId, displayName, message },
    });
    const dto = this.toDto(req);
    emitToChannel(channelId, "request:new", { channelId, request: dto });
    return dto;
  }

  async list(channelId: string, status?: string): Promise<ViewerRequestDto[]> {
    const where: any = { channelId };
    if (status) where.status = status;
    const reqs = await db.viewerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return reqs.map(this.toDto);
  }

  async updateStatus(channelId: string, id: string, status: RequestStatus): Promise<ViewerRequestDto> {
    const req = await db.viewerRequest.update({
      where: { id, channelId },
      data: { status },
    });
    const dto = this.toDto(req);
    emitToChannel(channelId, "request:update", { channelId, request: dto });
    return dto;
  }

  async delete(channelId: string, id: string): Promise<void> {
    await db.viewerRequest.delete({ where: { id, channelId } });
  }

  async clearDone(channelId: string): Promise<void> {
    await db.viewerRequest.deleteMany({ where: { channelId, status: { in: ["done", "rejected"] } } });
  }

  private toDto(r: any): ViewerRequestDto {
    return {
      id: r.id,
      displayName: r.displayName,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      channelId: r.channelId,
    };
  }
}

export const viewerRequestService = new ViewerRequestService();
