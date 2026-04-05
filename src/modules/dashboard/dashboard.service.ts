import { PrismaClient, Prisma } from '@prisma/client';
import { DashboardRepository } from './dashboard.repository.js';
import {
  DashboardPeriodInput,
  TrendQuery,
  CategoryBreakdownQuery,
  RecentActivityQuery,
} from './dashboard.schema.js';
import {
  DashboardSummary,
  TrendData,
  CategoryBreakdownResponse,
  RecentActivity,
  DashboardInsights,
  FinancialInsight,
} from './dashboard.types.js';
import { RequestUser, RecordType } from '../../types/common.types.js';
import { cacheStore } from '../../lib/redis/cacheStore.js';
import { CONSTANTS } from '../../config/constants.js';
import { formatDate } from '../../lib/dateUtils.js';

export class DashboardService {
  private repository: DashboardRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new DashboardRepository(prisma);
  }

  async getSummary(
    query: DashboardPeriodInput,
    currentUser: RequestUser
  ): Promise<DashboardSummary> {
    const cacheKey = `dashboard:summary:${currentUser.id}:${query.startDate}:${query.endDate}`;
    const cached = await cacheStore.get<DashboardSummary>(cacheKey);

    if (cached) {
      return cached;
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const result = await this.repository.getSummary(
      startDate,
      endDate,
      currentUser.id,
      currentUser.role
    );

    const balance = result.totalIncome.minus(result.totalExpense);

    const summary: DashboardSummary = {
      totalIncome: result.totalIncome.toString(),
      totalExpense: result.totalExpense.toString(),
      balance: balance.toString(),
      recordCount: result.recordCount,
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
    };

    // Cache for 5 minutes
    await cacheStore.set(cacheKey, summary, CONSTANTS.CACHE_TTL.DASHBOARD);

    return summary;
  }

  async getTrends(query: TrendQuery, currentUser: RequestUser): Promise<TrendData> {
    const cacheKey = `dashboard:trends:${currentUser.id}:${query.startDate}:${query.endDate}:${query.period}`;
    const cached = await cacheStore.get<TrendData>(cacheKey);

    if (cached) {
      return cached;
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const results = await this.repository.getTrends(
      startDate,
      endDate,
      query.period,
      currentUser.id,
      currentUser.role
    );

    const data: TrendData = {
      period: query.period,
      data: results.map((row) => {
        const balance = row.income.minus(row.expense);
        return {
          date: formatDate(row.date),
          income: row.income.toString(),
          expense: row.expense.toString(),
          balance: balance.toString(),
        };
      }),
    };

    // Cache for 10 minutes
    await cacheStore.set(cacheKey, data, CONSTANTS.CACHE_TTL.DASHBOARD);

    return data;
  }

  async getCategoryBreakdown(
    query: CategoryBreakdownQuery,
    currentUser: RequestUser
  ): Promise<CategoryBreakdownResponse[]> {
    const cacheKey = `dashboard:categories:${currentUser.id}:${query.startDate || 'all'}:${query.endDate || 'all'}:${query.type || 'all'}`;
    const cached = await cacheStore.get<CategoryBreakdownResponse[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : null;

    const results = await this.repository.getCategoryBreakdown(
      startDate,
      endDate,
      query.type || null,
      currentUser.id,
      currentUser.role
    );

    // Group by type (INCOME / EXPENSE)
    const grouped = new Map<string, typeof results>();
    results.forEach((item) => {
      const existing = grouped.get(item.type) || [];
      existing.push(item);
      grouped.set(item.type, existing);
    });

    const response: CategoryBreakdownResponse[] = [];

    for (const [type, items] of grouped) {
      const totalAmount = items.reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0));

      const categories = items.map((item) => {
        const percentage =
          totalAmount.toNumber() > 0 ? (item.total.toNumber() / totalAmount.toNumber()) * 100 : 0;

        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          type: item.type as RecordType,
          total: item.total.toString(),
          percentage: Math.round(percentage * 100) / 100, // 2 decimal places
          recordCount: item.recordCount,
        };
      });

      response.push({
        type: type as RecordType,
        totalAmount: totalAmount.toString(),
        categories,
      });
    }

    // Cache for 10 minutes
    await cacheStore.set(cacheKey, response, CONSTANTS.CACHE_TTL.DASHBOARD);

    return response;
  }

  async getRecentActivity(
    query: RecentActivityQuery,
    currentUser: RequestUser
  ): Promise<RecentActivity[]> {
    const cacheKey = `dashboard:recent:${currentUser.id}:${query.limit}`;
    const cached = await cacheStore.get<RecentActivity[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const records = await this.repository.getRecentActivity(
      query.limit,
      currentUser.id,
      currentUser.role
    );

    const activities: RecentActivity[] = records.map((record) => ({
      id: record.id,
      amount: record.amount.toString(),
      type: record.type as RecordType,
      category: {
        id: record.category.id,
        name: record.category.name,
      },
      date: formatDate(record.date),
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
    }));

    // Cache for 5 minutes
    await cacheStore.set(cacheKey, activities, CONSTANTS.CACHE_TTL.DASHBOARD);

    return activities;
  }

  async getInsights(currentUser: RequestUser): Promise<DashboardInsights> {
    const cacheKey = `dashboard:insights:${currentUser.id}`;
    const cached = await cacheStore.get<DashboardInsights>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get monthly averages
    const averages = await this.repository.getMonthlyAverages(currentUser.id, currentUser.role);

    // Get category breakdown for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();

    const categoryData = await this.repository.getCategoryBreakdown(
      thirtyDaysAgo,
      today,
      null,
      currentUser.id,
      currentUser.role
    );

    // Find top categories
    const expenseCategories = categoryData.filter((item) => item.type === 'EXPENSE');
    const incomeCategories = categoryData.filter((item) => item.type === 'INCOME');

    const topExpense = expenseCategories.length > 0 ? expenseCategories[0] : null;
    const topIncome = incomeCategories.length > 0 ? incomeCategories[0] : null;

    // Calculate savings rate
    const avgIncome = averages.avgIncome.toNumber();
    const avgExpense = averages.avgExpense.toNumber();
    const savingsRate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0;

    // Generate insights
    const insights: FinancialInsight[] = [];

    if (savingsRate > 20) {
      insights.push({
        type: 'success',
        title: 'Great Savings Rate!',
        message: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep it up!`,
        metric: `${savingsRate.toFixed(1)}%`,
      });
    } else if (savingsRate > 0) {
      insights.push({
        type: 'info',
        title: 'Room for Improvement',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. Consider reducing expenses to save more.`,
        metric: `${savingsRate.toFixed(1)}%`,
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Spending Exceeds Income',
        message: 'Your expenses are higher than your income. Review your budget carefully.',
      });
    }

    if (topExpense) {
      const expenseTotal = expenseCategories.reduce(
        (sum, cat) => sum.add(new Prisma.Decimal(cat.total)),
        new Prisma.Decimal(0)
      );
      const percentage = new Prisma.Decimal(topExpense.total).div(expenseTotal).toNumber() * 100;

      if (percentage > 40) {
        insights.push({
          type: 'warning',
          title: 'High Category Concentration',
          message: `${topExpense.categoryName} accounts for ${percentage.toFixed(1)}% of your expenses.`,
          metric: `${percentage.toFixed(1)}%`,
        });
      }
    }

    const result: DashboardInsights = {
      savingsRate: Math.round(savingsRate * 100) / 100,
      averageMonthlyIncome: averages.avgIncome.toString(),
      averageMonthlyExpense: averages.avgExpense.toString(),
      topExpenseCategory: topExpense
        ? {
            name: topExpense.categoryName,
            amount: topExpense.total.toString(),
            percentage:
              (new Prisma.Decimal(topExpense.total)
                .div(
                  expenseCategories.reduce(
                    (sum, cat) => sum.add(new Prisma.Decimal(cat.total)),
                    new Prisma.Decimal(0)
                  )
                )
                .toNumber() || 0) * 100,
          }
        : null,
      topIncomeCategory: topIncome
        ? {
            name: topIncome.categoryName,
            amount: topIncome.total.toString(),
            percentage:
              (new Prisma.Decimal(topIncome.total)
                .div(
                  incomeCategories.reduce(
                    (sum, cat) => sum.add(new Prisma.Decimal(cat.total)),
                    new Prisma.Decimal(0)
                  )
                )
                .toNumber() || 0) * 100,
          }
        : null,
      insights,
    };

    // Cache for 10 minutes
    await cacheStore.set(cacheKey, result, CONSTANTS.CACHE_TTL.DASHBOARD);

    return result;
  }
}
