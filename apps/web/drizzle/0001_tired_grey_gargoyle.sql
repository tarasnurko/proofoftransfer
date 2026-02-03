CREATE TABLE "claim_transfers" (
	"claim_id" uuid NOT NULL,
	"transfer_id" uuid NOT NULL,
	"merkle_leaf_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claim_transfer_pk" UNIQUE("claim_id","transfer_id")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" varchar(42) NOT NULL,
	"chain_id" integer NOT NULL,
	"name" text NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"decimals" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "address_chain_idx" UNIQUE("address","chain_id")
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"log_index" integer NOT NULL,
	"block_number" bigint NOT NULL,
	"block_timestamp" bigint NOT NULL,
	"sender_address" varchar(42) NOT NULL,
	"recipient_address" varchar(42) NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"amount" varchar(78) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transfers_chain_tx_log_idx" UNIQUE("chain_id","tx_hash","log_index")
);
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "merkle_root" varchar(78);--> statement-breakpoint
ALTER TABLE "claim_transfers" ADD CONSTRAINT "claim_transfers_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_transfers" ADD CONSTRAINT "claim_transfers_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_transfers_leaf_idx" ON "claim_transfers" USING btree ("claim_id","merkle_leaf_index");--> statement-breakpoint
CREATE INDEX "transfers_recipient_token_idx" ON "transfers" USING btree ("recipient_address","token_address","chain_id");--> statement-breakpoint
CREATE INDEX "transfers_timestamp_idx" ON "transfers" USING btree ("block_timestamp");