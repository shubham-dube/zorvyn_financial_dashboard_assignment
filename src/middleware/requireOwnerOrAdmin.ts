import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '../types/common.types.js';
import { ForbiddenError } from '../lib/errors/AppError.js';

export interface ResourceWithOwner {
  createdById: string;
}

export function requireOwnerOrAdmin<T extends ResourceWithOwner>(
  getResource: (request: FastifyRequest) => Promise<T | null>
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    // Admins can access everything
    if (request.user.role === Role.ADMIN) {
      return;
    }

    const resource = await getResource(request);

    if (!resource) {
      return; // Let the controller handle not found
    }

    if (resource.createdById !== request.user.id) {
      throw new ForbiddenError('You can only access your own resources');
    }
  };
}
