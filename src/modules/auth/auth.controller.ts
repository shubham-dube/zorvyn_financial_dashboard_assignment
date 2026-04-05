import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { RegisterInput, LoginInput, RefreshTokenInput } from './auth.schema.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as RegisterInput;
    const result = await this.authService.register(body);
    return reply.code(201).send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as LoginInput;
    const result = await this.authService.login(body, request.ip, request.headers['user-agent']);
    return reply.send(result);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as RefreshTokenInput;
    const tokens = await this.authService.refresh(body.refreshToken);
    return reply.send({ tokens });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const refreshToken = (request.body as { refreshToken?: string }).refreshToken;

    if (!token || !refreshToken || !request.user) {
      return reply.code(400).send({ message: 'Missing required fields' });
    }

    await this.authService.logout(token, refreshToken, request.user);
    return reply.code(204).send();
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const profile = await this.authService.getProfile(request.user.id);
    return reply.send(profile);
  }
}
