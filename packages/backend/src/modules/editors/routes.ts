import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, isOwner } from "../../middleware/channel-access.js";
import { editorService } from "./service.js";
import type { EditorRole } from "@streamguard/shared";

export async function editorRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // List editors
  app.get<{ Params: { cid: string } }>("/:cid/editors", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!isOwner(role)) {
      return reply.status(403).send({ success: false, error: "Only the channel owner can manage editors" });
    }
    const editors = await editorService.list(request.params.cid);
    return { success: true, data: editors };
  });

  // Invite editor
  app.post<{ Params: { cid: string }; Body: { twitchUsername: string; role?: EditorRole } }>(
    "/:cid/editors",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!isOwner(role)) {
        return reply.status(403).send({ success: false, error: "Only the channel owner can invite editors" });
      }
      try {
        const editor = await editorService.invite(
          request.params.cid,
          request.body.twitchUsername,
          request.body.role
        );
        return { success: true, data: editor };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Update editor role
  app.patch<{ Params: { cid: string; eid: string }; Body: { role: EditorRole } }>(
    "/:cid/editors/:eid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!isOwner(role)) {
        return reply.status(403).send({ success: false, error: "Only the channel owner can update editors" });
      }
      await editorService.updateRole(request.params.cid, request.params.eid, request.body.role);
      return { success: true };
    }
  );

  // Remove editor
  app.delete<{ Params: { cid: string; eid: string } }>(
    "/:cid/editors/:eid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!isOwner(role)) {
        return reply.status(403).send({ success: false, error: "Only the channel owner can remove editors" });
      }
      await editorService.remove(request.params.cid, request.params.eid);
      return { success: true };
    }
  );
}
