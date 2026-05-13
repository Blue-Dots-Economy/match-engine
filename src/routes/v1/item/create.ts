import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { randomUUID } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const CreateItemBodySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  itemNetwork: z.string().min(1, 'item_network is required'),
  itemDomain: z.string().min(1, 'item_domain is required'),
  itemType: z.string().min(1, 'item_type is required'),
  itemState: z.record(z.string(), z.any()).optional(),
  itemLatitude: z.number().optional(),
  itemLongitude: z.number().optional(),
});

const CreateItemResponseSchema = z.object({
  itemNetwork: z.string(),
  itemDomain: z.string(),
  itemType: z.string(),
  itemId: z.string().uuid(),
  itemInstanceUrl: z.string().nullable(),
  itemSchemaUrl: z.string().nullable(),
  itemState: z.record(z.string(), z.any()).nullable(),
  itemLatitude: z.number().nullable(),
  itemLongitude: z.number().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type CreateItemRequest = FastifyRequest<{
  Body: z.infer<typeof CreateItemBodySchema>;
}>;

export const createItem: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/create',
    method: 'POST',
    preHandler: authenticate,
    schema: {
      tags: ['item'],
      body: CreateItemBodySchema,
      response: {
        201: CreateItemResponseSchema,
      },
    },
    handler: createItemHandler,
  });
};

const createItemHandler = async (request: CreateItemRequest, reply: FastifyReply) => {
  const { phoneNumber, itemNetwork, itemDomain, itemType, itemState, itemLatitude, itemLongitude } = request.body;

  try {
    const normalizedPhone = normalizeIndianPhone(phoneNumber, 'phoneNumber');

    let [user] = await dpgDb
      .select()
      .from(dpgUsers)
      .where(
        or(
          eq(dpgUsers.phoneNumber, normalizedPhone),
          eq(dpgUsers.email, phoneNumber.toLowerCase())
        )
      )
      .limit(1);

    if (!user) {
      const now = new Date();
      [user] = await dpgDb
        .insert(dpgUsers)
        .values({
          id: randomUUID(),
          name: `User ${normalizedPhone.slice(-4)}`,
          phoneNumber: normalizedPhone,
          phoneNumberVerified: true,
          createdAt: now,
          updatedAt: now,
          role: 'user',
        })
        .returning();
    }

    const now = new Date();
    const [newItem] = await dpgDb
      .insert(dpgItems)
      .values({
        itemNetwork,
        itemDomain,
        itemType,
        itemState: itemState || {},
        itemLatitude: itemLatitude || null,
        itemLongitude: itemLongitude || null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return reply.code(201).send({
      itemNetwork: newItem.itemNetwork,
      itemDomain: newItem.itemDomain,
      itemType: newItem.itemType,
      itemId: newItem.itemId,
      itemInstanceUrl: newItem.itemInstanceUrl,
      itemSchemaUrl: newItem.itemSchemaUrl,
      itemState: newItem.itemState,
      itemLatitude: newItem.itemLatitude,
      itemLongitude: newItem.itemLongitude,
      createdBy: newItem.createdBy,
      createdAt: newItem.createdAt.toISOString(),
      updatedAt: newItem.updatedAt.toISOString(),
    });
  } catch (err) {
    request.log.error({ err, phoneNumber, itemNetwork, itemDomain, itemType }, 'Failed to create item in DPG');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create item',
    });
  }
};