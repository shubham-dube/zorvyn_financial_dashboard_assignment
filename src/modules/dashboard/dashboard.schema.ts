import { z } from 'zod';
import { isValidDate } from '../../lib/dateUtils.js';

export const DashboardPeriodSchema = z
  .object({
    startDate: z.string().refine(isValidDate, 'Invalid date format (expected YYYY-MM-DD)'),
    endDate: z.string().refine(isValidDate, 'Invalid date format (expected YYYY-MM-DD)'),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'startDate must be before or equal to endDate',
  });

export const TrendQuerySchema = z.object({
  startDate: z.string().refine(isValidDate, 'Invalid date format'),
  endDate: z.string().refine(isValidDate, 'Invalid date format'),
  period: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
});

export const CategoryBreakdownQuerySchema = z.object({
  startDate: z.string().refine(isValidDate, 'Invalid date format').optional(),
  endDate: z.string().refine(isValidDate, 'Invalid date format').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

export const RecentActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type DashboardPeriodInput = z.infer<typeof DashboardPeriodSchema>;
export type TrendQuery = z.infer<typeof TrendQuerySchema>;
export type CategoryBreakdownQuery = z.infer<typeof CategoryBreakdownQuerySchema>;
export type RecentActivityQuery = z.infer<typeof RecentActivityQuerySchema>;
