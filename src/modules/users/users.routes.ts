import { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import {
  UpdateUserSchema,
  UpdateUserRoleSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  ListUsersQuerySchema,
} from './users.schema.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '../../types/common.types.js';

export default async function usersRoutes(fastify: FastifyInstance) {
  const usersService = new UsersService(fastify.prisma);
  const usersController = new UsersController(usersService);

  // List all users (ADMIN only)
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Users'],
        description: 'List all users with pagination and filtering',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
            search: { type: 'string' },
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
                    email: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
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
        request.query = ListUsersQuerySchema.parse(request.query);
      },
    },
    usersController.listUsers.bind(usersController)
  );

  // Get user by ID (ADMIN only, or own profile)
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        description: 'Get user by ID',
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
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    usersController.getUserById.bind(usersController)
  );

  // Update user (ADMIN only)
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Users'],
        description: 'Update user information',
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
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = UpdateUserSchema.parse(request.body);
      },
    },
    usersController.updateUser.bind(usersController)
  );

  // Update user role (ADMIN only)
  fastify.patch(
    '/:id/role',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Users'],
        description: 'Update user role',
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
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = UpdateUserRoleSchema.parse(request.body);
      },
    },
    usersController.updateUserRole.bind(usersController)
  );

  // Deactivate user (ADMIN only)
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole([Role.ADMIN])],
      schema: {
        tags: ['Users'],
        description: 'Deactivate user account',
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
            description: 'User deactivated successfully',
          },
        },
      },
    },
    usersController.deactivateUser.bind(usersController)
  );

  // Get own profile
  fastify.get(
    '/me/profile',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        description: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    usersController.getProfile.bind(usersController)
  );

  // Update own profile
  fastify.patch(
    '/me/profile',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        description: 'Update own profile',
        security: [{ bearerAuth: [] }],
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
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = UpdateProfileSchema.parse(request.body);
      },
    },
    usersController.updateProfile.bind(usersController)
  );

  // Change own password
  fastify.post(
    '/me/change-password',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        description: 'Change own password (revokes all sessions)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Password changed successfully',
          },
        },
      },
      preValidation: async (request) => {
        request.body = ChangePasswordSchema.parse(request.body);
      },
    },
    usersController.changePassword.bind(usersController)
  );
}
