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
        backgroundImage: 'linear-gradient(135deg, #1a0533 0%, #0a1628 20%, #0d2847 40%, #0052ff 65%, #28a0f0 80%, #627eea 100%)',
        position: 'relative',
      }}>
        {/* Glow overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          backgroundImage: 'radial-gradient(ellipse 60% 50% at 70% 50%, rgba(0,82,255,0.25) 0%, transparent 100%)',
        }} />
        <span style={{
          fontSize: '80px',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-2px',
          lineHeight: 1,
        }}>PROOF OF</span>
        <span style={{
          fontSize: '80px',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-2px',
          lineHeight: 1,
          marginTop: '8px',
        }}>TRANSFER</span>
        <span style={{
          fontSize: '22px',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.5)',
          marginTop: '28px',
        }}>Zero-knowledge proofs for token transfers</span>
      </div>
    ),
    { ...size },
  )
}
