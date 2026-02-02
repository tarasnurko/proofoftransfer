"use server";

import { z } from "zod";
import { createPublicClient, http } from "viem";
import { actionClient } from "@/lib/safe-action";
import { createToken, getTokenByAddressAndChain } from "@/db/queries/tokens";
import type { InsertTokenEntity } from "@/db/index.types";
import { EtherscanClient } from "@/lib/etherscan";
import { getViemChain } from "@/utils/blockchain.utils";
import { erc20Abi } from "@/abi/erc20Abi";

const fetchTokenSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number(),
  recipientAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  fromTimestamp: z.number().optional(),
  toTimestamp: z.number().optional(),
});

export const fetchAndStoreTokenDataAction = actionClient
  .inputSchema(fetchTokenSchema)
  .action(async ({ parsedInput }) => {
    const {
      tokenAddress,
      chainId,
      recipientAddress,
      fromTimestamp,
      toTimestamp,
    } = parsedInput;

    // Check if token data already exists
    const existingToken = await getTokenByAddressAndChain(
      tokenAddress,
      chainId,
    );
    if (existingToken) {
      return { data: existingToken };
    }

    // Strategy 1: Try to fetch from Etherscan transfers (if recipientAddress provided)
    if (recipientAddress) {
      try {
        const etherscanClient = new EtherscanClient();
        const transfers = await etherscanClient.fetchERC20Transfers({
          chainId,
          tokenAddress,
          recipientAddress,
          fromTimestamp,
          toTimestamp,
        });

        if (transfers.length > 0) {
          const firstTransfer = transfers[0];
          if (
            firstTransfer?.tokenName &&
            firstTransfer?.tokenSymbol &&
            firstTransfer?.tokenDecimal
          ) {
            const tokenData: InsertTokenEntity = {
              address: tokenAddress.toLowerCase(),
              chainId: chainId,
              name: firstTransfer.tokenName,
              symbol: firstTransfer.tokenSymbol,
              decimals: parseInt(firstTransfer.tokenDecimal),
            };

            const result = await createToken(tokenData);
            return { data: result };
          }
        }
      } catch (error) {
        console.log(
          "Failed to fetch token data from Etherscan, trying viem:",
          error,
        );
      }
    }

    // Strategy 2: Fetch directly from contract using viem
    const chain = getViemChain(chainId);
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    const [name, symbol, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "name",
      }),
      client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);

    const tokenData: InsertTokenEntity = {
      address: tokenAddress.toLowerCase(),
      chainId: chainId,
      name: name as string,
      symbol: symbol as string,
      decimals: decimals as number,
    };

    const result = await createToken(tokenData);
    return { data: result };
  });
