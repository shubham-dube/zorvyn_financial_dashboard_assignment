import { FastifyInstance } from 'fastify';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { AuditQuerySchema } from './audit.schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '../../types/common.types.js';

export default async function auditRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);
  const auditController = new AuditController(auditService);

  // Get audit logs (Admin only)
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Audit'],
        description: 'Query audit logs (Admin only)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            userId: { type: 'string', format: 'uuid' },
            action: { type: 'string' },
            resource: { type: 'string' },
            resourceId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            sortBy: { type: 'string', enum: ['timestamp', 'action', 'resource'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
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
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                      },
                    },
                    action: { type: 'string' },
                    resource: { type: 'string' },
                    resourceId: { type: ['string', 'null'] },
                    metadata: { type: ['object', 'null'] },
                    ipAddress: { type: ['string', 'null'] },
                    userAgent: { type: ['string', 'null'] },
                    timestamp: { type: 'string', format: 'date-time' },
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
        request.query = AuditQuerySchema.parse(request.query);
      },
    },
    auditController.getAuditLogs.bind(auditController)
  );
}
