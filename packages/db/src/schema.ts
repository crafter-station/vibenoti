import {
  boolean,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const slackIntegration = pgTable(
  "slack_integration",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slackUserId: varchar("slack_user_id", { length: 32 }).notNull(),
    dmChannelId: varchar("dm_channel_id", { length: 32 }),
    enabled: boolean("enabled").default(true).notNull(),
    eventTypes: jsonb("event_types").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("slack_integration_userId_uidx").on(table.userId),
  ],
);

export const event = pgTable(
  "event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").notNull(),
    source: varchar("source", { length: 32 }).notNull(),
    contractVersion: smallint("contract_version").notNull(),
    externalEventId: uuid("external_event_id").notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    projectId: varchar("project_id", { length: 128 }).notNull(),
    projectName: varchar("project_name", { length: 100 }).notNull(),
    sessionId: varchar("session_id", { length: 128 }).notNull(),
    sessionTitle: varchar("session_title", { length: 200 }).notNull(),
  },
  (table) => [
    uniqueIndex("event_user_source_externalEventId_uidx").on(
      table.userId,
      table.source,
      table.externalEventId,
    ),
    index("event_user_receivedAt_id_idx").on(
      table.userId,
      table.receivedAt.desc(),
      table.id.desc(),
    ),
    index("event_receivedAt_idx").on(table.receivedAt),
  ],
);
