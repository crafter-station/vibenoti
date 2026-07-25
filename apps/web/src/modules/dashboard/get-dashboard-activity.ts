import { db, event } from "db";
import { and, eq, gte, sql } from "drizzle-orm";
import type { DashboardActivityPoint } from "./dashboard.types";

const DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export async function getDashboardActivity(
  userId: string,
): Promise<DashboardActivityPoint[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (DAYS - 1) * DAY_IN_MS);
  const day = sql<string>`to_char(${event.occurredAt} at time zone 'UTC', 'YYYY-MM-DD')`;

  const rows = await db
    .select({
      day,
      completedTasks: sql<number>`count(*) filter (where ${event.eventType} = 'assistant.completed')`,
      attentionEvents: sql<number>`count(*) filter (where ${event.eventType} in ('question.asked', 'permission.asked', 'session.error', 'tool.failed'))`,
    })
    .from(event)
    .where(and(eq(event.userId, userId), gte(event.occurredAt, start)))
    .groupBy(day);

  const activityByDay = new Map(
    rows.map((row) => [
      row.day,
      {
        completedTasks: Number(row.completedTasks),
        attentionEvents: Number(row.attentionEvents),
      },
    ]),
  );

  return Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_IN_MS);
    const key = date.toISOString().slice(0, 10);
    const activity = activityByDay.get(key);

    return {
      date: dateFormatter.format(date),
      completedTasks: activity?.completedTasks ?? 0,
      attentionEvents: activity?.attentionEvents ?? 0,
    };
  });
}
