import { z } from 'zod';
import { CONSTANTS } from '../../config/constants.js';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(CONSTANTS.MAX_USER_NAME_LENGTH),
  password: z
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

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
