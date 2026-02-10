export interface Chain {
  id: number
  name: string
}

export const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, name: 'Ethereum' },
  { id: 10, name: 'Optimism' },
  { id: 56, name: 'BNB Chain' },
  { id: 137, name: 'Polygon' },
  { id: 8453, name: 'Base' },
  { id: 42161, name: 'Arbitrum' },
  { id: 534352, name: 'Scroll' },
]

export const CHAIN_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-[#627eea]/15', text: 'text-[#627eea]', border: 'border-[#627eea]/40' },
  10: { bg: 'bg-[#ff0420]/15', text: 'text-[#ff0420]', border: 'border-[#ff0420]/40' },
  56: { bg: 'bg-[#f0b90b]/15', text: 'text-[#c99d09]', border: 'border-[#f0b90b]/40' },
  137: { bg: 'bg-[#8247e5]/15', text: 'text-[#8247e5]', border: 'border-[#8247e5]/40' },
  8453: { bg: 'bg-[#0052ff]/15', text: 'text-[#0052ff]', border: 'border-[#0052ff]/40' },
  42161: { bg: 'bg-[#28a0f0]/15', text: 'text-[#28a0f0]', border: 'border-[#28a0f0]/40' },
  534352: { bg: 'bg-[#ffeeda]/30', text: 'text-[#e5a566]', border: 'border-[#e5a566]/40' },
}
