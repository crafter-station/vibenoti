export interface DashboardMetrics {
  completedTasks: number;
  activeSessions: number;
  attentionEvents: number;
}

export interface DashboardActivityPoint extends Record<string, unknown> {
  date: string;
  completedTasks: number;
  attentionEvents: number;
}
