import { formatTokenValue } from '@/utils/format.utils'

// ─── Identicon ─────────────────────────────────────────────────

export interface IdenticonData {
  grid: boolean[][]
  color: string
  bgColor: string
}

export function parseNullifierToIdenticon(nullifier: string): IdenticonData {
  const hex = nullifier.replace('0x', '')
  const colorHex = hex.slice(-6).padEnd(6, 'a')
  const r = Math.min(parseInt(colorHex.slice(0, 2), 16), 200)
  const g = Math.min(parseInt(colorHex.slice(2, 4), 16), 200)
  const b = Math.min(parseInt(colorHex.slice(4, 6), 16), 200)
  const color = `rgb(${r}, ${g}, ${b})`

  const bgR = Math.floor(r + (255 - r) * 0.82)
  const bgG = Math.floor(g + (255 - g) * 0.82)
  const bgB = Math.floor(b + (255 - b) * 0.82)
  const bgColor = `rgb(${bgR}, ${bgG}, ${bgB})`

  const grid: boolean[][] = []
  for (let row = 0; row < 10; row++) {
    const halfRow: boolean[] = []
    for (let col = 0; col < 5; col++) {
      const charIndex = (row * 5 + col) % hex.length
      const value = parseInt(hex[charIndex] ?? '0', 16)
      halfRow.push(value >= 8)
    }
    grid.push([...halfRow, ...halfRow.slice().reverse()])
  }

  return { grid, color, bgColor }
}

// ─── Identicon Background ──────────────────────────────────────

export function identiconStripsSvg(
  grid: boolean[][],
  color: string,
  cellSize: number,
  gap: number,
): string {
  const cellStep = cellSize + gap
  const topCols = Math.floor(1200 / cellStep)
  const leftRows = Math.floor(630 / cellStep)
  const gridCols = grid[0]!.length
  const gridRows = grid.length

  let rects = ''

  // Top strip: 2 rows, full width
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < topCols; c++) {
      if (grid[r]![c % gridCols]) {
        rects += `<rect x="${c * cellStep}" y="${r * cellStep}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`
      }
    }
  }

  // Left strip: 2 cols, full height (skip top 2 rows — already covered)
  for (let r = 2; r < leftRows; r++) {
    for (let c = 0; c < 2; c++) {
      if (grid[r % gridRows]![c]) {
        rects += `<rect x="${c * cellStep}" y="${r * cellStep}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`
      }
    }
  }

  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${rects}</svg>`)}`
}

// ─── Hash Cell ─────────────────────────────────────────────────

export function HashCell({ label, value, borderRight = false }: {
  label: string
  value: string
  borderRight?: boolean
}) {
  return (
    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', padding: '10px 16px', borderRight: borderRight ? '4px solid #000' : 'none' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#888', letterSpacing: '1.5px' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 900, color: '#333', marginTop: '2px' }}>{value}</span>
    </div>
  )
}

// ─── Data Cell ─────────────────────────────────────────────────

export function DataCell({ label, value, value2, flex = 1, borderRight = true }: {
  label: string
  value: string
  value2?: string
  flex?: number
  borderRight?: boolean
}) {
  return (
    <div style={{
      flex,
      display: 'flex',
      flexDirection: 'column',
      padding: '8px 16px',
      borderRight: borderRight ? '4px solid #000' : 'none',
      overflow: 'hidden',
    }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#666', letterSpacing: '1.5px', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '16px', fontWeight: 900, color: '#000', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</span>
      {value2 && <span style={{ fontSize: '16px', fontWeight: 900, color: '#000', marginTop: '1px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value2}</span>}
    </div>
  )
}

// ─── Claim Data Grid ──────────────────────────────────────────

interface ClaimDataGridProps {
  tokenLabel: string
  tokenTypeLabel: string
  proverRole: string
  counterparty: string
  amount: string
  transferCount: string
  period: { from?: string; to?: string }
}

export function ClaimDataGrid({ tokenLabel, tokenTypeLabel, proverRole, counterparty, amount, transferCount, period }: ClaimDataGridProps) {
  const hasPeriod = period.from || period.to
  return (
    <div style={{ display: 'flex', borderTop: '4px solid #000' }}>
      {/* Left half */}
      <div style={{ width: '50%', display: 'flex', borderRight: '4px solid #000' }}>
        <DataCell label="TOKEN" value={tokenLabel} value2={tokenTypeLabel} flex={1.2} />
        <DataCell label="PROVER ROLE" value={proverRole} flex={0.8} />
        <DataCell label="COUNTERPARTY" value={counterparty} flex={1.4} borderRight={false} />
      </div>
      {/* Right half */}
      <div style={{ width: '50%', display: 'flex' }}>
        <DataCell label="SUM" value={amount} flex={1} />
        <DataCell label="TX COUNT" value={transferCount} flex={0.8} />
        {/* Period cell */}
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', padding: '8px 16px', overflow: 'hidden' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#666', letterSpacing: '1.5px', whiteSpace: 'nowrap' }}>PERIOD</span>
          {hasPeriod ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', gap: '1px' }}>
              {period.from && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#000', width: '40px' }}>From</span>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>{period.from}</span>
                </div>
              )}
              {period.to && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#000', width: '40px' }}>To</span>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>{period.to}</span>
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#000', marginTop: '2px' }}>Any</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Formatters ────────────────────────────────────────────────

const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export function formatOgAmount(rawMin: string, rawMax: string, decimals?: number): string {
  const toNum = (raw: string): number => {
    if (!raw || raw === '0') return 0
    if (decimals != null) return parseFloat(formatTokenValue(raw, decimals))
    return parseFloat(raw)
  }

  const min = toNum(rawMin)
  const max = toNum(rawMax)

  if (min > 0 && max > 0) return `${compactFmt.format(min)} - ${compactFmt.format(max)}`
  if (min > 0) return `Min ${compactFmt.format(min)}`
  if (max > 0) return `Max ${compactFmt.format(max)}`
  return 'Any'
}

export function formatOgCounterparty(address: string): string {
  if (address.startsWith('0x') && address.length === 42) {
    return `${address.slice(0, 10)}...${address.slice(-8)}`
  }
  return address
}

export function formatOgTransferCount(min: number, max: number): string {
  if (min > 0 && max > 0) return `${min} - ${max}`
  if (min > 0) return `Min ${min}`
  if (max > 0) return `Max ${max}`
  return 'Any'
}

export function formatOgDate(timestamp: number): string {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export function formatOgCreatedAt(timestamp: number | Date): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export function formatOgDateTime(timestamp: number | Date): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000)
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

export function formatOgPeriod(from: number, to: number): { from?: string; to?: string } {
  const fromStr = formatOgDate(from)
  const toStr = formatOgDate(to)
  return { from: fromStr || undefined, to: toStr || undefined }
}
