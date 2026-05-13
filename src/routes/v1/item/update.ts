import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const UpdateItemParamsSchema = z.object({
  item_id: z.string().uuid('Invalid item ID format'),
});

const UpdateItemBodySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  item_state: z.record(z.string(), z.any()).optional(),
  item_latitude: z.number().optional(),
  item_longitude: z.number().optional(),
});

const UpdateItemResponseSchema = z.object({
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

type UpdateItemRequest = FastifyRequest<{
  Params: z.infer<typeof UpdateItemParamsSchema>;
  Body: z.infer<typeof UpdateItemBodySchema>;
}>;

export const updateItem: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/:item_id',
    method: 'PATCH',
    preHandler: authenticate,
    schema: {
      tags: ['item'],
      params: UpdateItemParamsSchema,
      body: UpdateItemBodySchema,
      response: {
        200: UpdateItemResponseSchema,
      },
    },
    handler: updateItemHandler,
  });
};

const updateItemHandler = async (request: UpdateItemRequest, reply: FastifyReply) => {
  const { item_id } = request.params;
  const { phoneNumber, item_state, item_latitude, item_longitude } = request.body;

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

    const [existingItem] = await dpgDb
      .select()
      .from(dpgItems)
      .where(eq(dpgItems.item_id, item_id))
      .limit(1);

    if (!existingItem) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Item not found',
      });
    }

    if (existingItem.created_by !== user.id) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have permission to update this item',
      });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (item_state !== undefined) {
      updateData.item_state = item_state;
    }
    if (item_latitude !== undefined) {
      updateData.item_latitude = item_latitude;
    }
    if (item_longitude !== undefined) {
      updateData.item_longitude = item_longitude;
    }

    const [updatedItem] = await dpgDb
      .update(dpgItems)
      .set(updateData)
      .where(eq(dpgItems.item_id, item_id))
      .returning();

    return reply.code(200).send({
      item_network: updatedItem.item_network,
      item_domain: updatedItem.item_domain,
      item_type: updatedItem.item_type,
      item_id: updatedItem.item_id,
      item_instance_url: updatedItem.item_instance_url,
      item_schema_url: updatedItem.item_schema_url,
      item_state: updatedItem.item_state,
      item_latitude: updatedItem.item_latitude,
      item_longitude: updatedItem.item_longitude,
      created_by: updatedItem.created_by,
      created_at: updatedItem.created_at.toISOString(),
      updated_at: updatedItem.updated_at.toISOString(),
    });
  } catch (err) {
    request.log.error({ err, item_id, phoneNumber }, 'Failed to update item in DPG');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update item',
    });
  }
};