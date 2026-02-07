import axios from "axios";
import type { EtherscanERC20Transfer } from "@repo/types";

const ETHERSCAN_API_V2_BASE = "https://api.etherscan.io/v2/api";
const LATEST_BLOCK_FALLBACK = 99999999;
const PAGE_SIZE = 1000;
const MAX_RETRIES = 3;

interface FetchERC20TransfersParams {
  chainId: number;
  tokenAddress: string;
  recipientAddress: string;
  fromTimestamp?: number;
  toTimestamp?: number;
}

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

export class EtherscanClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || "demo";
  }

  async fetchERC20Transfers(
    params: FetchERC20TransfersParams,
  ): Promise<EtherscanERC20Transfer[]> {
    const {
      chainId,
      tokenAddress,
      recipientAddress,
      fromTimestamp,
      toTimestamp,
    } = params;

    const now = Math.floor(Date.now() / 1000);
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

    const allTransfers: EtherscanERC20Transfer[] = [];
    let page = 1;
    const maxRetries = MAX_RETRIES;

    while (true) {
      const offset = PAGE_SIZE;

      let retries = 0;
      let data: EtherscanResponse<EtherscanERC20Transfer[]> | null = null;

      while (retries < maxRetries) {
        try {
          const response = await axios.get<
            EtherscanResponse<EtherscanERC20Transfer[]>
          >(ETHERSCAN_API_V2_BASE, {
            params: {
              chainid: chainId,
              module: "account",
              action: "tokentx",
              contractaddress: tokenAddress,
              address: recipientAddress,
              startblock: startBlock,
              endblock: endBlock,
              page,
              offset,
              sort: "asc",
              apikey: this.apiKey,
            },
          });

          data = response.data;
          break;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            const waitTime = Math.pow(2, retries) * 1000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            retries++;
            continue;
          }

          retries++;
          if (retries >= maxRetries) {
            throw new Error(
              `Failed to fetch transfers after ${maxRetries} retries: ${
                axios.isAxiosError(error) ? error.message : String(error)
              }`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
        }
      }

      if (!data) {
        throw new Error("Failed to fetch data from Etherscan");
      }

      if (data.status !== "1") {
        if (data.message === "No transactions found") {
          break;
        }
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

      if (!Array.isArray(transfers) || !transfers.length) {
        break;
      }

      allTransfers.push(...transfers);

      if (transfers.length < offset) {
        break;
      }

      page++;
    }

    let filteredTransfers = allTransfers;

    filteredTransfers = filteredTransfers.filter(
      (t) => t.to.toLowerCase() === recipientAddress.toLowerCase(),
    );

    filteredTransfers = filteredTransfers.filter(
      (t) => t.contractAddress.toLowerCase() === tokenAddress.toLowerCase(),
    );

    if (fromTimestamp) {
      filteredTransfers = filteredTransfers.filter(
        (t) => Number(t.timeStamp) >= fromTimestamp,
      );
    }

    if (toTimestamp) {
      filteredTransfers = filteredTransfers.filter(
        (t) => Number(t.timeStamp) <= toTimestamp,
      );
    }

    return filteredTransfers;
  }

  async getBlockByTimestamp(
    chainId: number,
    timestamp: number,
    closest: "before" | "after" = "before",
  ): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    if (timestamp > now) {
      throw new Error("Block timestamp cannot be in the future");
    }

    try {
      const response = await axios.get<EtherscanResponse<string>>(
        ETHERSCAN_API_V2_BASE,
        {
          params: {
            chainid: chainId,
            module: "block",
            action: "getblocknobytime",
            timestamp,
            closest,
            apikey: this.apiKey,
          },
        },
      );

      if (response.data.status === "1" && response.data.result) {
        return Number(response.data.result);
      }

      return closest === "after" ? 0 : LATEST_BLOCK_FALLBACK;
    } catch {
      return closest === "after" ? 0 : LATEST_BLOCK_FALLBACK;
    }
  }
}

export const etherscanClient = new EtherscanClient();
