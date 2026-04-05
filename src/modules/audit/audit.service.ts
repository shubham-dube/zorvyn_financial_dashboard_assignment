import { PrismaClient } from '@prisma/client';
import { AuditRepository } from './audit.repository.js';
import { AuditQuery } from './audit.schema.js';
import { AuditLogResponse } from './audit.types.js';
import { createPaginatedResponse } from '../../types/common.types.js';

export class AuditService {
  private repository: AuditRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new AuditRepository(prisma);
  }

  async getAuditLogs(query: AuditQuery) {
    const result = await this.repository.findAll(query);

    const logs: AuditLogResponse[] = result.logs.map((log) => ({
      id: log.id,
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
      },
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      metadata: log.metadata as Record<string, unknown> | null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.createdAt.toISOString(),
    }));

    return createPaginatedResponse(logs, result.total, result.page, result.limit);
  }
}
