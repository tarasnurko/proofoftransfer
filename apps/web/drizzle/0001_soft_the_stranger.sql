DROP INDEX "creator_idx";--> statement-breakpoint
DROP INDEX "prover_address_idx";--> statement-breakpoint
ALTER TABLE "claims" DROP COLUMN "creatorAddress";--> statement-breakpoint
ALTER TABLE "proof_verifications" DROP COLUMN "verifierAddress";--> statement-breakpoint
ALTER TABLE "proofs" DROP COLUMN "transfersRootHash";--> statement-breakpoint
ALTER TABLE "proofs" DROP COLUMN "proverAddress";