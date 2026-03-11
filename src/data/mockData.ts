export const mrrData = [
  { month: 'Jan', mrr: 120000, new: 15000, expansion: 5000, churn: -2000 },
  { month: 'Feb', mrr: 135000, new: 18000, expansion: 6000, churn: -2500 },
  { month: 'Mar', mrr: 152000, new: 22000, expansion: 7000, churn: -3000 },
  { month: 'Apr', mrr: 175000, new: 28000, expansion: 8000, churn: -3500 },
  { month: 'May', mrr: 198000, new: 30000, expansion: 9000, churn: -4000 },
  { month: 'Jun', mrr: 225000, new: 35000, expansion: 10000, churn: -4500 },
];

export const userGrowth = [
  { date: '03-01', activeUsers: 12500, newSignups: 450 },
  { date: '03-02', activeUsers: 12800, newSignups: 520 },
  { date: '03-03', activeUsers: 13100, newSignups: 480 },
  { date: '03-04', activeUsers: 13500, newSignups: 610 },
  { date: '03-05', activeUsers: 14000, newSignups: 750 },
  { date: '03-06', activeUsers: 14600, newSignups: 820 },
  { date: '03-07', activeUsers: 15200, newSignups: 900 },
];

export const churnData = [
  { month: 'Jan', rate: 2.1 },
  { month: 'Feb', rate: 1.9 },
  { month: 'Mar', rate: 2.0 },
  { month: 'Apr', rate: 1.8 },
  { month: 'May', rate: 1.5 },
  { month: 'Jun', rate: 1.2 },
];

export const planDistribution = [
  { name: 'Basic', users: 8500, value: 45 },
  { name: 'Pro', users: 4200, value: 35 },
  { name: 'Enterprise', users: 1500, value: 20 },
];

export const getContextForGemini = () => {
  return `
    SaaS Platform Metrics Context:
    - MRR (Monthly Recurring Revenue): Grew from $120k in Jan to $225k in Jun.
    - Active Users: Reached 15,200 as of early March, with daily signups trending up to 900/day.
    - Churn Rate: Decreased from 2.1% in Jan to 1.2% in Jun.
    - Plan Distribution: Basic (8,500 users), Pro (4,200 users), Enterprise (1,500 users).
    - Recent Trend: Strong growth in new MRR and expansion MRR, while churn rate is steadily declining.
  `;
};
