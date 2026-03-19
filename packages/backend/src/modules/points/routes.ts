import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { pointsService } from "./service.js";
import type { UpdatePointsSettingsDto } from "@streamguard/shared";

export async function pointsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>("/:cid/points/settings", async (request) => {
    const settings = await pointsService.getSettings(request.params.cid);
    return { success: true, data: settings };
  });

  app.patch<{ Params: { cid: string }; Body: UpdatePointsSettingsDto }>(
    "/:cid/points/settings",
    async (request) => {
      const settings = await pointsService.updateSettings(request.params.cid, request.body);
      return { success: true, data: settings };
    }
  );

  app.get<{ Params: { cid: string }; Querystring: { limit?: string } }>(
    "/:cid/points/leaderboard",
    async (request) => {
      const limit = parseInt(request.query.limit ?? "50", 10);
      const leaderboard = await pointsService.getLeaderboard(request.params.cid, limit);
      return { success: true, data: leaderboard };
    }
  );

  app.get<{ Params: { cid: string; uid: string } }>(
    "/:cid/points/user/:uid",
    async (request) => {
      const user = await pointsService.getUserPoints(request.params.cid, request.params.uid);
      return { success: true, data: user };
    }
  );
}
