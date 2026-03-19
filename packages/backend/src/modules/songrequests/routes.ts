import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { songRequestService } from "./service.js";
import type { UpdateSongRequestSettingsDto } from "@streamguard/shared";

export async function songRequestRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>("/:cid/songrequests/settings", async (request) => {
    const settings = await songRequestService.getSettings(request.params.cid);
    return { success: true, data: settings };
  });

  app.patch<{ Params: { cid: string }; Body: UpdateSongRequestSettingsDto }>(
    "/:cid/songrequests/settings",
    async (request) => {
      const settings = await songRequestService.updateSettings(request.params.cid, request.body);
      return { success: true, data: settings };
    }
  );

  app.get<{ Params: { cid: string } }>("/:cid/songrequests/queue", async (request) => {
    const queue = await songRequestService.getQueue(request.params.cid);
    return { success: true, data: queue };
  });

  app.post<{ Params: { cid: string } }>("/:cid/songrequests/skip", async (request) => {
    const skipped = await songRequestService.skip(request.params.cid);
    return { success: true, data: skipped };
  });

  app.delete<{ Params: { cid: string; id: string } }>(
    "/:cid/songrequests/queue/:id",
    async (request) => {
      await songRequestService.removeFromQueue(request.params.cid, request.params.id);
      return { success: true };
    }
  );

  app.delete<{ Params: { cid: string } }>("/:cid/songrequests/queue", async (request) => {
    await songRequestService.clearQueue(request.params.cid);
    return { success: true };
  });
}
