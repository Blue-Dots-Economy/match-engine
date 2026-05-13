import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or, and, count } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const FetchItemsQuerySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  item_network: z.string().optional(),
  item_domain: z.string().optional(),
  item_type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const ItemResponseSchema = z.object({
  item_network: z.string(),
  item_domain: z.string(),
  item_type: z.string(),
  item_id: z.string().uuid(),
  item_instance_url: z.string(),
  item_schema_url: z.string(),
  item_state: z.record(z.string(), z.any()),
  item_latitude: z.number().nullable(),
  item_longitude: z.number().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const FetchItemsResponseSchema = z.object({
  items: z.array(ItemResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

type FetchItemsRequest = FastifyRequest<{
  Querystring: z.infer<typeof FetchItemsQuerySchema>;
}>;

export const fetchItems: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/fetch',
    method: 'GET',
    preHandler: authenticate,
    schema: {
      tags: ['item'],
      querystring: FetchItemsQuerySchema,
      response: {
        200: FetchItemsResponseSchema,
      },
    },
    handler: fetchItemsHandler,
  });
};

const fetchItemsHandler = async (request: FetchItemsRequest, reply: FastifyReply) => {
  const { phoneNumber, item_network, item_domain, item_type, limit, offset } = request.query;

  try {
    const normalizedPhone = normalizeIndianPhone(phoneNumber, 'phoneNumber');

    const [user] = await dpgDb
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
      return reply.code(200).send({
        items: [],
        total: 0,
        limit,
        offset,
      });
    }

    const conditions = [eq(dpgItems.created_by, user.id)];

    if (item_network) {
      conditions.push(eq(dpgItems.item_network, item_network));
    }
    if (item_domain) {
      conditions.push(eq(dpgItems.item_domain, item_domain));
    }
    if (item_type) {
      conditions.push(eq(dpgItems.item_type, item_type));
    }

    const items = await dpgDb
      .select()
      .from(dpgItems)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await dpgDb
      .select({ total: count() })
      .from(dpgItems)
      .where(and(...conditions));

    return reply.code(200).send({
      items: items.map((item) => ({
        item_network: item.item_network,
        item_domain: item.item_domain,
        item_type: item.item_type,
        item_id: item.item_id,
        item_instance_url: item.item_instance_url,
        item_schema_url: item.item_schema_url,
        item_state: item.item_state,
        item_latitude: item.item_latitude,
        item_longitude: item.item_longitude,
        created_by: item.created_by,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      })),
      total: totalResult?.total || 0,
      limit,
      offset,
    });
  } catch (err) {
    request.log.error({ err, phoneNumber, item_network, item_domain, item_type }, 'Failed to fetch items from DPG');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch items',
    });
  }
};