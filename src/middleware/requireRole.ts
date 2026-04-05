import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '../types/common.types.js';
import { ForbiddenError } from '../lib/errors/AppError.js';

export function requireRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}
