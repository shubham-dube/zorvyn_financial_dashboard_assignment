import { z } from 'zod';
import { CONSTANTS } from '../../config/constants.js';

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(CONSTANTS.MAX_CATEGORY_NAME_LENGTH),
  type: z.enum(['INCOME', 'EXPENSE']),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(CONSTANTS.MAX_CATEGORY_NAME_LENGTH).optional(),
});

export const ListCategoriesQuerySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof ListCategoriesQuerySchema>;
