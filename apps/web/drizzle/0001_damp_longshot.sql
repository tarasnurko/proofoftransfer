CREATE TABLE "ens_cache" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"name" text,
	"expiresAt" timestamp,
	"resolvedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ens_cache_name_idx" ON "ens_cache" USING btree ("name");