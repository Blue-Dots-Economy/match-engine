import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { dpgDb } from '../../../db/dpg_client';
import { dpgActionEvents } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';

const EventItemRefSchema = z.object({
  item_network: z.string().min(1),
  item_domain: z.string().min(1),
  item_type: z.string().min(1),
  item_id: z.string().uuid(),
  item_instance_url: z.string().url(),
});

const StoreEventBodySchema = z.object({
  origin_instance_domain: z.string().url(),
  action_name: z.string().min(1),
  action_id: z.string().uuid(),
  action_status: z.string().min(1),
  update_count: z.coerce.number().int().nonnegative(),
  source_item: EventItemRefSchema,
  target_item: EventItemRefSchema,
  source_item_owner: z.string().min(1).nullable().optional(),
  target_item_owner: z.string().min(1).nullable().optional(),
  source_item_latitude: z.number().nullable().optional(),
  source_item_longitude: z.number().nullable().optional(),
  target_item_latitude: z.number().nullable().optional(),
  target_item_longitude: z.number().nullable().optional(),
  event_payload: z.record(z.string(), z.any()).default({}),
  remarks: z.string().min(1).optional(),
});

const StoreEventResponseSchema = z.object({
  event_id: z.string().uuid().nullable(),
  action_id: z.string().uuid(),
  action_name: z.string(),
  action_status: z.string(),
  update_count: z.number().int(),
});

type StoreEventRequest = FastifyRequest<{
  Body: z.infer<typeof StoreEventBodySchema>;
}>;

export const storeEvent: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/store',
    method: 'POST',
    preHandler: authenticate,
    schema: {
      tags: ['event'],
      body: StoreEventBodySchema,
      response: {
        201: StoreEventResponseSchema,
      },
    },
    handler: storeEventHandler,
  });
};

const storeEventHandler = async (
  request: StoreEventRequest,
  reply: FastifyReply
) => {
  const body = request.body;

  try {
    const [createdEvent] = await dpgDb
      .insert(dpgActionEvents)
      .values({
        action_name: body.action_name,
        origin_instance_domain: body.origin_instance_domain,
        action_id: body.action_id,
        action_status: body.action_status,
        update_count: body.update_count,
        source_item_network: body.source_item.item_network,
        source_item_domain: body.source_item.item_domain,
        source_item_type: body.source_item.item_type,
        source_item_id: body.source_item.item_id,
        source_item_instance_url: body.source_item.item_instance_url,
        source_item_owner: body.source_item_owner ?? null,
        source_item_latitude: body.source_item_latitude ?? null,
        source_item_longitude: body.source_item_longitude ?? null,
        target_item_network: body.target_item.item_network,
        target_item_domain: body.target_item.item_domain,
        target_item_type: body.target_item.item_type,
        target_item_id: body.target_item.item_id,
        target_item_instance_url: body.target_item.item_instance_url,
        target_item_owner: body.target_item_owner ?? null,
        target_item_latitude: body.target_item_latitude ?? null,
        target_item_longitude: body.target_item_longitude ?? null,
        event_payload: body.event_payload,
        remarks: body.remarks ?? null,
      })
      .onConflictDoNothing({
        target: [
          dpgActionEvents.action_name,
          dpgActionEvents.origin_instance_domain,
          dpgActionEvents.action_id,
          dpgActionEvents.update_count,
        ],
      })
      .returning({
        event_id: dpgActionEvents.event_id,
        action_id: dpgActionEvents.action_id,
        action_name: dpgActionEvents.action_name,
        action_status: dpgActionEvents.action_status,
        update_count: dpgActionEvents.update_count,
      });

    return reply.code(201).send({
      event_id: createdEvent?.event_id ?? null,
      action_id: createdEvent?.action_id ?? body.action_id,
      action_name: createdEvent?.action_name ?? body.action_name,
      action_status: createdEvent?.action_status ?? body.action_status,
      update_count: createdEvent?.update_count ?? body.update_count,
    });
  } catch (err: any) {
    request.log.error(
      { err, action_id: body.action_id, action_name: body.action_name },
      'Failed to store event in DPG'
    );

    if (err?.code === '23514' || err?.message?.includes('no partition')) {
      return reply.code(400).send({
        error: 'PARTITION_NOT_FOUND',
        message: `No partition exists for action '${body.action_name}'. Please contact DPG admin to create partition for this action type.`,
      });
    }

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to store event',
    });
  }
};