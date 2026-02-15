"use server";

import { revalidatePath } from "next/cache";
import { Barretenberg } from "@aztec/bb.js";
import { poseidon2HashString, fieldToBigint } from "@repo/circuit-utils";
import { createRateLimitedActionClient } from "@/lib/safe-action";
import { RATE_LIMITS } from "@/services/rate-limit";
import { createClaimSchema } from "@/validations/claim";
import { dateToTimestamp } from "@/utils/date.utils";
import { createClaim } from "@/db/queries/claims";
import { getTransfersByConstraints } from "@/db/queries/transfers";
import {
  buildTransfersMerkleTree,
  mapDbTransferToHashInput,
} from "@/lib/proof.server";

export const createClaimAction = createRateLimitedActionClient('createClaim', RATE_LIMITS.CREATE_CLAIM)
  .inputSchema(createClaimSchema)
  .action(async ({ parsedInput }) => {
    const api = await Barretenberg.new({ threads: 1 });
    const messageHashBytes = await poseidon2HashString(
      api,
      parsedInput.claimMessage,
    );
    const messageHash = "0x" + fieldToBigint(messageHashBytes).toString(16);

    const fromBlockTimestamp = dateToTimestamp(parsedInput.fromDate);
    const toBlockTimestamp = dateToTimestamp(parsedInput.toDate);

    const storedTransfers = await getTransfersByConstraints({
      chainId: parsedInput.chainId,
      tokenAddress: parsedInput.tokenAddress,
      recipientAddress: parsedInput.recipientAddress,
      fromTimestamp: fromBlockTimestamp || undefined,
      toTimestamp: toBlockTimestamp || undefined,
    });

    if (!storedTransfers.length) {
      throw new Error("No transfers found — fetch transfers first");
    }

    const { merkleRoot } = await buildTransfersMerkleTree(
      api,
      storedTransfers.map(mapDbTransferToHashInput),
    );

    const claim = await createClaim({
      message: parsedInput.claimMessage,
      messageHash,
      tokenAddress: parsedInput.tokenAddress,
      recipientAddress: parsedInput.recipientAddress,
      minTransfersSum: parsedInput.minTransfersSum,
      maxTransfersSum: parsedInput.maxTransfersSum,
      fromBlockTimestamp,
      toBlockTimestamp,
      chainId: parsedInput.chainId,
      merkleRoot,
    });

    revalidatePath("/");

    return { claimId: claim.id };
  });
