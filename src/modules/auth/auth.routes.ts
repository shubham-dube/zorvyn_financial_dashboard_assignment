import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from './auth.schema.js';
import { CONSTANTS } from '../../config/constants.js';

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma, (payload) => fastify.jwt.sign(payload));
  const authController = new AuthController(authService);

  // Register
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: CONSTANTS.RATE_LIMITS.AUTH_REGISTER.max,
          timeWindow: CONSTANTS.RATE_LIMITS.AUTH_REGISTER.window,
        },
      },
      schema: {
        tags: ['Auth'],
        description: 'Register a new user account',
        body: {
          type: 'object',
          required: ['email', 'name', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = RegisterSchema.parse(request.body);
      },
    },
    authController.register.bind(authController)
  );

  // Login
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: CONSTANTS.RATE_LIMITS.AUTH_LOGIN.max,
          timeWindow: CONSTANTS.RATE_LIMITS.AUTH_LOGIN.window,
        },
      },
      schema: {
        tags: ['Auth'],
        description: 'Login to existing account',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = LoginSchema.parse(request.body);
      },
    },
    authController.login.bind(authController)
  );

  // Refresh token
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: CONSTANTS.RATE_LIMITS.AUTH_REFRESH.max,
          timeWindow: CONSTANTS.RATE_LIMITS.AUTH_REFRESH.window,
        },
      },
      schema: {
        tags: ['Auth'],
        description: 'Refresh access token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.body = RefreshTokenSchema.parse(request.body);
      },
    },
    authController.refresh.bind(authController)
  );

  // Logout
  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        description: 'Logout and invalidate tokens',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Successfully logged out',
          },
        },
      },
    },
    authController.logout.bind(authController)
  );

  // Get current user profile
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
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
            },
          },
        },
      },
    },
    authController.me.bind(authController)
  );
}
