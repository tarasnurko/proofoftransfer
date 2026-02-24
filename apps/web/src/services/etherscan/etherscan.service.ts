import axios from "axios";
import type { EtherscanERC20Transfer, EtherscanERC721Transfer, EtherscanERC1155Transfer, EtherscanResponse } from "@repo/types";
import { isAddressEqual, type Address } from "viem";
import type { GetTransfersParams } from "./etherscan.types";
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
    params: GetTransfersParams,
  ): Promise<EtherscanERC20Transfer[]> {
    const { chainId, tokenAddress, address, fromTimestamp, toTimestamp } = params;

    const now = nowUnix();
    if (fromTimestamp && fromTimestamp > now) throw new Error("From timestamp cannot be in the future");
    if (toTimestamp && toTimestamp > now) throw new Error("To timestamp cannot be in the future");

    const startBlock = fromTimestamp
      ? await this.getBlockByTimestamp(chainId, fromTimestamp, "after")
      : 0;
    const endBlock = toTimestamp
      ? await this.getBlockByTimestamp(chainId, toTimestamp, "before")
      : LATEST_BLOCK_FALLBACK;

    const allTransfers: EtherscanERC20Transfer[] = [];
    let currentStartBlock = startBlock;
    let page = 1;
    let batchCount = 0;

    while (currentStartBlock <= endBlock) {
      const pageResults = await this.fetchBatch<EtherscanERC20Transfer>(
        chainId, tokenAddress, address, currentStartBlock, endBlock, page, "tokentx",
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

    return allTransfers.filter((transfer) => {
      const matchesAddress =
        isAddressEqual(transfer.from as Address, address as Address) ||
        isAddressEqual(transfer.to as Address, address as Address);
      if (!matchesAddress) return false;
      if (!isAddressEqual(transfer.contractAddress as Address, tokenAddress as Address)) return false;
      if (fromTimestamp && Number(transfer.timeStamp) < fromTimestamp) return false;
      if (toTimestamp && Number(transfer.timeStamp) > toTimestamp) return false;
      return true;
    });
  }

  async getERC721Transfers(
    params: GetTransfersParams,
  ): Promise<EtherscanERC721Transfer[]> {
    const { chainId, tokenAddress, address, fromTimestamp, toTimestamp } = params;

    const now = nowUnix();
    if (fromTimestamp && fromTimestamp > now) throw new Error("From timestamp cannot be in the future");
    if (toTimestamp && toTimestamp > now) throw new Error("To timestamp cannot be in the future");

    const startBlock = fromTimestamp
      ? await this.getBlockByTimestamp(chainId, fromTimestamp, "after")
      : 0;
    const endBlock = toTimestamp
      ? await this.getBlockByTimestamp(chainId, toTimestamp, "before")
      : LATEST_BLOCK_FALLBACK;

    const allTransfers: EtherscanERC721Transfer[] = [];
    let currentStartBlock = startBlock;
    let page = 1;
    let batchCount = 0;

    while (currentStartBlock <= endBlock) {
      const pageResults = await this.fetchBatch<EtherscanERC721Transfer>(
        chainId, tokenAddress, address, currentStartBlock, endBlock, page, "tokennfttx",
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

    return allTransfers.filter((transfer) => {
      const matchesAddress =
        isAddressEqual(transfer.from as Address, address as Address) ||
        isAddressEqual(transfer.to as Address, address as Address);
      if (!matchesAddress) return false;
      if (!isAddressEqual(transfer.contractAddress as Address, tokenAddress as Address)) return false;
      if (fromTimestamp && Number(transfer.timeStamp) < fromTimestamp) return false;
      if (toTimestamp && Number(transfer.timeStamp) > toTimestamp) return false;
      return true;
    });
  }

  async getERC1155Transfers(
    params: GetTransfersParams,
  ): Promise<EtherscanERC1155Transfer[]> {
    const { chainId, tokenAddress, address, fromTimestamp, toTimestamp } = params;

    const now = nowUnix();
    if (fromTimestamp && fromTimestamp > now) throw new Error("From timestamp cannot be in the future");
    if (toTimestamp && toTimestamp > now) throw new Error("To timestamp cannot be in the future");

    const startBlock = fromTimestamp
      ? await this.getBlockByTimestamp(chainId, fromTimestamp, "after")
      : 0;
    const endBlock = toTimestamp
      ? await this.getBlockByTimestamp(chainId, toTimestamp, "before")
      : LATEST_BLOCK_FALLBACK;

    const allTransfers: EtherscanERC1155Transfer[] = [];
    let currentStartBlock = startBlock;
    let page = 1;
    let batchCount = 0;

    while (currentStartBlock <= endBlock) {
      const pageResults = await this.fetchBatch<EtherscanERC1155Transfer>(
        chainId, tokenAddress, address, currentStartBlock, endBlock, page, "token1155tx",
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

    return allTransfers.filter((transfer) => {
      const matchesAddress =
        isAddressEqual(transfer.from as Address, address as Address) ||
        isAddressEqual(transfer.to as Address, address as Address);
      if (!matchesAddress) return false;
      if (!isAddressEqual(transfer.contractAddress as Address, tokenAddress as Address)) return false;
      if (fromTimestamp && Number(transfer.timeStamp) < fromTimestamp) return false;
      if (toTimestamp && Number(transfer.timeStamp) > toTimestamp) return false;
      return true;
    });
  }

  async getBlockByTimestamp(
    chainId: number,
    timestamp: number,
    closest: "before" | "after" = "before",
  ): Promise<number> {
    const now = nowUnix();
    if (timestamp > now) throw new Error("Block timestamp cannot be in the future");

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

  private async fetchBatch<T>(
    chainId: number,
    tokenAddress: string,
    address: string,
    startBlock: number,
    endBlock: number,
    page: number,
    action: string,
  ): Promise<T[] | null> {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await axios.get<EtherscanResponse<T[]>>(API_V2_BASE, {
          params: {
            chainid: chainId,
            module: "account",
            action,
            contractaddress: tokenAddress,
            address,
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

          const resultAsString = typeof data.result === "string" ? data.result : "";
          if (data.message === "NOTOK" || resultAsString.includes("Invalid API Key")) {
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
}

export const etherscanService = new EtherscanService();
