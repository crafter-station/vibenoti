CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"source" varchar(32) NOT NULL,
	"contract_version" smallint NOT NULL,
	"external_event_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"project_id" varchar(128) NOT NULL,
	"project_name" varchar(100) NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"session_title" varchar(200) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_user_source_externalEventId_uidx" ON "event" USING btree ("user_id","source","external_event_id");--> statement-breakpoint
CREATE INDEX "event_user_receivedAt_id_idx" ON "event" USING btree ("user_id","received_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "event_receivedAt_idx" ON "event" USING btree ("received_at");