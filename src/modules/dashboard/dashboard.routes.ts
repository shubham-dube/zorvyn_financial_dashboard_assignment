import { FastifyInstance } from 'fastify';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import {
  DashboardPeriodSchema,
  TrendQuerySchema,
  CategoryBreakdownQuerySchema,
  RecentActivityQuerySchema,
} from './dashboard.schema.js';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardService = new DashboardService(fastify.prisma);
  const dashboardController = new DashboardController(dashboardService);

  // Get dashboard summary
  fastify.get(
    '/summary',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Dashboard'],
        description: 'Get financial summary for a date range',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              totalIncome: { type: 'string' },
              totalExpense: { type: 'string' },
              balance: { type: 'string' },
              recordCount: { type: 'number' },
              period: {
                type: 'object',
                properties: {
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.query = DashboardPeriodSchema.parse(request.query);
      },
    },
    dashboardController.getSummary.bind(dashboardController)
  );

  // Get trends
  fastify.get(
    '/trends',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Dashboard'],
        description: 'Get income/expense trends over time',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    income: { type: 'string' },
                    expense: { type: 'string' },
                    balance: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.query = TrendQuerySchema.parse(request.query);
      },
    },
    dashboardController.getTrends.bind(dashboardController)
  );

  // Get category breakdown
  fastify.get(
    '/categories',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Dashboard'],
        description: 'Get spending/income breakdown by category',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                totalAmount: { type: 'string' },
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      categoryId: { type: 'string' },
                      categoryName: { type: 'string' },
                      type: { type: 'string' },
                      total: { type: 'string' },
                      percentage: { type: 'number' },
                      recordCount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.query = CategoryBreakdownQuerySchema.parse(request.query);
      },
    },
    dashboardController.getCategoryBreakdown.bind(dashboardController)
  );

  // Get recent activity
  fastify.get(
    '/recent',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Dashboard'],
        description: 'Get recent financial records',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'string' },
                type: { type: 'string' },
                category: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                date: { type: 'string' },
                notes: { type: ['string', 'null'] },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
      preValidation: async (request) => {
        request.query = RecentActivityQuerySchema.parse(request.query);
      },
    },
    dashboardController.getRecentActivity.bind(dashboardController)
  );

  // Get insights
  fastify.get(
    '/insights',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Dashboard'],
        description: 'Get financial insights and recommendations',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              savingsRate: { type: 'number' },
              averageMonthlyIncome: { type: 'string' },
              averageMonthlyExpense: { type: 'string' },
              topExpenseCategory: {
                type: ['object', 'null'],
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'string' },
                  percentage: { type: 'number' },
                },
              },
              topIncomeCategory: {
                type: ['object', 'null'],
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'string' },
                  percentage: { type: 'number' },
                },
              },
              insights: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    title: { type: 'string' },
                    message: { type: 'string' },
                    metric: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    dashboardController.getInsights.bind(dashboardController)
  );
}
