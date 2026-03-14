import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { timerService } from "./service.js";
import type { CreateTimerDto, UpdateTimerDto } from "@streamguard/shared";

export async function timerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>("/:cid/timers", async (request) => {
    const timers = await timerService.getTimers(request.params.cid);
    return { success: true, data: timers };
  });

  app.get<{ Params: { cid: string; id: string } }>("/:cid/timers/:id", async (request) => {
    const timer = await timerService.getTimer(request.params.cid, request.params.id);
    return { success: true, data: timer };
  });

  app.post<{ Params: { cid: string }; Body: CreateTimerDto }>(
    "/:cid/timers",
    async (request) => {
      const timer = await timerService.createTimer(request.params.cid, request.body);
      return { success: true, data: timer };
    }
  );

  app.patch<{ Params: { cid: string; id: string }; Body: UpdateTimerDto }>(
    "/:cid/timers/:id",
    async (request) => {
      const timer = await timerService.updateTimer(
        request.params.cid,
        request.params.id,
        request.body
      );
      return { success: true, data: timer };
    }
  );

  app.delete<{ Params: { cid: string; id: string } }>("/:cid/timers/:id", async (request) => {
    await timerService.deleteTimer(request.params.cid, request.params.id);
    return { success: true };
  });
}
