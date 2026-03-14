import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { commandService } from "./service.js";
import type { CreateCommandDto, UpdateCommandDto } from "@streamguard/shared";

export async function commandRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // List commands for a channel
  app.get<{ Params: { cid: string } }>("/:cid/commands", async (request) => {
    const commands = await commandService.getCommands(request.params.cid);
    return { success: true, data: commands };
  });

  // Get single command
  app.get<{ Params: { cid: string; id: string } }>("/:cid/commands/:id", async (request) => {
    const command = await commandService.getCommand(request.params.cid, request.params.id);
    return { success: true, data: command };
  });

  // Create command
  app.post<{ Params: { cid: string }; Body: CreateCommandDto }>(
    "/:cid/commands",
    async (request) => {
      const command = await commandService.createCommand(request.params.cid, request.body);
      return { success: true, data: command };
    }
  );

  // Update command
  app.patch<{ Params: { cid: string; id: string }; Body: UpdateCommandDto }>(
    "/:cid/commands/:id",
    async (request) => {
      const command = await commandService.updateCommand(
        request.params.cid,
        request.params.id,
        request.body
      );
      return { success: true, data: command };
    }
  );

  // Delete command
  app.delete<{ Params: { cid: string; id: string } }>(
    "/:cid/commands/:id",
    async (request) => {
      await commandService.deleteCommand(request.params.cid, request.params.id);
      return { success: true };
    }
  );
}
