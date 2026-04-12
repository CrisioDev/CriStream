import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { listTimers, getTimer, createTimer, updateTimer, deleteTimer } from "./service.js";
import { generateCountdownOverlayHtml } from "./overlay.js";
import { prisma } from "../../lib/prisma.js";

/** Authenticated CRUD routes — /api/channels/:cid/countdown */
export async function countdownRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>("/:cid/countdown", async (request) => {
    const timers = await listTimers(request.params.cid);
    return { success: true, data: timers };
  });

  app.get<{ Params: { cid: string; id: string } }>("/:cid/countdown/:id", async (request) => {
    const timer = await getTimer(request.params.cid, request.params.id);
    if (!timer) return { success: false, error: "Timer not found" };
    return { success: true, data: timer };
  });

  app.post<{ Params: { cid: string } }>("/:cid/countdown", async (request) => {
    const timer = await createTimer(request.params.cid, request.body as any);
    return { success: true, data: timer };
  });

  app.patch<{ Params: { cid: string; id: string } }>("/:cid/countdown/:id", async (request) => {
    const timer = await updateTimer(request.params.cid, request.params.id, request.body as any);
    if (!timer) return { success: false, error: "Timer not found" };
    return { success: true, data: timer };
  });

  app.delete<{ Params: { cid: string; id: string } }>("/:cid/countdown/:id", async (request) => {
    const ok = await deleteTimer(request.params.cid, request.params.id);
    return { success: ok };
  });
}

/** Public overlay route — /overlay/:overlayToken/countdown/:timerId */
export async function countdownOverlayRoutes(app: FastifyInstance) {
  app.get<{ Params: { overlayToken: string; timerId: string } }>(
    "/overlay/:overlayToken/countdown/:timerId",
    async (request, reply) => {
      const channel = await prisma.channel.findUnique({
        where: { overlayToken: request.params.overlayToken },
      });
      if (!channel) return reply.status(404).send("Channel not found");

      const timer = await getTimer(channel.id, request.params.timerId);
      if (!timer) return reply.status(404).send("Timer not found");

      const html = generateCountdownOverlayHtml(timer);
      return reply.type("text/html").send(html);
    },
  );
}
