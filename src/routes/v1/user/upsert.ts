import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { randomUUID } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const UpsertUserBodySchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  name: z.string().min(1),
  dateOfBirth: z.string().optional(),
  termsAccepted: z.boolean().default(true),
  privacyAccepted: z.boolean().default(true),
  banned: z.boolean().default(false),
}).refine(
  (data) => data.email || data.phoneNumber,
  { message: 'Either email or phoneNumber is required' }
);

const UpsertUserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  message: z.string().optional(),
});

type UpsertUserRequest = FastifyRequest<{
  Body: z.infer<typeof UpsertUserBodySchema>;
}>;

export const upsertUser: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/upsert',
    method: 'POST',
    preHandler: authenticate,
    schema: {
      tags: ['user'],
      body: UpsertUserBodySchema,
      response: {
        200: UpsertUserResponseSchema,
        201: UpsertUserResponseSchema,
      },
    },
    handler: upsertUserHandler,
  });
};

const upsertUserHandler = async (request: UpsertUserRequest, reply: FastifyReply) => {
  const { email, phoneNumber, name, dateOfBirth, termsAccepted, privacyAccepted ,banned} = request.body;

  try {
    const normalizedPhone = phoneNumber ? normalizeIndianPhone(phoneNumber, 'phoneNumber') : undefined;

    // Check if user exists by email or phoneNumber
    const existingUser = await dpgDb
      .select()
      .from(dpgUsers)
      .where(
        or(
          email ? eq(dpgUsers.email, email.toLowerCase()) : undefined,
          normalizedPhone ? eq(dpgUsers.phoneNumber, normalizedPhone) : undefined
        )
      )
      .limit(1);

    // If user exists, return them
    if (existingUser.length > 0) {
      return reply.code(200).send({
        id: existingUser[0].id,
        name: existingUser[0].name,
        email: existingUser[0].email,
        phoneNumber: existingUser[0].phoneNumber,
        createdAt: existingUser[0].createdAt.toISOString(),
        updatedAt: existingUser[0].updatedAt.toISOString(),
        message: 'User already exists',
      });
    }

    // Create new user
    const now = new Date();
    const [newUser] = await dpgDb
      .insert(dpgUsers)
      .values({
        id: randomUUID(),
        name,
        email: email ? email.toLowerCase() : null,
        phoneNumber: normalizedPhone || null,
        emailVerified: email ? true : false,
        phoneNumberVerified: normalizedPhone ? true : false,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        termsAccepted,
        privacyAccepted,
        createdAt: now,
        updatedAt: now,
        banned,
        role: 'user',
      })
      .returning();

    return reply.code(201).send({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
      message: 'User created successfully',
    });
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('phone number')) {
      request.log.warn({ err, email, phoneNumber, name }, 'Invalid phone number in upsert user request');
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: err.message,
      });
    }

    request.log.error({ err, email, phoneNumber, name }, 'Failed to upsert user in DPG');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to upsert user',
    });
  }
};
