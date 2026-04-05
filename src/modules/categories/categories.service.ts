import { PrismaClient } from '@prisma/client';
import { CategoriesRepository } from './categories.repository.js';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from './categories.schema.js';
import { CategoryResponse } from './categories.types.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from '../../lib/errors/AppError.js';
import { RequestUser, Role, RecordType } from '../../types/common.types.js';
import { CONSTANTS } from '../../config/constants.js';
import { cacheStore } from '../../lib/redis/cacheStore.js';

export class CategoriesService {
  private repository: CategoriesRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new CategoriesRepository(prisma);
  }

  async listCategories(query: ListCategoriesQuery): Promise<CategoryResponse[]> {
    // Check cache first
    const cacheKey = `${CONSTANTS.CACHE_PREFIX.CATEGORY_LIST}:${query.type || 'all'}`;
    const cached = await cacheStore.get<CategoryResponse[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const categories = await this.repository.list(query.type as RecordType | undefined);

    const response: CategoryResponse[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      type: cat.type as RecordType,
      isSystem: cat.isSystem,
      createdAt: cat.createdAt,
    }));

    // Cache for 1 hour
    await cacheStore.set(cacheKey, response, CONSTANTS.CACHE_TTL.CATEGORY_LIST);

    return response;
  }

  async getCategoryById(id: string): Promise<CategoryResponse> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return {
      id: category.id,
      name: category.name,
      type: category.type as RecordType,
      isSystem: category.isSystem,
      createdAt: category.createdAt,
    };
  }

  async createCategory(
    data: CreateCategoryInput,
    currentUser: RequestUser
  ): Promise<CategoryResponse> {
    // Only admins can create categories
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can create categories');
    }

    // Check if category with same name and type already exists
    const existing = await this.repository.findByNameAndType(data.name, data.type as RecordType);

    if (existing) {
      throw new ConflictError(`Category with name "${data.name}" already exists for ${data.type}`);
    }

    const category = await this.repository.create(
      data.name,
      data.type as RecordType,
      currentUser.id
    );

    // Invalidate cache
    await this.invalidateCache();

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.CATEGORY_CREATED,
        resource: 'category',
        resourceId: category.id,
        metadata: {
          name: category.name,
          type: category.type,
        },
      },
    });

    return {
      id: category.id,
      name: category.name,
      type: category.type as RecordType,
      isSystem: category.isSystem,
      createdAt: category.createdAt,
    };
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryInput,
    currentUser: RequestUser
  ): Promise<CategoryResponse> {
    // Only admins can update categories
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can update categories');
    }

    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Cannot modify system categories
    if (category.isSystem) {
      throw new ForbiddenError('System categories cannot be modified');
    }

    // Check if new name conflicts with existing category of same type
    if (data.name) {
      const existing = await this.repository.findByNameAndType(
        data.name,
        category.type as RecordType
      );

      if (existing && existing.id !== id) {
        throw new ConflictError(
          `Category with name "${data.name}" already exists for ${category.type}`
        );
      }
    }

    const updated = await this.repository.update(id, data.name!);

    // Invalidate cache
    await this.invalidateCache();

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type as RecordType,
      isSystem: updated.isSystem,
      createdAt: updated.createdAt,
    };
  }

  async deleteCategory(id: string, currentUser: RequestUser): Promise<void> {
    // Only admins can delete categories
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can delete categories');
    }

    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Cannot delete system categories
    if (category.isSystem) {
      throw new ForbiddenError('System categories cannot be deleted');
    }

    // Check if category has associated records
    const recordCount = await this.repository.countRecordsInCategory(id);

    if (recordCount > 0) {
      throw new UnprocessableError(
        `Cannot delete category with ${recordCount} associated records. Reassign or delete records first.`
      );
    }

    await this.repository.delete(id);

    // Invalidate cache
    await this.invalidateCache();

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.CATEGORY_DELETED,
        resource: 'category',
        resourceId: id,
        metadata: {
          name: category.name,
          type: category.type,
        },
      },
    });
  }

  private async invalidateCache(): Promise<void> {
    await cacheStore.delPattern(`${CONSTANTS.CACHE_PREFIX.CATEGORY_LIST}:*`);
  }
}
