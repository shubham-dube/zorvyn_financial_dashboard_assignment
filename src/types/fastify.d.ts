import 'fastify';
import { RequestUser } from './common.types.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: RequestUser;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: RequestUser;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
