import type { FastifyInstance } from "fastify";
import { authService } from "./service.js";
import { jwtAuth } from "../../middleware/jwt-auth.js";

export async function authRoutes(app: FastifyInstance) {
  // Redirect to Twitch OAuth (full scopes for broadcasters)
  app.get("/twitch", async (_request, reply) => {
    const url = authService.getAuthUrl(false);
    return reply.redirect(url);
  });

  // Redirect to Twitch OAuth (minimal scopes for viewers)
  app.get("/twitch/viewer", async (_request, reply) => {
    const url = authService.getAuthUrl(true);
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

      const tokens = await authService.handleCallback(code);
      // Redirect back — viewer goes to returnTo or /, broadcaster goes to /
      const redirectBase = state === "viewer" ? "/viewer" : "/";
      return reply.redirect(`${redirectBase}?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
    }
  );

  // Get current user
  app.get("/me", { preHandler: [jwtAuth] }, async (request) => {
    const user = await authService.getUser(request.user!.sub);
    return { success: true, data: user };
  });

  // Refresh JWT
  app.post<{ Body: { refreshToken: string } }>("/refresh", async (request) => {
    const { refreshToken } = request.body;
    const tokens = await authService.refreshJwt(refreshToken);
    return { success: true, data: tokens };
  });

  // Logout
  app.post("/logout", { preHandler: [jwtAuth] }, async () => {
    return { success: true };
  });
}
