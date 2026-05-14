import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or, and, count } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItemActions } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const FetchActionsQuerySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  action_name: z.string().optional(),
  action_id: z.string().uuid().optional(),
  action_status: z.string().optional(),
  item_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const ActionResponseSchema = z.object({
  action_name: z.string(),
  action_id: z.string().uuid(),
  action_status: z.string(),
  update_count: z.number().int(),
  source_item_network: z.string(),
  source_item_domain: z.string(),
  source_item_type: z.string(),
  source_item_id: z.string().uuid(),
  source_item_instance_url: z.string(),
  source_item_owner: z.string().nullable(),
  target_item_network: z.string(),
  target_item_domain: z.string(),
  target_item_type: z.string(),
  target_item_id: z.string().uuid(),
  target_item_instance_url: z.string(),
  target_item_owner: z.string().nullable(),
  requirements_snapshot: z.record(z.string(), z.any()),
  remarks: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const FetchActionsResponseSchema = z.object({
  actions: z.array(ActionResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

type FetchActionsRequest = FastifyRequest<{
  Querystring: z.infer<typeof FetchActionsQuerySchema>;
}>;

export const fetchActions: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/fetch',
    method: 'GET',
    preHandler: authenticate,
    schema: {
      tags: ['action'],
      querystring: FetchActionsQuerySchema,
      response: {
        200: FetchActionsResponseSchema,
      },
    },
    handler: fetchActionsHandler,
  });
};

const fetchActionsHandler = async (
  request: FetchActionsRequest,
  reply: FastifyReply
) => {
  const {
    phoneNumber,
    action_name,
    action_id,
    action_status,
    item_id,
    limit,
    offset,
  } = request.query;

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
        actions: [],
        total: 0,
        limit,
        offset,
      });
    }

    const conditions = [
      or(
        eq(dpgItemActions.source_item_owner, user.id),
        eq(dpgItemActions.target_item_owner, user.id)
      ),
    ];

    if (action_name) {
      conditions.push(eq(dpgItemActions.action_name, action_name));
    }
    if (action_id) {
      conditions.push(eq(dpgItemActions.action_id, action_id));
    }
    if (action_status) {
      conditions.push(eq(dpgItemActions.action_status, action_status));
    }
    if (item_id) {
      conditions.push(
        or(
          eq(dpgItemActions.source_item_id, item_id),
          eq(dpgItemActions.target_item_id, item_id)
        )
      );
    }

    const actions = await dpgDb
      .select()
      .from(dpgItemActions)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await dpgDb
      .select({ total: count() })
      .from(dpgItemActions)
      .where(and(...conditions));

    return reply.code(200).send({
      actions: actions.map((action) => ({
        action_name: action.action_name,
        action_id: action.action_id,
        action_status: action.action_status,
        update_count: action.update_count,
        source_item_network: action.source_item_network,
        source_item_domain: action.source_item_domain,
        source_item_type: action.source_item_type,
        source_item_id: action.source_item_id,
        source_item_instance_url: action.source_item_instance_url,
        source_item_owner: action.source_item_owner,
        target_item_network: action.target_item_network,
        target_item_domain: action.target_item_domain,
        target_item_type: action.target_item_type,
        target_item_id: action.target_item_id,
        target_item_instance_url: action.target_item_instance_url,
        target_item_owner: action.target_item_owner,
        requirements_snapshot: action.requirements_snapshot,
        remarks: action.remarks,
        created_at: action.created_at.toISOString(),
        updated_at: action.updated_at.toISOString(),
      })),
      total: actions.length,
      limit,
      offset,
    });
  } catch (err) {
    request.log.error(
      { err, phoneNumber, action_name },
      'Failed to fetch actions from DPG'
    );
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch actions',
    });
  }
};