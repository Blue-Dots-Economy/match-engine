import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or, and } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgActionEvents } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const FetchEventsBodySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  action_name: z.string().optional(),
  action_id: z.string().uuid().optional(),
  action_status: z.string().optional(),
  item_id: z.string().uuid().optional(),
  update_count: z.number().int().nonnegative().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const EventResponseSchema = z.object({
  event_id: z.string().uuid(),
  action_name: z.string(),
  origin_instance_domain: z.string(),
  action_id: z.string().uuid(),
  action_status: z.string(),
  update_count: z.number().int(),
  source_item_network: z.string(),
  source_item_domain: z.string(),
  source_item_type: z.string(),
  source_item_id: z.string().uuid(),
  source_item_instance_url: z.string(),
  source_item_owner: z.string().nullable(),
  source_item_latitude: z.number().nullable(),
  source_item_longitude: z.number().nullable(),
  target_item_network: z.string(),
  target_item_domain: z.string(),
  target_item_type: z.string(),
  target_item_id: z.string().uuid(),
  target_item_instance_url: z.string(),
  target_item_owner: z.string().nullable(),
  target_item_latitude: z.number().nullable(),
  target_item_longitude: z.number().nullable(),
  event_payload: z.record(z.string(), z.any()),
  remarks: z.string().nullable(),
  created_at: z.string(),
});

const FetchEventsResponseSchema = z.object({
  events: z.array(EventResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

type FetchEventsRequest = FastifyRequest<{
  Body: z.infer<typeof FetchEventsBodySchema>;
}>;

export const fetchEvents: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/fetch',
    method: 'POST',
    preHandler: authenticate,
    schema: {
      tags: ['event'],
      body: FetchEventsBodySchema,
      response: {
        200: FetchEventsResponseSchema,
      },
    },
    handler: fetchEventsHandler,
  });
};

const fetchEventsHandler = async (
  request: FetchEventsRequest,
  reply: FastifyReply
) => {
  const {
    phoneNumber,
    action_name,
    action_id,
    action_status,
    item_id,
    update_count,
    limit,
    offset,
  } = request.body;

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
        events: [],
        total: 0,
        limit,
        offset,
      });
    }

    const conditions = [
      or(
        eq(dpgActionEvents.source_item_owner, user.id),
        eq(dpgActionEvents.target_item_owner, user.id)
      ),
    ];

    if (action_name) {
      conditions.push(eq(dpgActionEvents.action_name, action_name));
    }
    if (action_id) {
      conditions.push(eq(dpgActionEvents.action_id, action_id));
    }
    if (action_status) {
      conditions.push(eq(dpgActionEvents.action_status, action_status));
    }
    if (item_id) {
      conditions.push(
        or(
          eq(dpgActionEvents.source_item_id, item_id),
          eq(dpgActionEvents.target_item_id, item_id)
        )
      );
    }
    if (update_count !== undefined) {
      conditions.push(eq(dpgActionEvents.update_count, update_count));
    }

    const events = await dpgDb
      .select()
      .from(dpgActionEvents)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return reply.code(200).send({
      events: events.map((event) => ({
        event_id: event.event_id,
        action_name: event.action_name,
        origin_instance_domain: event.origin_instance_domain,
        action_id: event.action_id,
        action_status: event.action_status,
        update_count: event.update_count,
        source_item_network: event.source_item_network,
        source_item_domain: event.source_item_domain,
        source_item_type: event.source_item_type,
        source_item_id: event.source_item_id,
        source_item_instance_url: event.source_item_instance_url,
        source_item_owner: event.source_item_owner,
        source_item_latitude: event.source_item_latitude,
        source_item_longitude: event.source_item_longitude,
        target_item_network: event.target_item_network,
        target_item_domain: event.target_item_domain,
        target_item_type: event.target_item_type,
        target_item_id: event.target_item_id,
        target_item_instance_url: event.target_item_instance_url,
        target_item_owner: event.target_item_owner,
        target_item_latitude: event.target_item_latitude,
        target_item_longitude: event.target_item_longitude,
        event_payload: event.event_payload,
        remarks: event.remarks,
        created_at: event.created_at.toISOString(),
      })),
      total: events.length,
      limit,
      offset,
    });
  } catch (err) {
    request.log.error(
      { err, phoneNumber, action_name },
      'Failed to fetch events from DPG'
    );
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch events',
    });
  }
};