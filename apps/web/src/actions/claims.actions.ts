"use server";

import { revalidatePath } from "next/cache";
import { Barretenberg } from "@aztec/bb.js";
import { poseidon2HashString, fieldToBigint } from "@repo/circuit-utils";
import { createRateLimitedActionClient } from "@/lib/safe-action";
import { RATE_LIMITS } from "@/services/rate-limit";
import { createClaimSchema } from "@/validations/claim";
import { dateToTimestamp } from "@/utils/date.utils";
import { createClaim } from "@/db/queries/claims";
import { TRANSFER_QUERY_FN } from "@/db/queries/transfers";
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

    const transferParams = {
      chainId: parsedInput.chainId,
      tokenAddress: parsedInput.tokenAddress,
      ...(parsedInput.isProverSender
        ? { recipientAddress: parsedInput.counterpartyAddress }
        : { senderAddress: parsedInput.counterpartyAddress }),
      fromTimestamp: fromBlockTimestamp || undefined,
      toTimestamp: toBlockTimestamp || undefined,
    };

    const storedTransfers = await TRANSFER_QUERY_FN[parsedInput.tokenType](transferParams);

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
      counterpartyAddress: parsedInput.counterpartyAddress,
      isProverSender: parsedInput.isProverSender,
      tokenType: parsedInput.tokenType,
      minTransfersSum: parsedInput.minTransfersSum,
      maxTransfersSum: parsedInput.maxTransfersSum,
      minTransfersCount: parsedInput.minTransfersCount,
      maxTransfersCount: parsedInput.maxTransfersCount,
      fromBlockTimestamp,
      toBlockTimestamp,
      chainId: parsedInput.chainId,
      merkleRoot,
    });

    revalidatePath("/");

    return { claimId: claim.id };
  });
