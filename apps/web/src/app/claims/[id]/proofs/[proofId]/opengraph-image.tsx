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
  HashCell,
  ClaimDataGrid,
  formatOgAmount,
  formatOgCounterparty,
  formatOgPeriod,
  formatOgCreatedAt,
  formatOgDateTime,
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
  const claimCreatedAt = formatOgDateTime(claim.createdAt)
  const proofCreatedAt = formatOgDateTime(proofResult.createdAt)
  const message = claim.message.length > 120 ? claim.message.slice(0, 120) + '...' : claim.message
  const proofMessage = proofResult.message
    ? (proofResult.message.length > 230 ? proofResult.message.slice(0, 230) + '...' : proofResult.message)
    : null
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginLeft: 'auto' }}>{proofCreatedAt}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: chainColor, border: `3px solid ${chainColor}`, padding: '3px 12px' }}>{chainName}</span>
            </div>
            {/* Proof ID */}
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#000', marginTop: '14px' }}>{proofResult.id}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#888', marginTop: '2px' }}>Claim: {claimId} | {claimCreatedAt}</span>
            {/* Claim message */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '10px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#000', lineHeight: 1.2, overflow: 'hidden' }}>{message}</div>
                {proofMessage && (
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#888', letterSpacing: '1.5px' }}>PROOF MESSAGE</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#555', lineHeight: 1.3, marginTop: '4px' }}>{proofMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Nullifier + Proof Data row */}
          <div style={{ display: 'flex', borderTop: '4px solid #000' }}>
            <HashCell label="NULLIFIER" value={nullifierDisplay} borderRight />
            <HashCell label="PROOF DATA" value={proofDataDisplay} />
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
