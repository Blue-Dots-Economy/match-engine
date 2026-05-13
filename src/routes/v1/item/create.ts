import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { randomUUID } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';
import { config } from '../../../config';

const CreateItemBodySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  item_network: z.string().min(1, 'item_network is required'),
  item_domain: z.string().min(1, 'item_domain is required'),
  item_type: z.string().min(1, 'item_type is required'),
  item_state: z.record(z.string(), z.any()).optional(),
  item_latitude: z.number().optional(),
  item_longitude: z.number().optional(),
});

const CreateItemResponseSchema = z.object({
  item_network: z.string(),
  item_domain: z.string(),
  item_type: z.string(),
  item_id: z.string().uuid(),
  item_instance_url: z.string().nullable(),
  item_schema_url: z.string().nullable(),
  item_state: z.record(z.string(), z.any()).nullable(),
  item_latitude: z.number().nullable(),
  item_longitude: z.number().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
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
  const { phoneNumber, item_network, item_domain, item_type, item_state, item_latitude, item_longitude } = request.body;

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
          emailVerified: true,
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
        item_network,
        item_domain,
        item_type,
        item_instance_url: `${config.app.url}/items/${item_network}/${item_domain}/${item_type}`,
        item_schema_url: `${config.app.url}/schema/${item_network}/${item_domain}/${item_type}`,
        item_state: item_state || {},
        item_latitude: item_latitude || null,
        item_longitude: item_longitude || null,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return reply.code(201).send({
      item_network: newItem.item_network,
      item_domain: newItem.item_domain,
      item_type: newItem.item_type,
      item_id: newItem.item_id,
      item_instance_url: newItem.item_instance_url,
      item_schema_url: newItem.item_schema_url,
      item_state: newItem.item_state,
      item_latitude: newItem.item_latitude,
      item_longitude: newItem.item_longitude,
      created_by: newItem.created_by,
      created_at: newItem.created_at.toISOString(),
      updated_at: newItem.updated_at.toISOString(),
    });
  } catch (err: any) {
    request.log.error({ err, phoneNumber, item_network, item_domain, item_type }, 'Failed to create item in DPG');
    
    if (err?.code === '23514' || err?.message?.includes('no partition')) {
      return reply.code(400).send({
        error: 'PARTITION_NOT_FOUND',
        message: `No partition exists for item_type '${item_type}'. Please contact DPG admin to create partition for this type.`,
      });
    }
    
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create item',
    });
  }
};