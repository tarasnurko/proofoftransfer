export interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T | null;
}

export interface EtherscanRequestBaseQueryParams {
  apiKey: string;
  chainid: string;
  module: string;
  action: string;
}

export interface EtherscanRequestPaginationParams {
  page: number;
  offset: number;
}

export interface EtherscanERC20TransfersRequestParams {
  contractaddress?: string;
  address: string;
  startblock: number;
  endblock: number;
}

interface EtherscanBaseTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  tokenName: string;
  tokenSymbol: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  methodId: string;
  functionName: string;
  confirmations: string;
}

export interface EtherscanERC20Transfer extends EtherscanBaseTransfer {
  value: string;
  tokenDecimal: string;
}

export interface EtherscanERC721Transfer extends EtherscanBaseTransfer {
  tokenID: string;
  tokenDecimal: string;
}

export interface EtherscanERC1155Transfer extends EtherscanBaseTransfer {
  tokenID: string;
  tokenValue: string;
}
