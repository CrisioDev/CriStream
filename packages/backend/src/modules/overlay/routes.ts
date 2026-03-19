import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { generateOverlayHtml } from "./overlay-html.js";
import { generatePlayerHtml } from "./player-html.js";

export async function overlayRoutes(app: FastifyInstance) {
  // Public route - no JWT required, uses overlay token
  app.get<{ Params: { overlayToken: string } }>(
    "/overlay/:overlayToken",
    async (request, reply) => {
      const channel = await prisma.channel.findUnique({
        where: { overlayToken: request.params.overlayToken },
      });

      if (!channel) {
        return reply.status(404).send("Invalid overlay token");
      }

      const html = generateOverlayHtml(request.params.overlayToken);
      return reply.type("text/html").send(html);
    }
  );

  // Song Request Player overlay
  app.get<{ Params: { overlayToken: string } }>(
    "/overlay/:overlayToken/player",
    async (request, reply) => {
      const channel = await prisma.channel.findUnique({
        where: { overlayToken: request.params.overlayToken },
      });

      if (!channel) {
        return reply.status(404).send("Invalid overlay token");
      }

      const html = generatePlayerHtml(request.params.overlayToken);
      return reply.type("text/html").send(html);
    }
  );
}
