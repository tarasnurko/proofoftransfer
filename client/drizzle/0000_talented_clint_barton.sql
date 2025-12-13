CREATE TABLE "proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"recipient" text NOT NULL,
	"token_address" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"min_amount" text NOT NULL,
	"max_amount" text NOT NULL,
	"proof" text NOT NULL,
	"public_inputs" text NOT NULL,
	"global_transfers_root" text NOT NULL,
	"address_commitment" text NOT NULL,
	"message_hash" text NOT NULL,
	"message" text
);
