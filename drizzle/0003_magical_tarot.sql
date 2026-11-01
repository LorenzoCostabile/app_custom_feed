ALTER TABLE "sources" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "max_items_per_edition" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "weight" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_accounts" ADD COLUMN "cookie_encrypted" text;