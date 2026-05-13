import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const FetchItemsQuerySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  itemNetwork: z.string().optional(),
  itemDomain: z.string().optional(),
  itemType: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const ItemResponseSchema = z.object({
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
  const { phoneNumber, itemNetwork, itemDomain, itemType, limit, offset } = request.query;

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

    const filters = [eq(dpgItems.createdBy, user.id)];

    if (itemNetwork) {
      filters.push(eq(dpgItems.itemNetwork, itemNetwork) as any);
    }
    if (itemDomain) {
      filters.push(eq(dpgItems.itemDomain, itemDomain) as any);
    }
    if (itemType) {
      filters.push(eq(dpgItems.itemType, itemType) as any);
    }

    const items = await dpgDb
      .select()
      .from(dpgItems)
      .where(filters.length > 1 ? and(...filters) : filters[0])
      .limit(limit)
      .offset(offset);

    const [{ count }] = await dpgDb
      .select({ count: dpgItems.itemId })
      .from(dpgItems)
      .where(filters.length > 1 ? and(...filters) : filters[0]);

    return reply.code(200).send({
      items: items.map((item) => ({
        itemNetwork: item.itemNetwork,
        itemDomain: item.itemDomain,
        itemType: item.itemType,
        itemId: item.itemId,
        itemInstanceUrl: item.itemInstanceUrl,
        itemSchemaUrl: item.itemSchemaUrl,
        itemState: item.itemState,
        itemLatitude: item.itemLatitude,
        itemLongitude: item.itemLongitude,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total: Number(count),
      limit,
      offset,
    });
  } catch (err) {
    request.log.error({ err, phoneNumber, itemNetwork, itemDomain, itemType }, 'Failed to fetch items from DPG');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch items',
    });
  }
};

function and(...conditions: any[]) {
  return conditions.reduce((acc, cond) => {
    if (!acc) return cond;
    return { and: [acc, cond] };
  }, null);
}