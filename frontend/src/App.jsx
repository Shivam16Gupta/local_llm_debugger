import { useState } from 'react'
import { LogUploader }            from './LogUploader'
import { ResultPanel, StreamingPanel } from './ResultPanel'

// ── Streaming fetch helper ────────────────────────────────────────────────────
async function analyzeStream(logText, onChunk, onDone, onError) {
  try {
    const res = await fetch('/api/analyze/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: logText }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Stream failed')
    }

    const reader = res.body.getReader()
    const dec    = new TextDecoder()
    let   buf    = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = dec.decode(value)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const chunk = line.slice(6)
        buf += chunk
        onChunk(buf)
      }
    }
    onDone(buf)
  } catch (e) {
    onError(e.message)
  }
}

export default function App() {
  const [logContent, setLogContent] = useState('')
  const [streaming,  setStreaming]  = useState(false)
  const [streamText, setStreamText] = useState('')
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState('')
  const [mode,       setMode]       = useState('stream')  // 'stream' | 'full'

  function handleLogsLoaded(content) {
    setLogContent(content)
    setResult(null)
    setStreamText('')
    setError('')
  }

  async function handleAnalyze() {
    if (!logContent.trim()) return
    setResult(null)
    setStreamText('')
    setError('')

    if (mode === 'stream') {
      setStreaming(true)
      await analyzeStream(
        logContent,
        (buf) => setStreamText(buf),           // onChunk
        (buf) => {                              // onDone
          setStreaming(false)
          try   { setResult(JSON.parse(buf)) }
          catch { setResult({ root_cause: buf, affected_component: '—', remediation: '—', confidence: 'low' }) }
        },
        (msg) => { setStreaming(false); setError(msg) } // onError
      )
    } else {
      // Full (non-streaming) mode
      try {
        const res  = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: logContent }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Analysis failed')
        setResult(data)
      } catch (e) {
        setError(e.message)
      }
    }
  }

  const canAnalyse = !!logContent && !streaming

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 16px 48px' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#085041', letterSpacing: '-0.5px' }}>
          🔍 LLM Debugging Tool
        </h1>
        <p style={{ fontSize: 13, color: '#888780', marginTop: 5 }}>
          Paste logs → get root cause analysis · powered by GPT-4o-mini
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {[
            ['⚡ Pattern pre-filter', '#E1F5EE', '#085041'],
            ['🤖 GPT-4o-mini',       '#EEEDFE', '#3C3489'],
            ['📡 SSE Streaming',     '#FEF9C3', '#A16207'],
          ].map(([label, bg, color]) => (
            <span key={label} style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, bg, color,
              background: bg,
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Two column layout ────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* Left — upload & parse */}
        <Card title="1 · Upload & parse logs">
          <LogUploader onLogsLoaded={handleLogsLoaded} />
        </Card>

        {/* Right — analyse & results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="2 · Run analysis">

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[
                ['stream', '⚡ Streaming (SSE)'],
                ['full',   '📦 Full response'],
              ].map(([val, label]) => (
                <button key={val} onClick={() => setMode(val)} style={{
                  flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                  borderRadius: 7, cursor: 'pointer',
                  border: mode === val ? '2px solid #085041' : '1px solid #D3D1C7',
                  background: mode === val ? '#085041' : '#fff',
                  color: mode === val ? '#fff' : '#444441',
                  transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Analyse button */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyse}
              style={{
                width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700,
                background: canAnalyse ? '#085041' : '#C5C3BB',
                color: '#fff', border: 'none', borderRadius: 8,
                cursor: canAnalyse ? 'pointer' : 'default',
                transition: 'background 0.15s',
                letterSpacing: '0.01em',
              }}
            >
              {streaming ? '⏳ Analysing…' : 'Analyse Logs →'}
            </button>

            {!logContent && (
              <p style={{ fontSize: 11, color: '#B4B2A9', textAlign: 'center', marginTop: 8 }}>
                Parse logs first using the panel on the left
              </p>
            )}

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 6, fontSize: 12,
                background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
              }}>
                ⚠ {error}
              </div>
            )}
          </Card>

          {/* Streaming skeleton */}
          {streaming && <StreamingPanel text={streamText} />}

          {/* Final result */}
          {!streaming && result && <ResultPanel result={result} />}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <p style={{ textAlign: 'center', fontSize: 11, color: '#C5C3BB', marginTop: 36 }}>
        Phase 3 complete · FastAPI + React + react-window + GPT-4o-mini SSE streaming
      </p>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E6DE',
      borderRadius: 12, padding: 20,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 14 }}>
        {title}
      </p>
      {children}
    </div>
  )
}
