import { PrismaClient, Prisma } from '@prisma/client';
import { Role } from '../../types/common.types.js';

export class DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get summary statistics for a date range
   */
  async getSummary(
    startDate: Date,
    endDate: Date,
    userId: string,
    role: Role
  ): Promise<{
    totalIncome: Prisma.Decimal;
    totalExpense: Prisma.Decimal;
    recordCount: number;
  }> {
    const whereClause: Prisma.FinancialRecordWhereInput = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      isDeleted: false,
      ...(role === Role.ANALYST ? { createdById: userId } : {}),
    };

    const [income, expense, count] = await Promise.all([
      this.prisma.financialRecord.aggregate({
        where: { ...whereClause, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.financialRecord.aggregate({
        where: { ...whereClause, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      this.prisma.financialRecord.count({ where: whereClause }),
    ]);

    return {
      totalIncome: income._sum.amount || new Prisma.Decimal(0),
      totalExpense: expense._sum.amount || new Prisma.Decimal(0),
      recordCount: count,
    };
  }

  /**
   * Get trend data grouped by period (daily, weekly, monthly)
   */
  async getTrends(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly',
    userId: string,
    role: Role
  ): Promise<
    Array<{
      date: Date;
      income: Prisma.Decimal;
      expense: Prisma.Decimal;
    }>
  > {
    const ownershipClause =
      role === Role.ANALYST ? Prisma.sql`AND fr.created_by_id = ${userId}::uuid` : Prisma.empty;

    let groupByClause: Prisma.Sql;
    switch (period) {
      case 'daily':
        groupByClause = Prisma.sql`DATE(fr.date)`;
        break;
      case 'weekly':
        groupByClause = Prisma.sql`DATE_TRUNC('week', fr.date)`;
        break;
      case 'monthly':
        groupByClause = Prisma.sql`DATE_TRUNC('month', fr.date)`;
        break;
    }

    const results = await this.prisma.$queryRaw<
      Array<{
        period_date: Date;
        income: Prisma.Decimal | null;
        expense: Prisma.Decimal | null;
      }>
    >`
      SELECT 
        ${groupByClause} as period_date,
        COALESCE(SUM(CASE WHEN fr.type = 'INCOME' THEN fr.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN fr.type = 'EXPENSE' THEN fr.amount ELSE 0 END), 0) as expense
      FROM financial_records fr
      WHERE fr.date >= ${startDate}::date
        AND fr.date <= ${endDate}::date
        AND fr.is_deleted = false
        ${ownershipClause}
      GROUP BY ${groupByClause}
      ORDER BY period_date ASC
    `;

    return results.map((row) => ({
      date: row.period_date,
      income: row.income || new Prisma.Decimal(0),
      expense: row.expense || new Prisma.Decimal(0),
    }));
  }

  /**
   * Get category breakdown with totals and percentages
   */
  async getCategoryBreakdown(
    startDate: Date | null,
    endDate: Date | null,
    type: 'INCOME' | 'EXPENSE' | null,
    userId: string,
    role: Role
  ): Promise<
    Array<{
      categoryId: string;
      categoryName: string;
      type: string;
      total: Prisma.Decimal;
      recordCount: number;
    }>
  > {
    const whereClause: Prisma.FinancialRecordWhereInput = {
      isDeleted: false,
      ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
      ...(type ? { type } : {}),
      ...(role === Role.ANALYST ? { createdById: userId } : {}),
    };

    const results = await this.prisma.financialRecord.groupBy({
      by: ['categoryId', 'type'],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    // Fetch category names
    const categoryIds = results.map((r) => r.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return results.map((result) => ({
      categoryId: result.categoryId,
      categoryName: categoryMap.get(result.categoryId) || 'Unknown',
      type: result.type,
      total: result._sum.amount || new Prisma.Decimal(0),
      recordCount: result._count,
    }));
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number, userId: string, role: Role) {
    const whereClause: Prisma.FinancialRecordWhereInput = {
      isDeleted: false,
      ...(role === Role.ANALYST ? { createdById: userId } : {}),
    };

    return this.prisma.financialRecord.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get monthly averages for insights
   */
  async getMonthlyAverages(
    userId: string,
    role: Role
  ): Promise<{
    avgIncome: Prisma.Decimal;
    avgExpense: Prisma.Decimal;
  }> {
    const ownershipClause =
      role === Role.ANALYST ? Prisma.sql`AND fr.created_by_id = ${userId}::uuid` : Prisma.empty;

    // Get averages for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const results = await this.prisma.$queryRaw<
      Array<{
        avg_income: Prisma.Decimal | null;
        avg_expense: Prisma.Decimal | null;
      }>
    >`
      WITH monthly_totals AS (
        SELECT 
          DATE_TRUNC('month', fr.date) as month,
          COALESCE(SUM(CASE WHEN fr.type = 'INCOME' THEN fr.amount ELSE 0 END), 0) as monthly_income,
          COALESCE(SUM(CASE WHEN fr.type = 'EXPENSE' THEN fr.amount ELSE 0 END), 0) as monthly_expense
        FROM financial_records fr
        WHERE fr.date >= ${sixMonthsAgo}::date
          AND fr.is_deleted = false
          ${ownershipClause}
        GROUP BY DATE_TRUNC('month', fr.date)
      )
      SELECT 
        COALESCE(AVG(monthly_income), 0) as avg_income,
        COALESCE(AVG(monthly_expense), 0) as avg_expense
      FROM monthly_totals
    `;

    const result = results[0];
    return {
      avgIncome: result?.avg_income || new Prisma.Decimal(0),
      avgExpense: result?.avg_expense || new Prisma.Decimal(0),
    };
  }
}
