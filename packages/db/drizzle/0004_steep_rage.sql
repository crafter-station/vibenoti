CREATE TABLE "slack_integration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slack_user_id" varchar(32) NOT NULL,
	"dm_channel_id" varchar(32),
	"enabled" boolean DEFAULT true NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slack_integration" ADD CONSTRAINT "slack_integration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slack_integration_userId_uidx" ON "slack_integration" USING btree ("user_id");