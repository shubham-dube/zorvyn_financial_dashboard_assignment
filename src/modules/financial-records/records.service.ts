import { PrismaClient } from '@prisma/client';
import { RecordsRepository } from './records.repository.js';
import { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from './records.schema.js';
import { RecordResponse } from './records.types.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors/AppError.js';
import {
  RequestUser,
  Role,
  RecordType,
  createPaginatedResponse,
} from '../../types/common.types.js';
import { CONSTANTS } from '../../config/constants.js';
import { cacheStore } from '../../lib/redis/cacheStore.js';
import { formatDate } from '../../lib/dateUtils.js';

export class RecordsService {
  private repository: RecordsRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new RecordsRepository(prisma);
  }

  async listRecords(query: ListRecordsQuery, currentUser: RequestUser) {
    // Only admins can see deleted records
    if (query.includeDeleted && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can view deleted records');
    }

    // Only admins can filter by other users
    if (
      query.createdById &&
      query.createdById !== currentUser.id &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenError('You can only filter by your own records');
    }

    const result = await this.repository.list(query, currentUser.id, currentUser.role);

    const records: RecordResponse[] = result.records.map((record) => ({
      id: record.id,
      amount: record.amount.toString(),
      type: record.type as RecordType,
      category: {
        id: record.category.id,
        name: record.category.name,
      },
      date: formatDate(record.date),
      notes: record.notes,
      createdBy: {
        id: record.createdBy.id,
        name: record.createdBy.name,
      },
      isDeleted: record.isDeleted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    return createPaginatedResponse(records, result.total, result.page, result.limit);
  }

  async getRecordById(id: string, currentUser: RequestUser): Promise<RecordResponse> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new NotFoundError('Financial record not found');
    }

    // Analysts can only view their own records
    if (currentUser.role === Role.ANALYST && record.createdById !== currentUser.id) {
      throw new ForbiddenError('You can only view your own records');
    }

    // Only admins can view deleted records
    if (record.isDeleted && currentUser.role !== Role.ADMIN) {
      throw new NotFoundError('Financial record not found');
    }

    return {
      id: record.id,
      amount: record.amount.toString(),
      type: record.type as RecordType,
      category: {
        id: record.category.id,
        name: record.category.name,
      },
      date: formatDate(record.date),
      notes: record.notes,
      createdBy: {
        id: record.createdBy.id,
        name: record.createdBy.name,
      },
      isDeleted: record.isDeleted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async createRecord(data: CreateRecordInput, currentUser: RequestUser): Promise<RecordResponse> {
    // Only analysts and admins can create records
    if (currentUser.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers cannot create records');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const createData: {
      amount: number;
      type: RecordType;
      categoryId: string;
      date: Date;
      notes?: string;
      createdById: string;
    } = {
      amount: data.amount,
      type: data.type as RecordType,
      categoryId: data.categoryId,
      date: new Date(data.date),
      createdById: currentUser.id,
    };

    if (typeof data.notes === 'string') {
      createData.notes = data.notes;
    }

    const created = await this.repository.create(createData);
    const record = await this.repository.findById(created.id);

    if (!record) {
      throw new NotFoundError('Financial record not found');
    }

    // Invalidate dashboard cache
    await cacheStore.invalidateDashboardCache(currentUser.id);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.RECORD_CREATED,
        resource: 'financial_record',
        resourceId: record.id,
        metadata: {
          amount: record.amount.toString(),
          type: record.type,
          categoryId: record.categoryId,
          date: formatDate(record.date),
        },
      },
    });

    return {
      id: record.id,
      amount: record.amount.toString(),
      type: record.type as RecordType,
      category: {
        id: record.category.id,
        name: record.category.name,
      },
      date: formatDate(record.date),
      notes: record.notes,
      createdBy: {
        id: record.createdBy.id,
        name: record.createdBy.name,
      },
      isDeleted: record.isDeleted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async updateRecord(
    id: string,
    data: UpdateRecordInput,
    currentUser: RequestUser
  ): Promise<RecordResponse> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new NotFoundError('Financial record not found');
    }

    // Only admins can update deleted records
    if (record.isDeleted && currentUser.role !== Role.ADMIN) {
      throw new NotFoundError('Financial record not found');
    }

    // Analysts can only update their own records
    if (currentUser.role === Role.ANALYST && record.createdById !== currentUser.id) {
      throw new ForbiddenError('You can only update your own records');
    }

    // Verify category exists if changing
    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    const updateData: {
      amount?: number;
      type?: RecordType;
      categoryId?: string;
      date?: Date;
      notes?: string;
    } = {};

    if (typeof data.amount === 'number') {
      updateData.amount = data.amount;
    }
    if (typeof data.type === 'string') {
      updateData.type = data.type as RecordType;
    }
    if (typeof data.categoryId === 'string') {
      updateData.categoryId = data.categoryId;
    }
    if (typeof data.date === 'string') {
      updateData.date = new Date(data.date);
    }
    if (typeof data.notes === 'string') {
      updateData.notes = data.notes;
    }

    const updated = await this.repository.update(id, updateData);

    // Invalidate dashboard cache
    await cacheStore.invalidateDashboardCache(record.createdById);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.RECORD_UPDATED,
        resource: 'financial_record',
        resourceId: id,
        metadata: {
          changes: data,
          previousValues: {
            amount: record.amount.toString(),
            type: record.type,
            categoryId: record.categoryId,
            date: formatDate(record.date),
          },
        },
      },
    });

    return {
      id: updated.id,
      amount: updated.amount.toString(),
      type: updated.type as RecordType,
      category: {
        id: updated.category.id,
        name: updated.category.name,
      },
      date: formatDate(updated.date),
      notes: updated.notes,
      createdBy: {
        id: updated.createdBy.id,
        name: updated.createdBy.name,
      },
      isDeleted: updated.isDeleted,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteRecord(id: string, currentUser: RequestUser): Promise<void> {
    // Only admins can delete records
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can delete records');
    }

    const record = await this.repository.findById(id);

    if (!record) {
      throw new NotFoundError('Financial record not found');
    }

    if (record.isDeleted) {
      throw new NotFoundError('Record is already deleted');
    }

    await this.repository.softDelete(id, currentUser.id);

    // Invalidate dashboard cache
    await cacheStore.invalidateDashboardCache(record.createdById);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.RECORD_DELETED,
        resource: 'financial_record',
        resourceId: id,
        metadata: {
          amount: record.amount.toString(),
          type: record.type,
          categoryId: record.categoryId,
          date: formatDate(record.date),
          deletedBy: currentUser.id,
        },
      },
    });
  }

  async restoreRecord(id: string, currentUser: RequestUser): Promise<RecordResponse> {
    // Only admins can restore records
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can restore records');
    }

    const record = await this.repository.findById(id);

    if (!record) {
      throw new NotFoundError('Financial record not found');
    }

    if (!record.isDeleted) {
      throw new NotFoundError('Record is not deleted');
    }

    const restored = await this.repository.restore(id);

    // Invalidate dashboard cache
    await cacheStore.invalidateDashboardCache(record.createdById);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.RECORD_RESTORED,
        resource: 'financial_record',
        resourceId: id,
        metadata: {
          amount: restored.amount.toString(),
          type: restored.type,
          restoredBy: currentUser.id,
        },
      },
    });

    return {
      id: restored.id,
      amount: restored.amount.toString(),
      type: restored.type as RecordType,
      category: {
        id: restored.category.id,
        name: restored.category.name,
      },
      date: formatDate(restored.date),
      notes: restored.notes,
      createdBy: {
        id: restored.createdBy.id,
        name: restored.createdBy.name,
      },
      isDeleted: restored.isDeleted,
      createdAt: restored.createdAt,
      updatedAt: restored.updatedAt,
    };
  }
}
