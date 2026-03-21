import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { counterService } from "./service.js";
import type { CreateCounterDto, UpdateCounterDto } from "@cristream/shared";

export async function counterRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Get all counters
  app.get<{ Params: { cid: string } }>("/:cid/counters", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") return reply.status(403).send({ success: false, error: "Forbidden" });
    const counters = await counterService.getAll(request.params.cid);
    return { success: true, data: counters };
  });

  // Create counter
  app.post<{ Params: { cid: string }; Body: CreateCounterDto }>(
    "/:cid/counters",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
      try {
        const counter = await counterService.create(request.params.cid, request.body.name, request.body.value);
        return { success: true, data: counter };
      } catch {
        return reply.status(400).send({ success: false, error: "Counter already exists" });
      }
    }
  );

  // Update counter
  app.patch<{ Params: { cid: string; id: string }; Body: UpdateCounterDto }>(
    "/:cid/counters/:id",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
      const counter = await counterService.update(request.params.cid, request.params.id, request.body);
      return { success: true, data: counter };
    }
  );

  // Delete counter
  app.delete<{ Params: { cid: string; id: string } }>(
    "/:cid/counters/:id",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
      await counterService.delete(request.params.cid, request.params.id);
      return { success: true };
    }
  );
}
