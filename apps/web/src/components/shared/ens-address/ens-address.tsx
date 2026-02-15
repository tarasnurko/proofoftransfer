import { Address } from '@/components/shared/address'
import type { Nullable } from '@/types/common.types'

interface EnsAddressProps {
  address: string
  ensName?: Nullable<string>
  chainId?: number
}

export function EnsAddress({ address, ensName, chainId }: EnsAddressProps) {
  if (!ensName) {
    return <Address address={address} chainId={chainId} />
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-bold">{ensName}</span>
      <Address address={address} chainId={chainId} chars={6} />
    </div>
  )
}
