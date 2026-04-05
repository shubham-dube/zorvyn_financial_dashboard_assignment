export interface DashboardSummary {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  recordCount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface TrendDataPoint {
  date: string;
  income: string;
  expense: string;
  balance: string;
}

export interface TrendData {
  period: 'daily' | 'weekly' | 'monthly';
  data: TrendDataPoint[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  total: string;
  percentage: number;
  recordCount: number;
}

export interface CategoryBreakdownResponse {
  type: 'INCOME' | 'EXPENSE';
  totalAmount: string;
  categories: CategoryBreakdown[];
}

export interface RecentActivity {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  category: {
    id: string;
    name: string;
  };
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface FinancialInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  metric?: string;
}

export interface DashboardInsights {
  savingsRate: number;
  averageMonthlyIncome: string;
  averageMonthlyExpense: string;
  topExpenseCategory: {
    name: string;
    amount: string;
    percentage: number;
  } | null;
  topIncomeCategory: {
    name: string;
    amount: string;
    percentage: number;
  } | null;
  insights: FinancialInsight[];
}
