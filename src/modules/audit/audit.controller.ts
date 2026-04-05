import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from './audit.service.js';
import { AuditQuery } from './audit.schema.js';

export class AuditController {
  constructor(private auditService: AuditService) {}

  async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as AuditQuery;
    const logs = await this.auditService.getAuditLogs(query);
    return reply.send(logs);
  }
}
