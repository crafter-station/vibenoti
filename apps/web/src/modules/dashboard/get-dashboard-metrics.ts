import { db, event } from "db";
import { and, countDistinct, eq, gte, sql } from "drizzle-orm";
import type { DashboardMetrics } from "./dashboard.types";

const PERIOD_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function getDashboardMetrics(
  userId: string,
): Promise<DashboardMetrics> {
  const start = new Date(Date.now() - PERIOD_DAYS * DAY_IN_MS);
  const [metrics] = await db
    .select({
      completedTasks: sql<number>`count(*) filter (where ${event.eventType} = 'assistant.completed')`,
      activeSessions: countDistinct(event.sessionId),
      attentionEvents: sql<number>`count(*) filter (where ${event.eventType} in ('question.asked', 'permission.asked', 'session.error', 'tool.failed'))`,
    })
    .from(event)
    .where(and(eq(event.userId, userId), gte(event.occurredAt, start)));

  return {
    completedTasks: Number(metrics?.completedTasks ?? 0),
    activeSessions: Number(metrics?.activeSessions ?? 0),
    attentionEvents: Number(metrics?.attentionEvents ?? 0),
  };
}
