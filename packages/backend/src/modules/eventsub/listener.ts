import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../config/index.js";
import { logger } from "../../lib/logger.js";
import { processEvent } from "./event-processor.js";

const TWITCH_MESSAGE_ID_HEADER = "twitch-eventsub-message-id";
const TWITCH_MESSAGE_TIMESTAMP_HEADER = "twitch-eventsub-message-timestamp";
const TWITCH_MESSAGE_SIGNATURE_HEADER = "twitch-eventsub-message-signature";
const TWITCH_MESSAGE_TYPE_HEADER = "twitch-eventsub-message-type";

function verifySignature(
  messageId: string,
  timestamp: string,
  body: string,
  expectedSignature: string
): boolean {
  const message = messageId + timestamp + body;
  const hmac = createHmac("sha256", config.eventsubSecret)
    .update(message)
    .digest("hex");
  const expected = `sha256=${hmac}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export async function eventsubWebhookRoute(app: FastifyInstance) {
  app.post("/api/eventsub/webhook", async (request: FastifyRequest, reply: FastifyReply) => {
    const messageId = request.headers[TWITCH_MESSAGE_ID_HEADER] as string;
    const timestamp = request.headers[TWITCH_MESSAGE_TIMESTAMP_HEADER] as string;
    const signature = request.headers[TWITCH_MESSAGE_SIGNATURE_HEADER] as string;
    const messageType = request.headers[TWITCH_MESSAGE_TYPE_HEADER] as string;

    if (!messageId || !timestamp || !signature) {
      return reply.status(403).send("Missing headers");
    }

    const rawBody = JSON.stringify(request.body);

    if (!verifySignature(messageId, timestamp, rawBody, signature)) {
      logger.warn("EventSub signature verification failed");
      return reply.status(403).send("Invalid signature");
    }

    const body = request.body as any;

    // Handle verification challenge
    if (messageType === "webhook_callback_verification") {
      logger.info("EventSub webhook verification challenge received");
      return reply.type("text/plain").send(body.challenge);
    }

    // Handle revocation
    if (messageType === "revocation") {
      logger.warn({ subscription: body.subscription }, "EventSub subscription revoked");
      return reply.status(204).send();
    }

    // Handle notification
    if (messageType === "notification") {
      const event = body.event;
      const subscriptionType = body.subscription?.type;

      logger.info({ type: subscriptionType }, "EventSub notification received");

      processEvent(subscriptionType, event).catch((err: unknown) => {
        logger.error({ err, type: subscriptionType }, "Failed to process EventSub event");
      });

      return reply.status(204).send();
    }

    return reply.status(204).send();
  });
}
