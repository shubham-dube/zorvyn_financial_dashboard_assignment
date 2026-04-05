import { PrismaClient, RecordType as PrismaRecordType, Prisma } from '@prisma/client';
import { ListRecordsQuery } from './records.schema.js';
import { parsePagination } from '../../lib/pagination.js';
import { RecordType, Role } from '../../types/common.types.js';

export class RecordsRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.financialRecord.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async list(query: ListRecordsQuery, userId?: string, userRole?: Role) {
    const { skip, take, page, limit } = parsePagination({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.FinancialRecordWhereInput = {};

    // Filter by deletion status
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    // Filter by type
    if (query.type) {
      where.type = query.type as PrismaRecordType;
    }

    // Filter by category
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    // Filter by amount range
    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.amount = {};
      if (query.minAmount !== undefined) {
        where.amount.gte = query.minAmount;
      }
      if (query.maxAmount !== undefined) {
        where.amount.lte = query.maxAmount;
      }
    }

    // Search in notes or category name
    if (query.search) {
      where.OR = [
        { notes: { contains: query.search, mode: 'insensitive' } },
        { category: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    // Filter by creator (admin-only filter)
    if (query.createdById) {
      where.createdById = query.createdById;
    }

    // Analysts can only see their own records
    if (userRole === Role.ANALYST && userId) {
      where.createdById = userId;
    }

    // Sort order
    const orderBy: Prisma.FinancialRecordOrderByWithRelationInput = {};
    if (query.sortBy === 'date') {
      orderBy.date = query.sortOrder;
    } else if (query.sortBy === 'amount') {
      orderBy.amount = query.sortOrder;
    } else if (query.sortBy === 'createdAt') {
      orderBy.createdAt = query.sortOrder;
    }

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    return { records, total, page, limit };
  }

  async create(data: {
    amount: number;
    type: RecordType;
    categoryId: string;
    date: Date;
    notes?: string;
    createdById: string;
  }) {
    return this.prisma.financialRecord.create({
      data: {
        amount: data.amount,
        type: data.type as PrismaRecordType,
        categoryId: data.categoryId,
        date: data.date,
        notes: data.notes ?? null,
        createdById: data.createdById,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      amount?: number;
      type?: RecordType;
      categoryId?: string;
      date?: Date;
      notes?: string;
    }
  ) {
    return this.prisma.financialRecord.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type && { type: data.type as PrismaRecordType }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.date && { date: data.date }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async softDelete(id: string, deletedById: string) {
    return this.prisma.financialRecord.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });
  }

  async restore(id: string) {
    return this.prisma.financialRecord.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
