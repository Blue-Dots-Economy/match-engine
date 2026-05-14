import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgItemActions, dpgActionEvents } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { getItemInstanceUrl } from '../../../config';

const UpdateStatusBodySchema = z.object({
  action_id: z.string().uuid('Invalid action_id format'),
  action_status: z.string().min(1, 'action_status is required'),
  remarks: z.string().optional(),
});

const UpdateStatusResponseSchema = z.object({
  action_id: z.string().uuid(),
  action_name: z.string(),
  action_status: z.string(),
  update_count: z.number().int(),
});

const EventItemRefSchema = z.object({
  item_network: z.string(),
  item_domain: z.string(),
  item_type: z.string(),
  item_id: z.string().uuid(),
  item_instance_url: z.string().url(),
});

type UpdateStatusRequest = FastifyRequest<{
  Body: z.infer<typeof UpdateStatusBodySchema>;
}>;

function normalizeInstanceUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '127.0.0.1' ||
      parsedUrl.hostname === '::1'
    ) {
      parsedUrl.hostname = 'localhost';
    }
    if (
      (parsedUrl.protocol === 'http:' && parsedUrl.port === '80') ||
      (parsedUrl.protocol === 'https:' && parsedUrl.port === '443')
    ) {
      parsedUrl.port = '';
    }
    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

export const updateActionStatus: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/update-status',
    method: 'POST',
    preHandler: authenticate,
    schema: {
      tags: ['action'],
      body: UpdateStatusBodySchema,
      response: {
        200: UpdateStatusResponseSchema,
      },
    },
    handler: updateActionStatusHandler,
  });
};

