import { FastifyInstance } from 'fastify';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  ListCategoriesQuerySchema,
} from './categories.schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '../../types/common.types.js';

export default async function categoriesRoutes(fastify: FastifyInstance) {
  const categoriesService = new CategoriesService(fastify.prisma);
  const categoriesController = new CategoriesController(categoriesService);

  // List all categories
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Categories'],
        description: 'List all categories with optional type filter',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                isSystem: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.query = ListCategoriesQuerySchema.parse(request.query);
      },
    },
    categoriesController.listCategories.bind(categoriesController)
  );

  // Get category by ID
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Categories'],
        description: 'Get category by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              isSystem: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    categoriesController.getCategoryById.bind(categoriesController)
  );

  // Create category (ADMIN only)
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Categories'],
        description: 'Create a new custom category',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              isSystem: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = CreateCategorySchema.parse(request.body);
      },
    },
    categoriesController.createCategory.bind(categoriesController)
  );

  // Update category (ADMIN only)
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Categories'],
        description: 'Update category (custom categories only)',
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              isSystem: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = UpdateCategorySchema.parse(request.body);
      },
    },
    categoriesController.updateCategory.bind(categoriesController)
  );

  // Delete category (ADMIN only)
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Categories'],
        description: 'Delete category (only if no records associated)',
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
            description: 'Category deleted successfully',
          },
        },
      },
    },
    categoriesController.deleteCategory.bind(categoriesController)
  );
}
