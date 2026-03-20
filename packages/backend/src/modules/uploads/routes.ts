import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { uploadService } from "./service.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Upload sound file
  app.post<{ Params: { cid: string } }>("/:cid/uploads/sound", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: "No file provided" });
    }

    try {
      const result = await uploadService.upload(request.params.cid, "sound", file);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Upload image file
  app.post<{ Params: { cid: string } }>("/:cid/uploads/image", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: "No file provided" });
    }

    try {
      const result = await uploadService.upload(request.params.cid, "image", file);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Upload video file
  app.post<{ Params: { cid: string } }>("/:cid/uploads/video", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: "No file provided" });
    }

    try {
      const result = await uploadService.upload(request.params.cid, "video", file);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });
}
