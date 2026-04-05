import { z } from 'zod';
import { isValidDate } from '../../lib/dateUtils.js';

export const AuditQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().refine(isValidDate, 'Invalid date format (expected YYYY-MM-DD)').optional(),
  endDate: z.string().refine(isValidDate, 'Invalid date format (expected YYYY-MM-DD)').optional(),
  sortBy: z.enum(['timestamp', 'action', 'resource']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;
