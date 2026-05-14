import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or, and } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems, dpgItemActions } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';
import { getItemInstanceUrl } from '../../../config';

const ActionItemRefSchema = z.object({
  item_network: z.string().min(1, 'item_network is required'),
  item_domain: z.string().min(1, 'item_domain is required'),
  item_type: z.string().min(1, 'item_type is required'),
  item_id: z.string().uuid('Invalid item_id format'),
  item_instance_url: z.string().url('Invalid item_instance_url format'),
});

const CreateActionBodySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  action_name: z.string().min(1, 'action_name is required'),
  source_item: ActionItemRefSchema,
  target_item: ActionItemRefSchema.extend({
    item_instance_url: z.string().url(),
  }),
  requirements_snapshot: z.record(z.string(), z.any()).optional(),
});

const CreateActionResponseSchema = z.object({
  action_name: z.string(),
  action_id: z.string().uuid(),
  action_status: z.string(),
  update_count: z.number().int(),
  source_item_id: z.string().uuid(),
  target_item_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

type CreateActionRequest = FastifyRequest<{
  Body: z.infer<typeof CreateActionBodySchema>;
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

export const createAction: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/create',
    method: 'POST',
    preHandler: authenticate,
    schema: {
      tags: ['action'],
      body: CreateActionBodySchema,
      response: {
        201: CreateActionResponseSchema,
      },
    },
    handler: createActionHandler,
  });
};

const createActionHandler = async (
  request: CreateActionRequest,
  reply: FastifyReply
) => {
  const {
    phoneNumber,
    action_name,
    source_item,
    target_item,
    requirements_snapshot,
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
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const sourceItemInstanceUrl = normalizeInstanceUrl(source_item.item_instance_url);
    const [sourceItem] = await dpgDb
      .select()
      .from(dpgItems)
      .where(
        and(
          eq(dpgItems.item_network, source_item.item_network),
          eq(dpgItems.item_domain, source_item.item_domain),
          eq(dpgItems.item_type, source_item.item_type),
          eq(dpgItems.item_id, source_item.item_id)
        )
      )
      .limit(1);

    if (!sourceItem || normalizeInstanceUrl(sourceItem.item_instance_url) !== sourceItemInstanceUrl) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Source item not found',
      });
    }

    if (sourceItem.created_by !== user.id) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not own the source item',
      });
    }

    const targetItemInstanceUrl = normalizeInstanceUrl(target_item.item_instance_url);
    const [targetItem] = await dpgDb
      .select()
      .from(dpgItems)
      .where(
        and(
          eq(dpgItems.item_network, target_item.item_network),
          eq(dpgItems.item_domain, target_item.item_domain),
          eq(dpgItems.item_type, target_item.item_type),
          eq(dpgItems.item_id, target_item.item_id)
        )
      )
      .limit(1);

    if (!targetItem || normalizeInstanceUrl(targetItem.item_instance_url) !== targetItemInstanceUrl) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Target item not found',
      });
    }

    const now = new Date();
    const actionStatus = 'created';
    const [createdAction] = await dpgDb
      .insert(dpgItemActions)
      .values({
        action_name,
        action_status: actionStatus,
        update_count: 0,
        source_item_network: source_item.item_network,
        source_item_domain: source_item.item_domain,
        source_item_type: source_item.item_type,
        source_item_id: source_item.item_id,
        source_item_instance_url: source_item.item_instance_url,
        source_item_owner: user.id,
        target_item_network: target_item.item_network,
        target_item_domain: target_item.item_domain,
        target_item_type: target_item.item_type,
        target_item_id: target_item.item_id,
        target_item_instance_url: target_item.item_instance_url,
        target_item_owner: targetItem.created_by,
        requirements_snapshot: requirements_snapshot || {},
        created_at: now,
        updated_at: now,
      })
      .returning();

    const dpgInstanceUrl = getItemInstanceUrl();
    const isRemoteTarget = normalizeInstanceUrl(target_item.item_instance_url) !== normalizeInstanceUrl(dpgInstanceUrl);

    if (isRemoteTarget) {
      try {
        const response = await fetch(
          new URL('/api/v1/network/action/perform', target_item.item_instance_url),
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              action_name,
              source_item: {
                item_network: source_item.item_network,
                item_domain: source_item.item_domain,
                item_type: source_item.item_type,
                item_id: source_item.item_id,
                item_instance_url: source_item.item_instance_url,
              },
              target_item: {
                item_network: target_item.item_network,
                item_domain: target_item.item_domain,
                item_type: target_item.item_type,
                item_id: target_item.item_id,
                item_instance_url: target_item.item_instance_url,
              },
              source_item_owner: user.id,
              requirements_snapshot: requirements_snapshot || {},
            }),
          }
        );

        if (!response.ok) {
          request.log.warn(
            { status: response.status, target: target_item.item_instance_url },
            'Remote action perform call failed'
          );
        }
      } catch (fetchErr) {
        request.log.error(
          { err: fetchErr, target: target_item.item_instance_url },
          'Failed to call remote action perform API'
        );
      }
    }

    return reply.code(201).send({
      action_name: createdAction.action_name,
      action_id: createdAction.action_id,
      action_status: createdAction.action_status,
      update_count: createdAction.update_count,
      source_item_id: createdAction.source_item_id,
      target_item_id: createdAction.target_item_id,
      created_at: createdAction.created_at.toISOString(),
      updated_at: createdAction.updated_at.toISOString(),
    });
  } catch (err: any) {
    request.log.error(
      { err, phoneNumber, action_name },
      'Failed to create action in DPG'
    );

    if (err?.code === '23514' || err?.message?.includes('no partition')) {
      return reply.code(400).send({
        error: 'PARTITION_NOT_FOUND',
        message: `No partition exists for action '${action_name}'. Please contact DPG admin to create partition for this action type.`,
      });
    }

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create action',
    });
  }
};