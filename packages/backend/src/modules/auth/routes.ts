import type { FastifyInstance } from "fastify";
import { authService } from "./service.js";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { logger } from "../../lib/logger.js";

export async function authRoutes(app: FastifyInstance) {
  // Redirect to Twitch OAuth (full scopes for broadcasters)
  app.get("/twitch", async (_request, reply) => {
    const url = authService.getAuthUrl(false);
    return reply.redirect(url);
  });

  // Redirect to Twitch OAuth (minimal scopes for viewers)
  // Optional ?returnTo= query param to redirect back after login (e.g. /casino)
  app.get<{ Querystring: { returnTo?: string } }>("/twitch/viewer", async (request, reply) => {
    const returnTo = request.query.returnTo ?? "/viewer";
    const url = authService.getAuthUrl(true, returnTo);
    return reply.redirect(url);
  });

  // OAuth callback
  app.get<{ Querystring: { code?: string; error?: string; state?: string } }>(
    "/twitch/callback",
    async (request, reply) => {
      const { code, error, state } = request.query;
      if (error || !code) {
        return reply.redirect("/?error=auth_denied");
      }

      const isViewer = state?.startsWith("viewer") ?? false;
      let tokens;
      try {
        tokens = await authService.handleCallback(code, isViewer);
      } catch (err) {
        logger.error({ err }, "Twitch OAuth callback failed");
        return reply.redirect("/?error=auth_failed");
      }
      // Parse redirect from state: "viewer:/casino" → /casino, "viewer" → /viewer, else /
      let redirectBase = "/";
      if (state?.startsWith("viewer:")) {
        redirectBase = state.slice(7); // after "viewer:"
      } else if (state === "viewer") {
        redirectBase = "/viewer";
      }
      return reply.redirect(`${redirectBase}?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
    }
  );

  // Get current user
  app.get("/me", { preHandler: [jwtAuth] }, async (request) => {
    const user = await authService.getUser(request.user!.sub);
    return { success: true, data: user };
  });

  // Refresh JWT — expired/invalid tokens are a normal condition, answer 401 (not 500)
  app.post<{ Body: { refreshToken: string } }>("/refresh", async (request, reply) => {
    try {
      const { refreshToken } = request.body;
      const tokens = await authService.refreshJwt(refreshToken);
      return { success: true, data: tokens };
    } catch (err) {
      logger.info({ reason: (err as Error)?.message }, "JWT refresh rejected");
      return reply.code(401).send({ success: false, error: "invalid_refresh_token" });
    }
  });

  // Logout
  app.post("/logout", { preHandler: [jwtAuth] }, async () => {
    return { success: true };
  });
}
