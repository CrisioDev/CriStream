import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { lootboxService } from "./service.js";
import { generateSeedItems } from "./seed-items.js";
import { prisma } from "../../lib/prisma.js";
import type { UpdateLootboxSettingsDto } from "@cristream/shared";

export async function lootboxRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Settings
  app.get<{ Params: { cid: string } }>("/:cid/lootbox/settings", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await lootboxService.getSettings(request.params.cid) };
  });

  app.patch<{ Params: { cid: string }; Body: UpdateLootboxSettingsDto }>("/:cid/lootbox/settings", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await lootboxService.updateSettings(request.params.cid, request.body) };
  });

  // Items CRUD
  app.get<{ Params: { cid: string } }>("/:cid/lootbox/items", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await lootboxService.getItems(request.params.cid) };
  });

  app.post<{ Params: { cid: string }; Body: any }>("/:cid/lootbox/items", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    try {
      const item = await lootboxService.createItem(request.params.cid, request.body);
      return { success: true, data: item };
    } catch {
      return reply.status(400).send({ success: false, error: "Item already exists" });
    }
  });

  app.patch<{ Params: { cid: string; id: string }; Body: any }>("/:cid/lootbox/items/:id", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await lootboxService.updateItem(request.params.cid, request.params.id, request.body) };
  });

  app.delete<{ Params: { cid: string; id: string } }>("/:cid/lootbox/items/:id", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    await lootboxService.deleteItem(request.params.cid, request.params.id);
    return { success: true };
  });

  // Seed default items
  app.post<{ Params: { cid: string } }>("/:cid/lootbox/seed", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });

    const existing = await prisma.lootboxItem.count({ where: { channelId: request.params.cid } });
    if (existing > 0) {
      return reply.status(400).send({ success: false, error: `Channel already has ${existing} items. Delete them first or add individually.` });
    }

    const seedItems = generateSeedItems();
    await prisma.lootboxItem.createMany({
      data: seedItems.map((item) => ({ ...item, channelId: request.params.cid })),
    });

    return { success: true, data: { count: seedItems.length } };
  });

  // Inventory
  app.get<{ Params: { cid: string } }>("/:cid/lootbox/inventory", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) return reply.status(403).send({ success: false, error: "Forbidden" });
    return { success: true, data: await lootboxService.getAllInventory(request.params.cid) };
  });
}
