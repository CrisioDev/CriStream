import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { alertService } from "./service.js";
import { emitToChannel } from "../../lib/socket.js";
import type { UpdateAlertSettingsDto, CreateSoundAlertDto, UpdateSoundAlertDto, OverlayAlertPayload, AlertType, AnimationType } from "@streamguard/shared";

export async function alertRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Get all alert settings for a channel
  app.get<{ Params: { cid: string } }>("/:cid/alerts", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }
    const settings = await alertService.getAllAlertSettings(request.params.cid);
    return { success: true, data: settings };
  });

  // Get alert settings by type
  app.get<{ Params: { cid: string; alertType: string } }>(
    "/:cid/alerts/:alertType",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (role === "none") {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      const settings = await alertService.getAlertSettings(request.params.cid, request.params.alertType);
      return { success: true, data: settings };
    }
  );

  // Update alert settings
  app.patch<{ Params: { cid: string; alertType: string }; Body: UpdateAlertSettingsDto }>(
    "/:cid/alerts/:alertType",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      const settings = await alertService.updateAlertSettings(
        request.params.cid,
        request.params.alertType,
        request.body
      );
      return { success: true, data: settings };
    }
  );

  // Test alert
  app.post<{ Params: { cid: string }; Body: { alertType: string } }>(
    "/:cid/alerts/test",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }

      const settings = await alertService.getAlertSettings(
        request.params.cid,
        request.body.alertType
      );

      const payload: OverlayAlertPayload = {
        alertType: settings.alertType as AlertType,
        text: settings.textTemplate
          .replace("{user}", "TestUser")
          .replace("{amount}", "5")
          .replace("{reward}", "TestReward"),
        duration: settings.duration,
        animationType: settings.animationType as AnimationType,
        soundUrl: settings.soundFileUrl,
        imageUrl: settings.imageFileUrl,
        volume: settings.volume,
        layoutConfig: settings.layoutConfig,
        ttsEnabled: settings.ttsEnabled,
        ttsVoice: settings.ttsVoice,
        ttsRate: settings.ttsRate,
        ttsVolume: settings.ttsVolume,
      };

      emitToChannel(request.params.cid, "alert:trigger", {
        channelId: request.params.cid,
        payload,
      });

      return { success: true };
    }
  );

  // ── Sound Alerts ──

  app.get<{ Params: { cid: string } }>("/:cid/sounds", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }
    const sounds = await alertService.listSounds(request.params.cid);
    return { success: true, data: sounds };
  });

  app.post<{ Params: { cid: string }; Body: CreateSoundAlertDto }>(
    "/:cid/sounds",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const sound = await alertService.createSound(request.params.cid, request.body);
        return { success: true, data: sound };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  app.patch<{ Params: { cid: string; sid: string }; Body: UpdateSoundAlertDto }>(
    "/:cid/sounds/:sid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      const sound = await alertService.updateSound(
        request.params.cid,
        request.params.sid,
        request.body
      );
      return { success: true, data: sound };
    }
  );

  app.delete<{ Params: { cid: string; sid: string } }>(
    "/:cid/sounds/:sid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      await alertService.deleteSound(request.params.cid, request.params.sid);
      return { success: true };
    }
  );
}
