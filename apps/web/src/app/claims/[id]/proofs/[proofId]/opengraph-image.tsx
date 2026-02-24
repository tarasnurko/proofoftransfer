import { ImageResponse } from 'next/og'
import { getClaimById } from '@/db/queries/claims'
import { getProofById } from '@/db/queries/proofs'
import { getVerificationStats } from '@/db/queries/verifications'
import { getChainName } from '@/utils/explorer.utils'
import { CHAIN_HEX_COLORS } from '@/constants'
import { EnsService } from '@/services/ens/ens.service'
import {
  parseNullifierToIdenticon,
  identiconStripsSvg,
  DataCell,
  formatOgAmount,
  formatOgCounterparty,
  formatOgPeriod,
  formatOgCreatedAt,
  formatOgTransferCount,
} from '@/lib/og'

export const alt = 'Proof details'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

export default async function Image({
  params,
}: {
  params: Promise<{ id: string; proofId: string }>
}) {
  const { id: claimId, proofId } = await params

  const claim = await getClaimById(claimId)

  const [proofResult, stats, ensName] = await Promise.all([
    getProofById(proofId),
    getVerificationStats(proofId),
    claim ? EnsService.getCachedEnsName(claim.counterpartyAddress) : null,
  ])

  if (!claim || !proofResult) {
    return new ImageResponse(
      (
        <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#e5e5e5', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '38px', left: '46px', width: '1116px', height: '560px', backgroundColor: '#000' }} />
          <div style={{ position: 'absolute', top: '28px', left: '36px', width: '1116px', height: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: '4px solid #000' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', color: '#888' }}>PROOF OF TRANSFER</span>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#000', marginTop: '12px' }}>Proof Not Found</span>
          </div>
        </div>
      ),
      { ...size },
    )
  }

  const { grid, color, bgColor } = parseNullifierToIdenticon(proofResult.nullifier)
  const chainName = getChainName(claim.chainId)
  const chainColor = CHAIN_HEX_COLORS[claim.chainId] ?? '#666'
  const counterparty = ensName || formatOgCounterparty(claim.counterpartyAddress)
  const tokenName = claim.token?.name
  const tokenSymbol = claim.token?.symbol
  const tokenTypeLabel = claim.tokenType.toUpperCase()
  const amount = formatOgAmount(claim.minTransfersSum, claim.maxTransfersSum, claim.token?.decimals)
  const transferCount = formatOgTransferCount(claim.minTransfersCount, claim.maxTransfersCount)
  const period = formatOgPeriod(claim.fromBlockTimestamp, claim.toBlockTimestamp)
  const createdAt = formatOgCreatedAt(claim.createdAt)
  const message = claim.message.length > 80 ? claim.message.slice(0, 80) + '...' : claim.message
  const truncHex = (s: string) => s.length > 64 ? `${s.slice(0, 33)}...${s.slice(-28)}` : s
  const nullifierDisplay = truncHex(proofResult.nullifier)
  const proofDataDisplay = truncHex(proofResult.proofData)

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: bgColor, position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={identiconStripsSvg(grid, color, 16, 2)} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', opacity: 0.15 }} />
        {/* Shadow */}
        <div style={{ position: 'absolute', top: '38px', left: '46px', width: '1116px', height: '560px', backgroundColor: '#000' }} />
        {/* Card */}
        <div style={{ position: 'absolute', top: '28px', left: '36px', width: '1116px', height: '560px', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', border: '4px solid #000' }}>
          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 36px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', color: '#888' }}>PROOF OF TRANSFER</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff', backgroundColor: '#000', padding: '4px 14px', letterSpacing: '2px' }}>PROOF</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', marginLeft: '8px' }}>{stats.successful} verified</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626' }}>{stats.failed} failed</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: chainColor, border: `3px solid ${chainColor}`, padding: '3px 12px', marginLeft: 'auto' }}>{chainName}</span>
            </div>
            {/* Proof ID + Claim ID */}
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#000', marginTop: '14px' }}>{proofResult.id}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#888', marginTop: '2px' }}>Claim: {claimId}</span>
            {/* Message */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '10px', flex: 1 }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#000', lineHeight: 1.2, overflow: 'hidden', flex: 1 }}>{message}</div>
            </div>
          </div>
          {/* Nullifier + Proof Data row */}
          <div style={{ display: 'flex', borderTop: '4px solid #000' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 16px', borderRight: '4px solid #000' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1.5px' }}>NULLIFIER</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#333', marginTop: '2px' }}>{nullifierDisplay}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1.5px' }}>PROOF DATA</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#333', marginTop: '2px' }}>{proofDataDisplay}</span>
            </div>
          </div>
          {/* Data grid */}
          <div style={{ display: 'flex', borderTop: '4px solid #000' }}>
            <DataCell label="TOKEN" value={tokenName || tokenSymbol || claim.tokenAddress} value2={tokenTypeLabel} flex={1} />
            <DataCell label="COUNTERPARTY" value={counterparty} flex={1.2} />
            <DataCell label="AMOUNT" value={amount} value2={transferCount || undefined} />
            <DataCell label="PERIOD" value={period.value} value2={period.value2} flex={1.2} />
            <DataCell label="CREATED" value={createdAt} flex={0.8} borderRight={false} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
