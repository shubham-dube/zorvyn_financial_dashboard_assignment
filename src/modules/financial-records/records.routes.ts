import { FastifyInstance } from 'fastify';
import { RecordsController } from './records.controller.js';
import { RecordsService } from './records.service.js';
import {
  CreateRecordSchema,
  UpdateRecordSchema,
  ListRecordsQuerySchema,
} from './records.schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '../../types/common.types.js';

export default async function recordsRoutes(fastify: FastifyInstance) {
  const recordsService = new RecordsService(fastify.prisma);
  const recordsController = new RecordsController(recordsService);

  // List financial records
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Financial Records'],
        description: 'List financial records with filtering and pagination',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            categoryId: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            minAmount: { type: 'number' },
            maxAmount: { type: 'number' },
            search: { type: 'string' },
            sortBy: { type: 'string', enum: ['date', 'amount', 'createdAt'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            createdById: { type: 'string' },
            includeDeleted: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'string' },
                    type: { type: 'string' },
                    category: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    date: { type: 'string' },
                    notes: { type: ['string', 'null'] },
                    createdBy: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    isDeleted: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.query = ListRecordsQuerySchema.parse(request.query);
      },
    },
    recordsController.listRecords.bind(recordsController)
  );

  // Get single record
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Financial Records'],
        description: 'Get financial record by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    recordsController.getRecordById.bind(recordsController)
  );

  // Create record
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ANALYST, Role.ADMIN])],
      schema: {
        tags: ['Financial Records'],
        description: 'Create new financial record',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['amount', 'type', 'categoryId', 'date'],
          properties: {
            amount: { type: 'number', minimum: 0.01 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            categoryId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'string' },
              type: { type: 'string' },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              date: { type: 'string' },
              notes: { type: ['string', 'null'] },
              createdBy: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              isDeleted: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = CreateRecordSchema.parse(request.body);
      },
    },
    recordsController.createRecord.bind(recordsController)
  );

  // Update record
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Financial Records'],
        description: 'Update financial record (own records for ANALYST, any for ADMIN)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number', minimum: 0.01 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            categoryId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
      },
      preValidation: async (request) => {
        request.body = UpdateRecordSchema.parse(request.body);
      },
    },
    recordsController.updateRecord.bind(recordsController)
  );

  // Delete record (soft delete, ADMIN only)
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Financial Records'],
        description: 'Soft delete financial record',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Record deleted successfully',
          },
        },
      },
    },
    recordsController.deleteRecord.bind(recordsController)
  );

  // Restore deleted record (ADMIN only)
  fastify.post(
    '/:id/restore',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Financial Records'],
        description: 'Restore soft-deleted financial record',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    recordsController.restoreRecord.bind(recordsController)
  );
}
