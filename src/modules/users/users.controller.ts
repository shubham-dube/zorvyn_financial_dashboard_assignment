import { FastifyRequest, FastifyReply } from 'fastify';
import { UsersService } from './users.service.js';
import {
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from './users.schema.js';

export class UsersController {
  constructor(private usersService: UsersService) {}

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as ListUsersQuery;
    const result = await this.usersService.listUsers(query, request.user);
    return reply.send(result);
  }

  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const user = await this.usersService.getUserById(params.id, request.user);
    return reply.send(user);
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const body = request.body as UpdateUserInput;
    const user = await this.usersService.updateUser(params.id, body, request.user);
    return reply.send(user);
  }

  async updateUserRole(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const body = request.body as UpdateUserRoleInput;
    const user = await this.usersService.updateUserRole(params.id, body, request.user);
    return reply.send(user);
  }

  async deactivateUser(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    await this.usersService.deactivateUser(params.id, request.user);
    return reply.code(204).send();
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const user = await this.usersService.getUserById(request.user.id, request.user);
    return reply.send(user);
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const body = request.body as UpdateProfileInput;
    const user = await this.usersService.updateProfile(request.user.id, body);
    return reply.send(user);
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const body = request.body as ChangePasswordInput;
    await this.usersService.changePassword(request.user.id, body);
    return reply.code(204).send();
  }
}
