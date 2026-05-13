import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { dpgDb } from '../../../db/dpg_client';
import { dpgUsers, dpgItems } from '../../../db/dpg_schema';
import { authenticate } from '../../../middleware/authenticate';
import { normalizeIndianPhone } from '../../../utils/phone';

const UpdateItemParamsSchema = z.object({
  itemId: z.string().uuid('Invalid item ID format'),
});

const UpdateItemBodySchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number is required'),
  itemState: z.record(z.string(), z.any()).optional(),
  itemLatitude: z.number().optional(),
  itemLongitude: z.number().optional(),
});

const UpdateItemResponseSchema = z.object({
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

type UpdateItemRequest = FastifyRequest<{
  Params: z.infer<typeof UpdateItemParamsSchema>;
  Body: z.infer<typeof UpdateItemBodySchema>;
}>;

export const updateItem: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/:itemId',
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
  const { itemId } = request.params;
  const { phoneNumber, itemState, itemLatitude, itemLongitude } = request.body;

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
      .where(eq(dpgItems.itemId, itemId))
      .limit(1);

    if (!existingItem) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Item not found',
      });
    }

    if (existingItem.createdBy !== user.id) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have permission to update this item',
      });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (itemState !== undefined) {
      updateData.itemState = itemState;
    }
    if (itemLatitude !== undefined) {
      updateData.itemLatitude = itemLatitude;
    }
    if (itemLongitude !== undefined) {
      updateData.itemLongitude = itemLongitude;
    }

    const [updatedItem] = await dpgDb
      .update(dpgItems)
      .set(updateData)
      .where(eq(dpgItems.itemId, itemId))
      .returning();

    return reply.code(200).send({
      itemNetwork: updatedItem.itemNetwork,
      itemDomain: updatedItem.itemDomain,
      itemType: updatedItem.itemType,
      itemId: updatedItem.itemId,
      itemInstanceUrl: updatedItem.itemInstanceUrl,
      itemSchemaUrl: updatedItem.itemSchemaUrl,
      itemState: updatedItem.itemState,
      itemLatitude: updatedItem.itemLatitude,
      itemLongitude: updatedItem.itemLongitude,
      createdBy: updatedItem.createdBy,
      createdAt: updatedItem.createdAt.toISOString(),
      updatedAt: updatedItem.updatedAt.toISOString(),
    });
  } catch (err) {
    request.log.error({ err, itemId, phoneNumber }, 'Failed to update item in DPG');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update item',
    });
  }
};