import { ImageResponse } from 'next/og'

export const revalidate = 3600

const size = { width: 1200, height: 630 }

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(98,126,234,0.08) 0%, transparent 100%)',
      }}>
        <span style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '4px',
        }}>PROOF OF TRANSFER</span>
        <span style={{
          fontSize: '72px',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-2px',
          marginTop: '16px',
        }}>Documentation</span>
      </div>
    ),
    { ...size },
  )
}
