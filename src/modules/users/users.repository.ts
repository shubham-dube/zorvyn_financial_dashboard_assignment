import {
  PrismaClient,
  Prisma,
  User,
  UserStatus as PrismaUserStatus,
  Role as PrismaRole,
} from '@prisma/client';
import { ListUsersQuery } from './users.schema.js';
import { parsePagination } from '../../lib/pagination.js';
import { Role, UserStatus } from '../../types/common.types.js';

export class UsersRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async list(query: ListUsersQuery) {
    const { skip, take, page, limit } = parsePagination({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role as PrismaRole;
    }

    if (query.status) {
      where.status = query.status as PrismaUserStatus;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async update(id: string, data: { name?: string; status?: UserStatus }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.status && { status: data.status as PrismaUserStatus }),
      },
    });
  }

  async updateRole(id: string, role: Role) {
    return this.prisma.user.update({
      where: { id },
      data: { role: role as PrismaRole },
    });
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
