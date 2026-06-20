import type { FastifyInstance } from "fastify";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { prisma } from "../../lib/prisma.js";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { getSceneData, updateSceneSettings } from "./service.js";
import {
  generateStartingHtml,
  generateBrbHtml,
  generateOfflineHtml,
  generateIngameHtml,
  generateAlertsHtml,
} from "./scenes-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "assets");

type SceneName = "starting" | "brb" | "offline" | "ingame" | "alerts";
const VALID_SCENES: SceneName[] = ["starting", "brb", "offline", "ingame", "alerts"];

/**
 * Scene overlays + their static assets (fonts + shared CSS). The dynamic HTML
 * lives under /overlay/{token}/scene/{name}, gated by the channel's overlay
 * token like the existing overlay routes. URL query params override DB values
 * per render so streamers can flip a setting in OBS without persisting it.
 */
export async function sceneRoutes(app: FastifyInstance) {
  // Static assets: fonts + overlay.css + fonts.css. cacheControl: false +
  // setHeaders aligns with the rest of the app's immutable strategy — these
  // files only change on deploy and we want them out of the request path on
  // every page reload.
  await app.register(fastifyStatic, {
    root: assetsDir,
    prefix: "/scene-assets/",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  });

  // Dynamic scene HTML.
  app.get<{ Params: { overlayToken: string; name: string }; Querystring: Record<string, string> }>(
    "/overlay/:overlayToken/scene/:name",
    async (request, reply) => {
      const { overlayToken, name } = request.params;
      if (!VALID_SCENES.includes(name as SceneName)) {
        return reply.status(404).send("Unknown scene");
      }

      const channel = await prisma.channel.findUnique({ where: { overlayToken } });
      if (!channel) return reply.status(404).send("Invalid overlay token");

      const data = await getSceneData(channel.id);
      const query = request.query ?? {};

      let html: string;
      switch (name as SceneName) {
        case "starting": html = generateStartingHtml(data, query); break;
        case "brb":      html = generateBrbHtml(data, query); break;
        case "offline":  html = generateOfflineHtml(data, query); break;
        case "ingame":   html = generateIngameHtml(data, query); break;
        case "alerts":   html = generateAlertsHtml(overlayToken, data); break;
      }
      return reply.type("text/html").header("Cache-Control", "no-cache").send(html);
    },
  );

  // Authenticated CRUD for the dashboard editor.
  app.register(async (api) => {
    api.addHook("preHandler", jwtAuth);

    api.get<{ Params: { cid: string } }>(
      "/channels/:cid/scenes",
      async (request, reply) => {
        const role = await getChannelAccess(request.params.cid, request.user!.sub);
        if (role === "none") {
          return reply.status(403).send({ success: false, error: "Insufficient permissions" });
        }
        const data = await getSceneData(request.params.cid);
        return { success: true, data };
      },
    );

    api.patch<{ Params: { cid: string }; Body: Record<string, unknown> }>(
      "/channels/:cid/scenes",
      async (request, reply) => {
        const role = await getChannelAccess(request.params.cid, request.user!.sub);
        if (!canEdit(role)) {
          return reply.status(403).send({ success: false, error: "Insufficient permissions" });
        }
        try {
          const data = await updateSceneSettings(request.params.cid, request.body as any);
          return { success: true, data };
        } catch (err) {
          return reply.status(400).send({
            success: false,
            error: (err as Error).message,
          });
        }
      },
    );
  }, { prefix: "/api" });
}
