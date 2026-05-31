import { useState } from 'react'

const CONF = {
  high:   { bg: '#DCFCE7', color: '#15803D', label: '● High confidence'   },
  medium: { bg: '#FEF9C3', color: '#A16207', label: '● Medium confidence' },
  low:    { bg: '#FEE2E2', color: '#B91C1C', label: '● Low confidence'    },
}

// ── Streaming skeleton shown while tokens arrive ──────────────────────────────
export function StreamingPanel({ text }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E6DE',
      borderRadius: 10, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: '#1D9E75', animation: 'blink 1s ease-in-out infinite',
        }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: '#085041' }}>
          Analysing logs…
        </p>
        <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }`}</style>
      </div>

      <pre style={{
        fontSize: 11, fontFamily: 'Courier New, monospace', whiteSpace: 'pre-wrap',
        background: '#F6F5F0', border: '1px solid #E8E6DE',
        borderRadius: 6, padding: '12px 14px', color: '#3C3489',
        minHeight: 80, lineHeight: 1.6,
      }}>
        {text || 'Waiting for response…'}
        <span style={{ animation: 'blink 0.8s infinite', fontWeight: 700 }}>▌</span>
      </pre>
    </div>
  )
}

// ── Final structured result panel ─────────────────────────────────────────────
export function ResultPanel({ result }) {
  const [copied, setCopied] = useState(false)

  if (!result) return null

  const conf     = result.confidence?.toLowerCase() || 'medium'
  const cstyle   = CONF[conf] || CONF.medium
  const isInstant = result.source === 'pattern_match'

  // Parse remediation into numbered list items if possible
  const remediationLines = (result.remediation || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  function copyJson() {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E6DE',
      borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2A' }}>
          Analysis result
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {isInstant && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
              background: '#E1F5EE', color: '#085041',
            }}>
              ⚡ Instant — pattern match
            </span>
          )}
          {!isInstant && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
              background: '#EEEDFE', color: '#3C3489',
            }}>
              🤖 GPT-4o-mini
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
            background: cstyle.bg, color: cstyle.color,
          }}>
            {cstyle.label}
          </span>
        </div>
      </div>

      {/* ── Root cause ──────────────────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888780', marginBottom: 5,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🔍 Root cause
        </p>
        <div style={{
          background: '#FFF8F0', border: '1px solid #FAC775',
          borderRadius: 6, padding: '10px 14px',
          fontSize: 13, color: '#2C2C2A', lineHeight: 1.55,
        }}>
          {result.root_cause}
        </div>
      </div>

      {/* ── Affected component ──────────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888780', marginBottom: 5,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🧩 Affected component
        </p>
        <div style={{
          background: '#F6F5F0', borderRadius: 6, padding: '8px 14px',
          fontSize: 13, color: '#444441', fontWeight: 500,
        }}>
          {result.affected_component}
        </div>
      </div>

      {/* ── Remediation ─────────────────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888780', marginBottom: 5,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🛠 Remediation steps
        </p>
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 6, padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {remediationLines.length > 1
            ? remediationLines.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#15803D',
                    minWidth: 18, marginTop: 1,
                  }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.5 }}>
                    {line.replace(/^\d+\.\s*/, '')}
                  </span>
                </div>
              ))
            : (
                <p style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {result.remediation}
                </p>
              )
          }
        </div>
      </div>

      {/* ── Copy button ─────────────────────────────────────────────── */}
      <button
        onClick={copyJson}
        style={{
          alignSelf: 'flex-start', padding: '7px 16px', fontSize: 12, fontWeight: 500,
          background: copied ? '#DCFCE7' : '#F6F5F0',
          color: copied ? '#15803D' : '#444441',
          border: `1px solid ${copied ? '#BBF7D0' : '#D3D1C7'}`,
          borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {copied ? '✓ Copied!' : '📋 Copy JSON'}
      </button>
    </div>
  )
}
