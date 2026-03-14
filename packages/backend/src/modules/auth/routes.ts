import type { FastifyInstance } from "fastify";
import { authService } from "./service.js";
import { jwtAuth } from "../../middleware/jwt-auth.js";

export async function authRoutes(app: FastifyInstance) {
  // Redirect to Twitch OAuth
  app.get("/twitch", async (_request, reply) => {
    const url = authService.getAuthUrl();
    return reply.redirect(url);
  });

  // OAuth callback
  app.get<{ Querystring: { code?: string; error?: string } }>(
    "/twitch/callback",
    async (request, reply) => {
      const { code, error } = request.query;
      if (error || !code) {
        return reply.redirect("/?error=auth_denied");
      }

      const tokens = await authService.handleCallback(code);
      // Redirect to frontend with token
      return reply.redirect(`/?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
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
