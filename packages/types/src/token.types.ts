export enum TokenType {
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
}

export const TOKEN_TYPE_CIRCUIT_VALUE: Record<TokenType, number> = {
  [TokenType.ERC20]: 0,
  [TokenType.ERC721]: 1,
  [TokenType.ERC1155]: 2,
}
