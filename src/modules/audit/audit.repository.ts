import { PrismaClient, Prisma } from '@prisma/client';
import { AuditQuery } from './audit.schema.js';

export class AuditRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(query: AuditQuery) {
    const {
      page,
      limit,
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = query;
    const orderByField = sortBy === 'timestamp' ? 'createdAt' : sortBy;

    const where: Prisma.AuditLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
      ...(resource ? { resource: { contains: resource, mode: 'insensitive' } } : {}),
      ...(resourceId ? { resourceId } : {}),
      ...(startDate || endDate
        ? {
            timestamp: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          [orderByField]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }
}
