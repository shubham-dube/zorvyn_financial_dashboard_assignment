import { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from './dashboard.service.js';
import {
  DashboardPeriodInput,
  TrendQuery,
  CategoryBreakdownQuery,
  RecentActivityQuery,
} from './dashboard.schema.js';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as DashboardPeriodInput;
    const summary = await this.dashboardService.getSummary(query, request.user);
    return reply.send(summary);
  }

  async getTrends(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as TrendQuery;
    const trends = await this.dashboardService.getTrends(query, request.user);
    return reply.send(trends);
  }

  async getCategoryBreakdown(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as CategoryBreakdownQuery;
    const breakdown = await this.dashboardService.getCategoryBreakdown(query, request.user);
    return reply.send(breakdown);
  }

  async getRecentActivity(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as RecentActivityQuery;
    const activity = await this.dashboardService.getRecentActivity(query, request.user);
    return reply.send(activity);
  }

  async getInsights(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const insights = await this.dashboardService.getInsights(request.user);
    return reply.send(insights);
  }
}
