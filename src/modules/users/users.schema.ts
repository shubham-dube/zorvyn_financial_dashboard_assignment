import { z } from 'zod';
import { CONSTANTS } from '../../config/constants.js';

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(CONSTANTS.MAX_USER_NAME_LENGTH).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['VIEWER', 'ANALYST', 'ADMIN']),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(CONSTANTS.MAX_USER_NAME_LENGTH).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(
      CONSTANTS.MIN_PASSWORD_LENGTH,
      `Password must be at least ${CONSTANTS.MIN_PASSWORD_LENGTH} characters`
    )
    .max(CONSTANTS.MAX_PASSWORD_LENGTH)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

export const ListUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  role: z.enum(['VIEWER', 'ANALYST', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  search: z.string().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;
