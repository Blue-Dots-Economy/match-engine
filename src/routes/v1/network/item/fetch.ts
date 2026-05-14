import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../../../config';

const FetchNetworkItemsQuerySchema = z.object({
  item_network: z.string().min(1, 'item_network is required'),
  item_domain: z.string().min(1, 'item_domain is required'),
  item_type: z.string().optional(),
  item_id: z.string().uuid().optional(),
  item_instance_url: z.string().url().nullable().optional(),
  item_schema_url: z.string().url().nullable().optional(),
  item_state: z.record(z.string(), z.unknown()).optional(),
  item_latitude: z.coerce.number().optional(),
  item_longitude: z.coerce.number().optional(),
  radius_meters: z.coerce.number().positive().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cache_ttl_seconds: z.number().int().positive().optional(),
});

const ItemResponseSchema = z.object({
  item_network: z.string(),
  item_domain: z.string(),
  item_type: z.string(),
  item_id: z.string().uuid(),
  item_instance_url: z.string(),
  item_schema_url: z.string(),
  item_state: z.record(z.string(), z.unknown()),
  item_latitude: z.number().nullable(),
  item_longitude: z.number().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const FetchNetworkItemsResponseSchema = z.object({
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
  items: z.array(ItemResponseSchema),
});

type FetchNetworkItemsRequest = FastifyRequest<{
  Body: z.infer<typeof FetchNetworkItemsQuerySchema>;
}>;

export const fetchNetworkItems: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/fetch-all',
    method: 'POST',
    schema: {
      tags: ['network'],
      body: FetchNetworkItemsQuerySchema,
      response: {
        200: FetchNetworkItemsResponseSchema,
      },
    },
    handler: fetchNetworkItemsHandler,
  });
};

const fetchNetworkItemsHandler = async (
  request: FetchNetworkItemsRequest,
  reply: FastifyReply
) => {
  const body = request.body;

  if (
    (body.item_latitude !== undefined || body.item_longitude !== undefined) &&
    (body.item_latitude === undefined ||
      body.item_longitude === undefined ||
      body.radius_meters === undefined)
  ) {
    return reply.code(400).send({
      error: 'VALIDATION_ERROR',
      message:
        'item_latitude, item_longitude, and radius_meters must be provided together for geo search',
    });
  }

  try {
    const url = new URL(`${config.dpg.instanceUrl}/api/v1/network/item/fetch`);
    const searchParams = new URLSearchParams();
    searchParams.set('item_network', body.item_network);
    searchParams.set('item_domain', body.item_domain);

    if (body.item_type) searchParams.set('item_type', body.item_type);
    if (body.item_id) searchParams.set('item_id', body.item_id);
    if (body.item_instance_url)
      searchParams.set('item_instance_url', body.item_instance_url);
    if (body.item_schema_url)
      searchParams.set('item_schema_url', body.item_schema_url);
    if (body.item_latitude !== undefined)
      searchParams.set(
        'item_latitude',
        String(body.item_latitude)
      );
    if (body.item_longitude !== undefined)
      searchParams.set(
        'item_longitude',
        String(body.item_longitude)
      );
    if (body.radius_meters !== undefined)
      searchParams.set('radius_meters', String(body.radius_meters));
    searchParams.set('limit', String(body.limit));
    searchParams.set('offset', String(body.offset));
    if (body.cache_ttl_seconds !== undefined)
      searchParams.set('cache_ttl_seconds', String(body.cache_ttl_seconds));

    url.search = searchParams.toString();

    const response = await fetch(url.toString(), {
      headers: {
        'content-type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorBody: Record<string, unknown> = {};
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }
      return reply.code(response.status).send(errorBody);
    }

    const data = await response.json();
    return reply.code(200).send(data);
  } catch (err: any) {
    request.log.error(
      { err, item_network: body.item_network, item_domain: body.item_domain },
      'Failed to fetch items from DPG network'
    );

    return reply.code(502).send({
      error: 'BAD_GATEWAY',
      message: 'Failed to fetch items from DPG backend',
    });
  }
};