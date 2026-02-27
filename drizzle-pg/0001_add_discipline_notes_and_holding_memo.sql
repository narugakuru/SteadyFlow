-- Custom SQL migration file, put your code below! --
ALTER TABLE "holdings" ADD COLUMN "memo" text;
--> statement-breakpoint
CREATE TABLE "discipline_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"quote" text NOT NULL,
	"plan" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discipline_notes" ADD CONSTRAINT "discipline_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "discipline_notes_user_updated_at_idx" ON "discipline_notes" USING btree ("user_id","updated_at");
