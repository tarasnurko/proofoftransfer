import axios from "axios";
import type { EtherscanERC20Transfer, EtherscanResponse } from "@repo/types";
import { isAddressEqual, type Address } from "viem";
import type { GetERC20TransfersParams } from "./etherscan.types";
import { sleep } from "@/utils/async.utils";

const API_V2_BASE = "https://api.etherscan.io/v2/api";
const LATEST_BLOCK_FALLBACK = 99_999_999;
const PAGE_SIZE = 1000;
const MAX_RETRIES = 3;
const MAX_RESULTS_PER_QUERY = 10_000;

const nowUnix = () => Math.floor(Date.now() / 1000);

export class EtherscanService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || "demo";
  }

  /*****************************************************/
  /**********             Public             ***********/
  /*****************************************************/

  async getERC20Transfers(
    params: GetERC20TransfersParams,
  ): Promise<EtherscanERC20Transfer[]> {
    const {
      chainId,
      tokenAddress,
      recipientAddress,
      fromTimestamp,
      toTimestamp,
    } = params;

    const now = nowUnix();
    if (fromTimestamp && fromTimestamp > now) {
      throw new Error("From timestamp cannot be in the future");
    }
    if (toTimestamp && toTimestamp > now) {
      throw new Error("To timestamp cannot be in the future");
    }

    const startBlock = fromTimestamp
      ? await this.getBlockByTimestamp(chainId, fromTimestamp, "after")
      : 0;
    const endBlock = toTimestamp
      ? await this.getBlockByTimestamp(chainId, toTimestamp, "before")
      : LATEST_BLOCK_FALLBACK;

    const allTransfers = await this.getERC20TransfersInRange(
      chainId,
      tokenAddress,
      recipientAddress,
      startBlock,
      endBlock,
    );

    return this.filterERC20Transfers(
      allTransfers,
      tokenAddress,
      recipientAddress,
      fromTimestamp,
      toTimestamp,
    );
  }

  async getBlockByTimestamp(
    chainId: number,
    timestamp: number,
    closest: "before" | "after" = "before",
  ): Promise<number> {
    const now = nowUnix();
    if (timestamp > now) {
      throw new Error("Block timestamp cannot be in the future");
    }

    const response = await axios.get<EtherscanResponse<string>>(API_V2_BASE, {
      params: {
        chainid: chainId,
        module: "block",
        action: "getblocknobytime",
        timestamp,
        closest,
        apikey: this.apiKey,
      },
    });

    if (response.data.status !== "1" || !response.data.result) {
      throw new Error(
        `Failed to get block number for timestamp ${timestamp} on chain ${chainId}`,
      );
    }

    return Number(response.data.result);
  }

  /*****************************************************/
  /**********            Private             ***********/
  /*****************************************************/

  private async getERC20TransfersInRange(
    chainId: number,
    tokenAddress: string,
    recipientAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<EtherscanERC20Transfer[]> {
    const allTransfers: EtherscanERC20Transfer[] = [];
    let currentStartBlock = startBlock;
    let page = 1;
    let batchCount = 0;

    while (currentStartBlock <= endBlock) {
      const pageResults = await this.getERC20TransfersBatch(
        chainId,
        tokenAddress,
        recipientAddress,
        currentStartBlock,
        endBlock,
        page,
      );

      if (!pageResults) break;

      allTransfers.push(...pageResults);
      batchCount += pageResults.length;

      if (pageResults.length < PAGE_SIZE) break;

      if (batchCount >= MAX_RESULTS_PER_QUERY) {
        const lastBlock = Number(allTransfers.at(-1)!.blockNumber);
        if (lastBlock <= currentStartBlock) break;
        currentStartBlock = lastBlock;
        page = 1;
        batchCount = 0;
      } else {
        page++;
      }
    }

    return allTransfers;
  }

  private async getERC20TransfersBatch(
    chainId: number,
    tokenAddress: string,
    recipientAddress: string,
    startBlock: number,
    endBlock: number,
    page: number,
  ): Promise<EtherscanERC20Transfer[] | null> {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await axios.get<
          EtherscanResponse<EtherscanERC20Transfer[]>
        >(API_V2_BASE, {
          params: {
            chainid: chainId,
            module: "account",
            action: "tokentx",
            contractaddress: tokenAddress,
            address: recipientAddress,
            startblock: startBlock,
            endblock: endBlock,
            page,
            offset: PAGE_SIZE,
            sort: "asc",
            apikey: this.apiKey,
          },
        });

        const { data } = response;

        if (data.status !== "1") {
          if (data.message === "No transactions found") return null;

          const resultAsString =
            typeof data.result === "string" ? data.result : "";
          if (
            data.message === "NOTOK" ||
            resultAsString.includes("Invalid API Key")
          ) {
            throw new Error(
              "Invalid or missing Etherscan API key. Please add ETHERSCAN_API_KEY to your .env.local file. Get your key from https://etherscan.io/apis",
            );
          }
          throw new Error(`Etherscan API error: ${data.message}`);
        }

        const transfers = data.result;
        if (!Array.isArray(transfers) || !transfers.length) return null;

        return transfers;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const waitTime = Math.pow(2, retries) * 1000;
          await sleep(waitTime);
          retries++;
          continue;
        }

        retries++;
        if (retries >= MAX_RETRIES) {
          throw new Error(
            `Failed to fetch transfers after ${MAX_RETRIES} retries: ${
              axios.isAxiosError(error) ? error.message : String(error)
            }`,
          );
        }
        await sleep(1000 * retries);
      }
    }

    throw new Error("Failed to fetch data from Etherscan");
  }

  private filterERC20Transfers(
    transfers: EtherscanERC20Transfer[],
    tokenAddress: string,
    recipientAddress: string,
    fromTimestamp?: number,
    toTimestamp?: number,
  ): EtherscanERC20Transfer[] {
    return transfers.filter((t) => {
      if (!isAddressEqual(t.to as Address, recipientAddress as Address))
        return false;
      if (
        !isAddressEqual(t.contractAddress as Address, tokenAddress as Address)
      )
        return false;
      if (fromTimestamp && Number(t.timeStamp) < fromTimestamp) return false;
      if (toTimestamp && Number(t.timeStamp) > toTimestamp) return false;
      return true;
    });
  }
}

export const etherscanService = new EtherscanService();
