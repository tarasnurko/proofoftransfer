CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"message_hash" varchar(78) NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"recipient_address" varchar(42) NOT NULL,
	"min_transfers_sum" varchar(78) DEFAULT '0' NOT NULL,
	"max_transfers_sum" varchar(78) DEFAULT '0' NOT NULL,
	"from_block_timestamp" bigint DEFAULT 0 NOT NULL,
	"to_block_timestamp" bigint DEFAULT 0 NOT NULL,
	"chain_id" integer NOT NULL,
	"creator_address" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"verifier_address" varchar(42),
	"is_valid" boolean NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"nullifier" varchar(78) NOT NULL,
	"proof_data" text NOT NULL,
	"public_inputs" jsonb NOT NULL,
	"transfers_root_hash" varchar(78) NOT NULL,
	"prover_address" varchar(42),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claim_nullifier_unique" UNIQUE("claim_id","nullifier")
);
--> statement-breakpoint
ALTER TABLE "proof_verifications" ADD CONSTRAINT "proof_verifications_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_hash_idx" ON "claims" USING btree ("message_hash");--> statement-breakpoint
CREATE INDEX "token_recipient_chain_idx" ON "claims" USING btree ("token_address","recipient_address","chain_id");--> statement-breakpoint
CREATE INDEX "creator_idx" ON "claims" USING btree ("creator_address");--> statement-breakpoint
CREATE INDEX "proof_id_idx" ON "proof_verifications" USING btree ("proof_id");--> statement-breakpoint
CREATE INDEX "is_valid_idx" ON "proof_verifications" USING btree ("is_valid");--> statement-breakpoint
CREATE INDEX "claim_id_idx" ON "proofs" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "nullifier_idx" ON "proofs" USING btree ("nullifier");--> statement-breakpoint
CREATE INDEX "prover_address_idx" ON "proofs" USING btree ("prover_address");