import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { logger } from "../lib/logger.js";

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    logger.error(error, "Unhandled error");
  }

  reply.status(statusCode).send({
    success: false,
    error: statusCode >= 500 ? "Internal Server Error" : error.message,
  });
}