const updateActionStatusHandler = async (
  request: UpdateStatusRequest,
  reply: FastifyReply
) => {
  const { action_id, action_status, remarks } = request.body;

  try {
    const [existingAction] = await dpgDb
      .select()
      .from(dpgItemActions)
      .where(eq(dpgItemActions.action_id, action_id))
      .limit(1);

    if (!existingAction) {
      return reply.code(404).send({
        error: 'ACTION_NOT_FOUND',
        message: 'Action does not exist on this instance',
      });
    }

    const now = new Date();
    const nextUpdateCount = existingAction.update_count + 1;

    const [updatedAction] = await dpgDb
      .update(dpgItemActions)
      .set({
        action_status,
        update_count: nextUpdateCount,
        remarks: remarks ?? existingAction.remarks,
        updated_at: now,
      })
      .where(eq(dpgItemActions.action_id, action_id))
      .returning({
        action_id: dpgItemActions.action_id,
        action_name: dpgItemActions.action_name,
        action_status: dpgItemActions.action_status,
        update_count: dpgItemActions.update_count,
        source_item_network: dpgItemActions.source_item_network,
        source_item_domain: dpgItemActions.source_item_domain,
        source_item_type: dpgItemActions.source_item_type,
        source_item_id: dpgItemActions.source_item_id,
        source_item_instance_url: dpgItemActions.source_item_instance_url,
        source_item_owner: dpgItemActions.source_item_owner,
        source_item_latitude: dpgItemActions.source_item_latitude,
        source_item_longitude: dpgItemActions.source_item_longitude,
        target_item_network: dpgItemActions.target_item_network,
        target_item_domain: dpgItemActions.target_item_domain,
        target_item_type: dpgItemActions.target_item_type,
        target_item_id: dpgItemActions.target_item_id,
        target_item_instance_url: dpgItemActions.target_item_instance_url,
        target_item_owner: dpgItemActions.target_item_owner,
        target_item_latitude: dpgItemActions.target_item_latitude,
        target_item_longitude: dpgItemActions.target_item_longitude,
        requirements_snapshot: dpgItemActions.requirements_snapshot,
      });

    const selfInstanceUrl = getItemInstanceUrl();
    const selfUrl = normalizeInstanceUrl(selfInstanceUrl);

    const eventPayload = {
      action_status,
      requirements_snapshot: updatedAction.requirements_snapshot || {},
    };

    const storedEvent = {
      origin_instance_domain: selfInstanceUrl,
      action_name: updatedAction.action_name,
      action_id: updatedAction.action_id,
      action_status: updatedAction.action_status,
      update_count: updatedAction.update_count,
      source_item: {
        item_network: updatedAction.source_item_network,
        item_domain: updatedAction.source_item_domain,
        item_type: updatedAction.source_item_type,
        item_id: updatedAction.source_item_id,
        item_instance_url: updatedAction.source_item_instance_url,
      },
      target_item: {
        item_network: updatedAction.target_item_network,
        item_domain: updatedAction.target_item_domain,
        item_type: updatedAction.target_item_type,
        item_id: updatedAction.target_item_id,
        item_instance_url: updatedAction.target_item_instance_url,
      },
      source_item_owner: updatedAction.source_item_owner,
      target_item_owner: updatedAction.target_item_owner,
      source_item_latitude: updatedAction.source_item_latitude,
      source_item_longitude: updatedAction.source_item_longitude,
      target_item_latitude: updatedAction.target_item_latitude,
      target_item_longitude: updatedAction.target_item_longitude,
      event_payload: eventPayload,
      remarks: remarks ?? null,
    };

    await dpgDb.insert(dpgActionEvents).values({
      action_name: storedEvent.action_name,
      origin_instance_domain: storedEvent.origin_instance_domain,
      action_id: storedEvent.action_id,
      action_status: storedEvent.action_status,
      update_count: storedEvent.update_count,
      source_item_network: storedEvent.source_item.item_network,
      source_item_domain: storedEvent.source_item.item_domain,
      source_item_type: storedEvent.source_item.item_type,
      source_item_id: storedEvent.source_item.item_id,
      source_item_instance_url: storedEvent.source_item.item_instance_url,
      source_item_owner: storedEvent.source_item_owner,
      source_item_latitude: storedEvent.source_item_latitude,
      source_item_longitude: storedEvent.source_item_longitude,
      target_item_network: storedEvent.target_item.item_network,
      target_item_domain: storedEvent.target_item.item_domain,
      target_item_type: storedEvent.target_item.item_type,
      target_item_id: storedEvent.target_item.item_id,
      target_item_instance_url: storedEvent.target_item.item_instance_url,
      target_item_owner: storedEvent.target_item_owner,
      target_item_latitude: storedEvent.target_item_latitude,
      target_item_longitude: storedEvent.target_item_longitude,
      event_payload: storedEvent.event_payload,
      remarks: storedEvent.remarks,
    });

    const targetUrl = normalizeInstanceUrl(updatedAction.target_item_instance_url);
    const sourceUrl = normalizeInstanceUrl(updatedAction.source_item_instance_url);

    const mirrorPromises: Promise<void>[] = [];

    if (targetUrl !== selfUrl) {
      mirrorPromises.push(
        mirrorEventToInstance(updatedAction.target_item_instance_url, storedEvent, request.log, 'target')
      );
    }

    if (sourceUrl !== selfUrl) {
      mirrorPromises.push(
        mirrorEventToInstance(updatedAction.source_item_instance_url, storedEvent, request.log, 'source')
      );
    }

    if (mirrorPromises.length > 0) {
      void Promise.allSettled(mirrorPromises);
    }

    return reply.code(200).send({
      action_id: updatedAction.action_id,
      action_name: updatedAction.action_name,
      action_status: updatedAction.action_status,
      update_count: updatedAction.update_count,
    });
  } catch (err: any) {
    request.log.error(
      { err, action_id, action_status },
      'Failed to update action status in DPG'
    );

    if (err?.code === '23514' || err?.message?.includes('no partition')) {
      return reply.code(400).send({
        error: 'PARTITION_NOT_FOUND',
        message: `No partition exists for action. Please contact DPG admin to create partition for this action type.`,
      });
    }

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update action status',
    });
  }
};

async function mirrorEventToInstance(
  instanceUrl: string,
  event: Record<string, unknown>,
  log: { error: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void },
  direction: 'target' | 'source'
) {
  try {
    const response = await fetch(
      new URL('/api/v1/event/store', instanceUrl),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      log.warn(
        { status: response.status, instance: instanceUrl, direction },
        `Failed to mirror event to ${direction} instance`
      );
    }
  } catch (err) {
    log.error(
      { err, instance: instanceUrl, direction },
      `Failed to mirror event to ${direction} instance`
    );
  }
}