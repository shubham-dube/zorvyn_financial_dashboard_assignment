import { z } from 'zod';
import { CONSTANTS } from '../../config/constants.js';
import { isValidDateString, isFutureDate } from '../../lib/dateUtils.js';

export const CreateRecordSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(CONSTANTS.MAX_AMOUNT, 'Amount exceeds maximum allowed value')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid('Invalid category ID'),
  date: z
    .string()
    .refine((val) => isValidDateString(val), {
      message: 'Date must be in YYYY-MM-DD format',
    })
    .refine((val) => !isFutureDate(val, CONSTANTS.MAX_FUTURE_DAYS), {
      message: `Date cannot be more than ${CONSTANTS.MAX_FUTURE_DAYS} days in the future`,
    }),
  notes: z.string().max(CONSTANTS.MAX_NOTES_LENGTH, 'Notes too long').optional(),
});

export const UpdateRecordSchema = z.object({
  amount: z.number().positive().max(CONSTANTS.MAX_AMOUNT).multipleOf(0.01).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().uuid().optional(),
  date: z
    .string()
    .refine((val) => isValidDateString(val), {
      message: 'Date must be in YYYY-MM-DD format',
    })
    .refine((val) => !isFutureDate(val, CONSTANTS.MAX_FUTURE_DAYS), {
      message: `Date cannot be more than ${CONSTANTS.MAX_FUTURE_DAYS} days in the future`,
    })
    .optional(),
  notes: z.string().max(CONSTANTS.MAX_NOTES_LENGTH).optional(),
});

export const ListRecordsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || isValidDateString(val), { message: 'Invalid start date format' }),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || isValidDateString(val), { message: 'Invalid end date format' }),
  minAmount: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  maxAmount: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  createdById: z.string().uuid().optional(),
  includeDeleted: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type CreateRecordInput = z.infer<typeof CreateRecordSchema>;
export type UpdateRecordInput = z.infer<typeof UpdateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof ListRecordsQuerySchema>;
