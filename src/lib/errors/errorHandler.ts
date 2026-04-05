import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './AppError.js';

/**
 * RFC 7807 Problem Details for HTTP APIs
 * Standard error response format
 */
interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: unknown;
  timestamp: string;
}

/**
 * Lightweight shape for Prisma known request errors.
 */
interface PrismaKnownRequestErrorLike {
  code: string;
  meta?: Record<string, unknown>;
}

/**
 * Global error handler for Fastify
 * Converts all errors to RFC 7807 format
 * Never leaks internal details in production
 */
function isPrismaKnownRequestError(error: unknown): error is PrismaKnownRequestErrorLike {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: unknown };
  return typeof maybeError.code === 'string' && /^P\d{4}$/.test(maybeError.code);
}

function hasFastifyValidation(error: unknown): error is FastifyError & { validation: unknown } {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { validation?: unknown };
  return typeof maybeError.validation !== 'undefined';
}

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error with full details (for debugging)
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });

  let errorResponse: ErrorResponse;

  // Handle AppError (our custom errors)
  if (error instanceof AppError) {
    errorResponse = {
      type: `https://httpstatuses.com/${error.statusCode}`,
      title: error.constructor.name.replace('Error', ' Error'),
      status: error.statusCode,
      detail: error.message,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    // Include validation errors if present
    if (error instanceof ValidationError && error.errors) {
      errorResponse.errors = error.errors;
    }

    return reply.code(error.statusCode).send(errorResponse);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    errorResponse = {
      type: 'https://httpstatuses.com/422',
      title: 'Validation Error',
      status: 422,
      detail: 'Request validation failed',
      instance: request.url,
      errors: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
      timestamp: new Date().toISOString(),
    };

    return reply.code(422).send(errorResponse);
  }

  // Handle Prisma errors
  if (isPrismaKnownRequestError(error)) {
    const status = getPrismaErrorStatus(error.code);
    const message = getPrismaErrorMessage(error.code, error.meta);

    errorResponse = {
      type: `https://httpstatuses.com/${status}`,
      title: 'Database Error',
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    return reply.code(status).send(errorResponse);
  }

  // Handle Fastify validation errors
  if (hasFastifyValidation(error)) {
    errorResponse = {
      type: 'https://httpstatuses.com/400',
      title: 'Bad Request',
      status: 400,
      detail: error.message || 'Invalid request data',
      instance: request.url,
      errors: error.validation,
      timestamp: new Date().toISOString(),
    };

    return reply.code(400).send(errorResponse);
  }

  // Handle all other errors (500 Internal Server Error)
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  errorResponse = {
    type: 'https://httpstatuses.com/500',
    title: 'Internal Server Error',
    status: 500,
    detail: isDevelopment ? error.message : 'An unexpected error occurred. Please try again later.',
    instance: request.url,
    timestamp: new Date().toISOString(),
  };

  // Only include stack trace in development
  if (isDevelopment && typeof error.stack === 'string') {
    (errorResponse as ErrorResponse & { stack?: string }).stack = error.stack;
  }

  return reply.code(500).send(errorResponse);
}

export default errorHandler;

/**
 * Map Prisma error codes to HTTP status codes
 */
function getPrismaErrorStatus(code: string): number {
  const errorMap: Record<string, number> = {
    P2002: 409, // Unique constraint violation
    P2003: 400, // Foreign key constraint violation
    P2025: 404, // Record not found
    P2014: 400, // Invalid ID
    P2015: 404, // Related record not found
    P2018: 400, // Required connected records not found
    P2019: 400, // Input error
    P2020: 400, // Value out of range
  };

  return errorMap[code] || 500;
}

/**
 * Convert Prisma error codes to user-friendly messages
 */
function getPrismaErrorMessage(code: string, meta?: Record<string, unknown>): string {
  switch (code) {
    case 'P2002':
      const targetValue = meta?.['target'];
      const target = Array.isArray(targetValue) ? targetValue.join(', ') : 'field';
      return `A record with this ${target} already exists`;

    case 'P2003':
      return 'Invalid reference to related record';

    case 'P2025':
      return 'Record not found';

    case 'P2014':
      return 'Invalid ID provided';

    case 'P2015':
      return 'Related record not found';

    case 'P2018':
      return 'Required connected records not found';

    case 'P2019':
      return 'Input error';

    case 'P2020':
      return 'Value out of range for the field type';

    default:
      return 'A database error occurred';
  }
}
