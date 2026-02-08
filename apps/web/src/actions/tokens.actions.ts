"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { ethereumAddressSchema } from "@/lib/validations/address";
import { createToken, getTokenByAddressAndChain } from "@/db/queries/tokens";
import type { InsertTokenEntity } from "@/db/index.types";
import type { Address } from "viem";
import { BlockchainService } from "@/services/blockchain/blockchain.service";

const fetchTokenSchema = z.object({
  tokenAddress: ethereumAddressSchema,
  chainId: z.number(),
});

export const fetchAndStoreTokenDataAction = actionClient
  .inputSchema(fetchTokenSchema)
  .action(async ({ parsedInput }) => {
    const { tokenAddress, chainId } = parsedInput;

    const existingToken = await getTokenByAddressAndChain(
      tokenAddress,
      chainId,
    );
    if (existingToken) {
      return { data: existingToken };
    }

    const { name, symbol, decimals } = await BlockchainService.getTokenMetadata(
      tokenAddress as Address,
      chainId
    );

    const tokenData: InsertTokenEntity = {
      address: tokenAddress.toLowerCase(),
      chainId: chainId,
      name,
      symbol,
      decimals,
    };

    const result = await createToken(tokenData);
    return { data: result };
  });
