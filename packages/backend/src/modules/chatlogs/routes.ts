import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { chatLogService } from "./service.js";
import type { ChatLogSearchParams } from "@streamguard/shared";

export async function chatLogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{
    Params: { cid: string };
    Querystring: ChatLogSearchParams & { page?: string; pageSize?: string };
  }>("/:cid/chatlogs", async (request) => {
    const { cid } = request.params;
    const q = request.query;
    const result = await chatLogService.search(cid, {
      user: q.user,
      keyword: q.keyword,
      from: q.from,
      to: q.to,
      platform: q.platform as string | undefined,
      page: q.page ? parseInt(q.page as string, 10) : 1,
      pageSize: q.pageSize ? parseInt(q.pageSize as string, 10) : 50,
    });
    return { success: true, data: result };
  });

  app.delete<{ Params: { cid: string }; Querystring: { days?: string } }>(
    "/:cid/chatlogs/cleanup",
    async (request) => {
      const days = parseInt(request.query.days ?? "30", 10);
      const count = await chatLogService.cleanup(request.params.cid, days);
      return { success: true, data: { deleted: count } };
    }
  );
}
