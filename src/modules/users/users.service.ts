import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { UsersRepository } from './users.repository.js';
import {
  UpdateUserInput,
  UpdateUserRoleInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ListUsersQuery,
} from './users.schema.js';
import { UserResponse, UserListItem, UpdateProfileResponse } from './users.types.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../../lib/errors/AppError.js';
import {
  RequestUser,
  Role,
  UserStatus,
  createPaginatedResponse,
} from '../../types/common.types.js';
import { CONSTANTS } from '../../config/constants.js';
import { tokenStore } from '../../lib/redis/tokenStore.js';

export class UsersService {
  private repository: UsersRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new UsersRepository(prisma);
  }

  async listUsers(query: ListUsersQuery, currentUser: RequestUser) {
    // Only admins can list users
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can list users');
    }

    const result = await this.repository.list(query);

    const users: UserListItem[] = result.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
    }));

    return createPaginatedResponse(users, result.total, result.page, result.limit);
  }

  async getUserById(id: string, currentUser: RequestUser): Promise<UserResponse> {
    // Only admins can view other users
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenError('You can only view your own profile');
    }

    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(
    id: string,
    data: UpdateUserInput,
    currentUser: RequestUser
  ): Promise<UserResponse> {
    // Only admins can update users
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can update users');
    }

    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent admin from deactivating themselves
    if (id === currentUser.id && data.status === 'INACTIVE') {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const updateData: { name?: string; status?: UserStatus } = {};
    if (typeof data.name === 'string') {
      updateData.name = data.name;
    }
    if (typeof data.status === 'string') {
      updateData.status = data.status as UserStatus;
    }

    const updated = await this.repository.update(id, updateData);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_STATUS_CHANGED,
        resource: 'user',
        resourceId: id,
        metadata: {
          changes: data,
          previousStatus: user.status,
        },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as Role,
      status: updated.status as UserStatus,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateUserRole(
    id: string,
    data: UpdateUserRoleInput,
    currentUser: RequestUser
  ): Promise<UserResponse> {
    // Only admins can change roles
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can change user roles');
    }

    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await this.repository.updateRole(id, data.role as Role);

    // Log audit event (role changes are security-critical)
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_ROLE_CHANGED,
        resource: 'user',
        resourceId: id,
        metadata: {
          previousRole: user.role,
          newRole: data.role,
        },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as Role,
      status: updated.status as UserStatus,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deactivateUser(id: string, currentUser: RequestUser): Promise<void> {
    // Only admins can deactivate users
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only admins can deactivate users');
    }

    // Prevent admin from deactivating themselves
    if (id === currentUser.id) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.repository.deactivate(id);

    // Revoke all user's refresh tokens
    await tokenStore.revokeAllUserTokens(id);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_STATUS_CHANGED,
        resource: 'user',
        resourceId: id,
        metadata: {
          action: 'deactivated',
          previousStatus: user.status,
        },
      },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<UpdateProfileResponse> {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: { name?: string } = {};
    if (typeof data.name === 'string') {
      updateData.name = data.name;
    }

    const updated = await this.repository.update(userId, updateData);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as Role,
      updatedAt: updated.updatedAt,
    };
  }

  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await argon2.verify(user.passwordHash, data.currentPassword);

    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(data.newPassword, {
      type: argon2.argon2id,
      memoryCost: CONSTANTS.ARGON2.MEMORY_COST,
      timeCost: CONSTANTS.ARGON2.TIME_COST,
      parallelism: CONSTANTS.ARGON2.PARALLELISM,
    });

    await this.repository.updatePassword(userId, newPasswordHash);

    // Revoke all existing sessions for security
    await tokenStore.revokeAllUserTokens(userId);

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        resource: 'user',
        resourceId: userId,
        metadata: {
          sessionsRevoked: true,
        },
      },
    });
  }
}
