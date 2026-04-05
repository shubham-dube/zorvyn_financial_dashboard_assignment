import { PrismaClient, Category, RecordType as PrismaRecordType } from '@prisma/client';
import { RecordType } from '../../types/common.types.js';

export class CategoriesRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async findByNameAndType(name: string, type: RecordType): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: {
        name_type: {
          name,
          type: type as PrismaRecordType,
        },
      },
    });
  }

  async list(type?: RecordType): Promise<Category[]> {
    const where = type ? { type: type as PrismaRecordType } : {};

    return this.prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(name: string, type: RecordType, createdBy: string): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name,
        type: type as PrismaRecordType,
        isSystem: false,
        createdBy,
      },
    });
  }

  async update(id: string, name: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({
      where: { id },
    });
  }

  async countRecordsInCategory(categoryId: string): Promise<number> {
    return this.prisma.financialRecord.count({
      where: {
        categoryId,
        isDeleted: false,
      },
    });
  }
}
