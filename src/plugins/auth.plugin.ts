import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../config/env.js';
import { CONSTANTS } from '../config/constants.js';
import { UnauthorizedError } from '../lib/errors/AppError.js';
import { tokenStore } from '../lib/redis/tokenStore.js';
import { Role } from '../types/common.types.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  jti: string;
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: CONSTANTS.JWT.ACCESS_TOKEN_EXPIRES_IN,
    },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedError('Missing authorization token');
      }

      const payload = fastify.jwt.verify<JwtPayload>(token);

      // Check if token is blocked
      const isBlocked = await tokenStore.isAccessTokenBlocked(payload.jti);
      if (isBlocked) {
        throw new UnauthorizedError('Token has been revoked');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired token');
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['redis'],
});
