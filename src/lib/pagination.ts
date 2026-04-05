import { CONSTANTS } from '../config/constants.js';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function parsePagination(options: PaginationOptions = {}): PaginationResult {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(
    CONSTANTS.PAGINATION.MAX_LIMIT,
    Math.max(1, options.limit || CONSTANTS.PAGINATION.DEFAULT_LIMIT)
  );

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}
