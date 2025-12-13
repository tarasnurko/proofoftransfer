import { APP_CHAIN } from "@/constants";
import axios from "axios";

export interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T | null;
}

export interface ERC20Transfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
  methodId?: string;
  functionName?: string;
}

interface GetERC20TransfersParams {
  apikey: string;
  chainid: string;
  module: string;
  action: string;
  contractaddress?: string;
  address: string;
  startblock?: string;
  endblock?: string;
  page?: string;
  offset?: string;
  sort?: "ask" | "desc";
}

interface GetClosesBlockNumberByDateParams {
  apikey: string;
  chainid: string;
  module: string;
  action: string;
  timestamp: string;
  closest?: "before" | "after";
}

export class EtherscanService {
  static etherscanApiUrl = "https://api.etherscan.io/v2/api";

  static async getERC20Transfers(
    params: Pick<
      GetERC20TransfersParams,
      "address" | "startblock" | "endblock" | "page" | "offset" | "sort"
    >
  ): Promise<ERC20Transfer[]> {
    const requestParams: GetERC20TransfersParams = {
      apikey: process.env.ETHERSCAN_API_KEY!,
      chainid: APP_CHAIN.toString(),
      module: "account",
      action: "tokentx",
      ...params,
    };

    const response = await axios.get<EtherscanResponse<ERC20Transfer[]>>(
      EtherscanService.etherscanApiUrl,
      {
        params: requestParams,
      }
    );

    if (response.data.result === null) {
      throw new Error(
        `Failed to retrieve erc20 transfers using etherscan. ${JSON.stringify(
          requestParams,
          null,
          2
        )}`
      );
    }

    console.log(requestParams);
    console.log(response.data.result);

    return response.data.result;
  }

  static async getClosestBlockNumberByDate(
    params: Pick<GetClosesBlockNumberByDateParams, "timestamp" | "closest">
  ): Promise<string> {
    const requestParams: GetClosesBlockNumberByDateParams = {
      apikey: process.env.ETHERSCAN_API_KEY!,
      chainid: APP_CHAIN.toString(),
      module: "block",
      action: "getblocknobytime",
      ...params,
    };

    const response = await axios.get<EtherscanResponse<string>>(
      EtherscanService.etherscanApiUrl,
      {
        params: requestParams,
      }
    );

    if (response.data.result === null) {
      throw new Error(
        `Failed to retrieve eclosest block number by date using etherscan. ${JSON.stringify(
          requestParams,
          null,
          2
        )}`
      );
    }

    return response.data.result;
  }
}
