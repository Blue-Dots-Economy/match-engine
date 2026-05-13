import { FastifyReply } from 'fastify';

export function successResponse(reply: FastifyReply, data: unknown, statusCode = 200) {
  return reply.code(statusCode).send(data);
}

export function errorResponse(reply: FastifyReply, error: string, message: string, statusCode = 400) {
  return reply.code(statusCode).send({ error, message });
}

export function createdResponse(reply: FastifyReply, data: unknown) {
  return reply.code(201).send(data);
}

export function unauthorizedResponse(reply: FastifyReply, message = 'Unauthorized') {
  return reply.code(401).send({ error: 'UNAUTHORIZED', message });
}

export function notFoundResponse(reply: FastifyReply, message = 'Not found') {
  return reply.code(404).send({ error: 'NOT_FOUND', message });
}

export function internalErrorResponse(reply: FastifyReply, message = 'Internal server error') {
  return reply.code(500).send({ error: 'INTERNAL_SERVER_ERROR', message });
}