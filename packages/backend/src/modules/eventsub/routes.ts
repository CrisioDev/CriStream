import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { prisma } from "../../lib/prisma.js";
import { subscribeToEvents } from "./subscriptions.js";
import type { EventLogDto, PaginatedResponse } from "@streamguard/shared";

export async function eventsubRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Subscribe to EventSub for a channel
  app.post<{ Params: { cid: string } }>("/:cid/eventsub/subscribe", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }

    try {
      await subscribeToEvents(request.params.cid);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Get event log (paginated)
  app.get<{ Params: { cid: string }; Querystring: { page?: string; pageSize?: string; eventType?: string } }>(
    "/:cid/events",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (role === "none") {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }

      const page = parseInt(request.query.page ?? "1", 10);
      const pageSize = parseInt(request.query.pageSize ?? "50", 10);
      const skip = (page - 1) * pageSize;

      const where: any = { channelId: request.params.cid };
      if (request.query.eventType) {
        where.eventType = request.query.eventType;
      }

      const [items, total] = await Promise.all([
        prisma.eventLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.eventLog.count({ where }),
      ]);

      const response: PaginatedResponse<EventLogDto> = {
        items: items.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          data: e.data as Record<string, unknown>,
          channelId: e.channelId,
          createdAt: e.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };

      return { success: true, data: response };
    }
  );
}
