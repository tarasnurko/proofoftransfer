CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"messageHash" varchar(78) NOT NULL,
	"tokenAddress" varchar(42) NOT NULL,
	"counterpartyAddress" varchar(42) NOT NULL,
	"isProverSender" boolean NOT NULL,
	"tokenType" varchar(10) NOT NULL,
	"minTransfersSum" varchar(78) DEFAULT '0' NOT NULL,
	"maxTransfersSum" varchar(78) DEFAULT '0' NOT NULL,
	"minTransfersCount" integer DEFAULT 0 NOT NULL,
	"maxTransfersCount" integer DEFAULT 0 NOT NULL,
	"fromBlockTimestamp" bigint DEFAULT 0 NOT NULL,
	"toBlockTimestamp" bigint DEFAULT 0 NOT NULL,
	"chainId" integer NOT NULL,
	"merkleRoot" varchar(78) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ens_cache" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"name" text,
	"expiresAt" timestamp,
	"resolvedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erc1155_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chainId" integer NOT NULL,
	"txHash" varchar(66) NOT NULL,
	"logIndex" integer NOT NULL,
	"blockNumber" bigint NOT NULL,
	"blockTimestamp" bigint NOT NULL,
	"senderAddress" varchar(42) NOT NULL,
	"recipientAddress" varchar(42) NOT NULL,
	"tokenAddress" varchar(42) NOT NULL,
	"tokenId" varchar(78) NOT NULL,
	"amount" varchar(78) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erc1155_transfers_chain_tx_log_idx" UNIQUE("chainId","txHash","logIndex")
);
--> statement-breakpoint
CREATE TABLE "erc20_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chainId" integer NOT NULL,
	"txHash" varchar(66) NOT NULL,
	"logIndex" integer NOT NULL,
	"blockNumber" bigint NOT NULL,
	"blockTimestamp" bigint NOT NULL,
	"senderAddress" varchar(42) NOT NULL,
	"recipientAddress" varchar(42) NOT NULL,
	"tokenAddress" varchar(42) NOT NULL,
	"amount" varchar(78) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erc20_transfers_chain_tx_log_idx" UNIQUE("chainId","txHash","logIndex")
);
--> statement-breakpoint
CREATE TABLE "erc721_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chainId" integer NOT NULL,
	"txHash" varchar(66) NOT NULL,
	"logIndex" integer NOT NULL,
	"blockNumber" bigint NOT NULL,
	"blockTimestamp" bigint NOT NULL,
	"senderAddress" varchar(42) NOT NULL,
	"recipientAddress" varchar(42) NOT NULL,
	"tokenAddress" varchar(42) NOT NULL,
	"tokenId" varchar(78) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erc721_transfers_chain_tx_log_idx" UNIQUE("chainId","txHash","logIndex")
);
--> statement-breakpoint
CREATE TABLE "proof_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proofId" uuid NOT NULL,
	"verifierNullifier" varchar(78),
	"isValid" boolean NOT NULL,
	"verifiedAt" timestamp DEFAULT now() NOT NULL,
	"errorMessage" text
);
--> statement-breakpoint
CREATE TABLE "proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claimId" uuid NOT NULL,
	"nullifier" varchar(78) NOT NULL,
	"proofData" text NOT NULL,
	"publicInputs" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claim_nullifier_unique" UNIQUE("claimId","nullifier")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" varchar(42) NOT NULL,
	"chainId" integer NOT NULL,
	"name" text NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"decimals" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "address_chain_idx" UNIQUE("address","chainId")
);
--> statement-breakpoint
ALTER TABLE "proof_verifications" ADD CONSTRAINT "proof_verifications_proofId_proofs_id_fk" FOREIGN KEY ("proofId") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_claimId_claims_id_fk" FOREIGN KEY ("claimId") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_hash_idx" ON "claims" USING btree ("messageHash");--> statement-breakpoint
CREATE INDEX "token_counterparty_chain_idx" ON "claims" USING btree ("tokenAddress","counterpartyAddress","chainId");--> statement-breakpoint
CREATE INDEX "ens_cache_name_idx" ON "ens_cache" USING btree ("name");--> statement-breakpoint
CREATE INDEX "erc1155_transfers_recipient_token_idx" ON "erc1155_transfers" USING btree ("recipientAddress","tokenAddress","chainId");--> statement-breakpoint
CREATE INDEX "erc1155_transfers_timestamp_idx" ON "erc1155_transfers" USING btree ("blockTimestamp");--> statement-breakpoint
CREATE INDEX "erc20_transfers_recipient_token_idx" ON "erc20_transfers" USING btree ("recipientAddress","tokenAddress","chainId");--> statement-breakpoint
CREATE INDEX "erc20_transfers_timestamp_idx" ON "erc20_transfers" USING btree ("blockTimestamp");--> statement-breakpoint
CREATE INDEX "erc721_transfers_recipient_token_idx" ON "erc721_transfers" USING btree ("recipientAddress","tokenAddress","chainId");--> statement-breakpoint
CREATE INDEX "erc721_transfers_timestamp_idx" ON "erc721_transfers" USING btree ("blockTimestamp");--> statement-breakpoint
CREATE INDEX "proof_id_idx" ON "proof_verifications" USING btree ("proofId");--> statement-breakpoint
CREATE INDEX "is_valid_idx" ON "proof_verifications" USING btree ("isValid");--> statement-breakpoint
CREATE INDEX "proof_verifier_nullifier_idx" ON "proof_verifications" USING btree ("proofId","verifierNullifier");--> statement-breakpoint
CREATE INDEX "claim_id_idx" ON "proofs" USING btree ("claimId");--> statement-breakpoint
CREATE INDEX "nullifier_idx" ON "proofs" USING btree ("nullifier");