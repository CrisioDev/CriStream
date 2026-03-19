import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { moderationService } from "./service.js";
import type { UpdateModerationSettingsDto, CreateBannedWordDto } from "@streamguard/shared";

export async function moderationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>("/:cid/moderation", async (request) => {
    const settings = await moderationService.getSettings(request.params.cid);
    return { success: true, data: settings };
  });

  app.patch<{ Params: { cid: string }; Body: UpdateModerationSettingsDto }>(
    "/:cid/moderation",
    async (request) => {
      const settings = await moderationService.updateSettings(request.params.cid, request.body);
      return { success: true, data: settings };
    }
  );

  app.get<{ Params: { cid: string }; Querystring: { limit?: string } }>(
    "/:cid/moderation/log",
    async (request) => {
      const limit = parseInt(request.query.limit ?? "50", 10);
      const log = await moderationService.getLog(request.params.cid, limit);
      return { success: true, data: log };
    }
  );

  // ── Banned Words ──

  app.get<{ Params: { cid: string } }>("/:cid/moderation/banned-words", async (request) => {
    const words = await moderationService.getBannedWords(request.params.cid);
    return { success: true, data: words };
  });

  app.post<{ Params: { cid: string }; Body: CreateBannedWordDto }>(
    "/:cid/moderation/banned-words",
    async (request) => {
      const word = await moderationService.createBannedWord(request.params.cid, request.body);
      return { success: true, data: word };
    }
  );

  app.delete<{ Params: { cid: string; id: string } }>(
    "/:cid/moderation/banned-words/:id",
    async (request) => {
      await moderationService.deleteBannedWord(request.params.cid, request.params.id);
      return { success: true };
    }
  );
}
