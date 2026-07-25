import { authSchema, db, event } from "db";
import { and, eq, or } from "drizzle-orm";

const DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SEED_API_KEY_ID = "dashboard-seed";
const completedByDay = [4, 7, 5, 9, 6, 12, 10];
const attentionByDay = [1, 2, 1, 3, 2, 1, 3];
const attentionTypes = [
  "question.asked",
  "permission.asked",
  "session.error",
  "tool.failed",
];

const identifier = Bun.argv[2];

if (!identifier) {
  console.error("Usage: bun run seed:dashboard <user-email-or-id>");
  process.exit(1);
}

const [targetUser] = await db
  .select({ id: authSchema.user.id, email: authSchema.user.email })
  .from(authSchema.user)
  .where(
    or(
      eq(authSchema.user.email, identifier),
      eq(authSchema.user.id, identifier),
    ),
  )
  .limit(1);

if (!targetUser) {
  console.error(`User not found: ${identifier}`);
  process.exit(1);
}

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const now = Date.now();
const rows: (typeof event.$inferInsert)[] = [];

for (let dayIndex = 0; dayIndex < DAYS; dayIndex += 1) {
  const day = new Date(today.getTime() - (DAYS - 1 - dayIndex) * DAY_IN_MS);
  const dayKey = day.toISOString().slice(0, 10);
  const completedCount = completedByDay[dayIndex] ?? 0;
  const attentionCount = attentionByDay[dayIndex] ?? 0;
  const totalEvents = completedCount + attentionCount;
  const dayEnd = dayIndex === DAYS - 1 ? now : day.getTime() + DAY_IN_MS - 1;

  function occurredAt(eventIndex: number) {
    const offset =
      ((eventIndex + 1) / (totalEvents + 1)) * (dayEnd - day.getTime());
    return new Date(day.getTime() + offset);
  }

  for (let index = 0; index < completedCount; index += 1) {
    const sessionNumber = index % Math.max(2, Math.ceil(completedCount / 2));

    rows.push({
      userId: targetUser.id,
      apiKeyId: SEED_API_KEY_ID,
      source: "opencode",
      contractVersion: 1,
      externalEventId: crypto.randomUUID(),
      eventType: "assistant.completed",
      occurredAt: occurredAt(index),
      projectId: `seed-project-${(index % 3) + 1}`,
      projectName: `Demo Project ${(index % 3) + 1}`,
      sessionId: `seed-${dayKey}-session-${sessionNumber + 1}`,
      sessionTitle: `Demo session ${sessionNumber + 1}`,
    });
  }

  for (let index = 0; index < attentionCount; index += 1) {
    rows.push({
      userId: targetUser.id,
      apiKeyId: SEED_API_KEY_ID,
      source: "opencode",
      contractVersion: 1,
      externalEventId: crypto.randomUUID(),
      eventType: attentionTypes[index % attentionTypes.length],
      occurredAt: occurredAt(completedCount + index),
      projectId: `seed-project-${(index % 3) + 1}`,
      projectName: `Demo Project ${(index % 3) + 1}`,
      sessionId: `seed-${dayKey}-attention-${index + 1}`,
      sessionTitle: `Attention needed ${index + 1}`,
    });
  }
}

await db.transaction(async (transaction) => {
  await transaction
    .delete(event)
    .where(
      and(eq(event.userId, targetUser.id), eq(event.apiKeyId, SEED_API_KEY_ID)),
    );

  await transaction.insert(event).values(rows);
});

console.info(
  `Seeded ${rows.length} dashboard events for ${targetUser.email} across ${DAYS} days.`,
);
