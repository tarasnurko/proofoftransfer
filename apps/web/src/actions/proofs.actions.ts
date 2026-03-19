"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { returnValidationErrors } from "next-safe-action";
import { createRateLimitedActionClient } from "@/lib/safe-action";
import { RATE_LIMITS } from "@/services/rate-limit";
import { submitProofSchema } from "@/validations/proof";
import { getClaimById } from "@/db/queries/claims";
import {
  createProof,
  checkNullifierExists,
  getProofById,
} from "@/db/queries/proofs";
import {
  createVerification,
  getSuccessfulVerificationByNullifier,
  deleteFailedVerificationsByNullifier,
  getVerificationStats,
} from "@/db/queries/verifications";
import type { InsertProofEntity } from "@/db/index.types";
import { db } from "@/db/client";
import { verifyProofServer } from "@/lib/proof.server";
import { PUBLIC_INPUT_INDEX } from "@repo/circuit-utils";

const verifyProofSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
  nullifier: z.string().regex(/^0x[a-fA-F0-9]{1,64}$/, "Invalid nullifier format").transform(v => v.toLowerCase()),
  merkleRoot: z.string().min(1, "Merkle root is required"),
});

export const submitProofAction = createRateLimitedActionClient('submitProof', RATE_LIMITS.SUBMIT_PROOF)
  .inputSchema(submitProofSchema)
  .action(async ({ parsedInput }) => {
    const claim = await getClaimById(parsedInput.claimId);
    if (!claim) {
      return returnValidationErrors(submitProofSchema, {
        claimId: { _errors: ["Claim not found"] },
      });
    }

    const proofMerkleRoot = parsedInput.publicInputs[PUBLIC_INPUT_INDEX.TRANSFERS_ROOT_HASH];
    if (!proofMerkleRoot || BigInt(proofMerkleRoot) !== BigInt(claim.merkleRoot)) {
      return returnValidationErrors(submitProofSchema, {
        publicInputs: { _errors: ["Proof does not match this claim"] },
      });
    }

    const nullifierExists = await checkNullifierExists({
      claimId: parsedInput.claimId,
      nullifier: parsedInput.nullifier,
    });

    if (nullifierExists) {
      return returnValidationErrors(submitProofSchema, {
        nullifier: {
          _errors: ["This proof has already been submitted for this claim"],
        },
      });
    }

    const proofData: InsertProofEntity = {
      claimId: parsedInput.claimId,
      nullifier: parsedInput.nullifier,
      proofData: parsedInput.proofData,
      publicInputs: parsedInput.publicInputs,
      message: parsedInput.message ?? null,
    };

    const result = await createProof(proofData);

    revalidatePath(`/claims/${parsedInput.claimId}`);
    revalidatePath("/");

    return { proofId: result.id };
  });

/**
 * Verify a proof as a third-party verifier.
 *
 * Verification counting rules (per nullifier per proof):
 * - Each user gets at most ONE verification record at a time
 * - First failure: failed count +1
 * - Retry failure (same user): old failure deleted, new created — count unchanged
 * - Success after failure: old failure deleted, success created — failed -1, successful +1
 * - Already succeeded: blocked, cannot re-verify
 *
 * The client builds a merkle root from their transfers and sends it.
 * The server compares roots and runs the ZK verifier.
 * Updated stats are returned so the UI reflects the current state.
 */
export const verifyProofAction = createRateLimitedActionClient('verifyProof', RATE_LIMITS.VERIFY_PROOF)
  .inputSchema(verifyProofSchema)
  .action(async ({ parsedInput: { id: proofId, nullifier, merkleRoot: verifierMerkleRoot } }) => {
    const proof = await getProofById(proofId);

    if (!proof) {
      throw new Error("Proof not found");
    }

    if (!proof.claim?.merkleRoot) {
      throw new Error("Claim merkle root not found");
    }

    if (proof.nullifier.toLowerCase() === nullifier.toLowerCase()) {
      throw new Error("Cannot verify your own proof");
    }

    const existingSuccess = await getSuccessfulVerificationByNullifier({
      proofId,
      nullifier,
    });
    if (existingSuccess) {
      throw new Error("You have already verified this proof");
    }

    const verification = await verifyProofServer({
      proofData: proof.proofData,
      publicInputs: proof.publicInputs as string[],
      transfersRootHash: proof.claim.merkleRoot,
      verifierMerkleRoot,
    });

    const isValid = verification.isValid;
    const errorMessage = verification.error;

    await db.transaction(async (tx) => {
      await deleteFailedVerificationsByNullifier({ proofId, nullifier }, tx);
      await createVerification({
        proofId,
        verifierNullifier: nullifier,
        isValid,
        errorMessage: errorMessage || null,
      }, tx);
    });

    const stats = await getVerificationStats(proofId);

    return { isValid, error: errorMessage, stats };
  });