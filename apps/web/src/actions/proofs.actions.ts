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
} from "@/db/queries/verifications";
import type { InsertProofEntity } from "@/db/index.types";
import { verifyProofServer } from "@/lib/proof.server";

const externalTransferSchema = z.object({
  from: z.string(),
  to: z.string(),
  contractAddress: z.string(),
  value: z.string(),
  timeStamp: z.string(),
});

const verifyProofSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
  nullifier: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid nullifier format"),
  transfers: z.array(externalTransferSchema).min(1, "Transfers are required"),
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
    };

    const result = await createProof(proofData);

    revalidatePath(`/claims/${parsedInput.claimId}`);
    revalidatePath("/");

    return { proofId: result.id };
  });

export const verifyProofAction = createRateLimitedActionClient('verifyProof', RATE_LIMITS.VERIFY_PROOF)
  .inputSchema(verifyProofSchema)
  .action(async ({ parsedInput: { id: proofId, nullifier, transfers } }) => {
    const proof = await getProofById(proofId);

    if (!proof) {
      throw new Error("Proof not found");
    }

    if (!proof.claim?.merkleRoot) {
      throw new Error("Claim merkle root not found");
    }

    if (proof.nullifier === nullifier) {
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
      claimId: proof.claimId,
      transfersRootHash: proof.claim.merkleRoot,
      externalTransfers: transfers,
    });

    const isValid = verification.isValid;
    const errorMessage = verification.error;

    try {
      await deleteFailedVerificationsByNullifier({ proofId, nullifier });
      await createVerification({
        proofId,
        verifierNullifier: nullifier,
        isValid,
        errorMessage: errorMessage || null,
      });
    } catch (error) {
      console.error("verification recording failed:", error);
    }

    return { isValid, error: errorMessage };
  });
