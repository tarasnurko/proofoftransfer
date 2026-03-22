import { ImageResponse } from 'next/og'
import { getClaimById } from '@/db/queries/claims'
import { getChainName } from '@/utils/explorer.utils'
import { CHAIN_HEX_COLORS } from '@/constants'
import { EnsService } from '@/services/ens/ens.service'
import { truncateAddress } from '@/utils/format.utils'
import { ClaimDataGrid, formatOgAmount, formatOgPeriod, formatOgDateTime, formatOgTransferCount } from '@/lib/og'

export const alt = 'Claim details'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const claim = await getClaimById(id)

  if (!claim) {
    return new ImageResponse(
      (
        <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#e5e5e5', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '38px', left: '46px', width: '1116px', height: '560px', backgroundColor: '#000' }} />
          <div style={{ position: 'absolute', top: '28px', left: '36px', width: '1116px', height: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: '4px solid #000' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', color: '#888' }}>PROOF OF TRANSFER</span>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#000', marginTop: '12px' }}>Claim Not Found</span>
          </div>
        </div>
      ),
      { ...size },
    )
  }

  const chainName = getChainName(claim.chainId)
  const chainColor = CHAIN_HEX_COLORS[claim.chainId] ?? '#666'
  const ensName = await EnsService.getCachedEnsName(claim.counterpartyAddress)
  const counterparty = ensName || truncateAddress(claim.counterpartyAddress)
  const tokenName = claim.token?.name
  const tokenSymbol = claim.token?.symbol
  const tokenTypeLabel = claim.tokenType.toUpperCase()
  const amount = formatOgAmount(claim.minTransfersSum, claim.maxTransfersSum, claim.token?.decimals)
  const transferCount = formatOgTransferCount(claim.minTransfersCount, claim.maxTransfersCount)
  const period = formatOgPeriod(claim.fromBlockTimestamp, claim.toBlockTimestamp)
  const createdAt = formatOgDateTime(claim.createdAt)

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: chainColor, position: 'relative' }}>
        {/* Shadow */}
        <div style={{ position: 'absolute', top: '38px', left: '46px', width: '1116px', height: '560px', backgroundColor: '#000' }} />
        {/* Card */}
        <div style={{ position: 'absolute', top: '28px', left: '36px', width: '1116px', height: '560px', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', border: '4px solid #000' }}>
          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 36px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', color: '#888' }}>PROOF OF TRANSFER</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff', backgroundColor: '#000', padding: '4px 14px', letterSpacing: '2px' }}>CLAIM</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#666', marginLeft: '8px' }}>{claim.proofCount} {claim.proofCount === 1 ? 'proof' : 'proofs'}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginLeft: 'auto' }}>{createdAt}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: chainColor, border: `3px solid ${chainColor}`, padding: '3px 12px' }}>{chainName}</span>
            </div>
            {/* Claim ID */}
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#000', marginTop: '14px' }}>{claim.id}</span>
            {/* Message */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '10px', flex: 1 }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#000', lineHeight: 1.2, overflow: 'hidden', flex: 1 }}>{claim.message}</div>
            </div>
          </div>
          {/* Data grid */}
          <ClaimDataGrid
            tokenLabel={tokenName || tokenSymbol || claim.tokenAddress}
            tokenTypeLabel={tokenTypeLabel}
            proverRole={claim.isProverSender ? 'Sender' : 'Recipient'}
            counterparty={counterparty}
            amount={amount}
            transferCount={transferCount}
            period={period}
          />
        </div>
      </div>
    ),
    { ...size },
  )
}
