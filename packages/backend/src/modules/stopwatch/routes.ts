import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { stopwatchService } from "./service.js";

export async function stopwatchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>("/:cid/stopwatch", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await stopwatchService.getAll(request.params.cid) };
  });

  app.post<{ Params: { cid: string }; Body: { name: string; game?: string } }>(
    "/:cid/stopwatch",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
      try {
        const sw = await stopwatchService.create(request.params.cid, request.body.name, request.body.game);
        return { success: true, data: sw };
      } catch {
        return reply.status(400).send({ success: false, error: "Stopwatch already exists" });
      }
    }
  );

  app.post<{ Params: { cid: string; id: string } }>("/:cid/stopwatch/:id/start", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await stopwatchService.start(request.params.cid, request.params.id) };
  });

  app.post<{ Params: { cid: string; id: string } }>("/:cid/stopwatch/:id/stop", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await stopwatchService.stop(request.params.cid, request.params.id) };
  });

  app.post<{ Params: { cid: string; id: string } }>("/:cid/stopwatch/:id/reset", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await stopwatchService.reset(request.params.cid, request.params.id) };
  });

  app.patch<{ Params: { cid: string; id: string }; Body: { game: string } }>(
    "/:cid/stopwatch/:id",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
      return { success: true, data: await stopwatchService.updateGame(request.params.cid, request.params.id, request.body.game) };
    }
  );

  app.delete<{ Params: { cid: string; id: string } }>("/:cid/stopwatch/:id", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    await stopwatchService.delete(request.params.cid, request.params.id);
    return { success: true };
  });
}
