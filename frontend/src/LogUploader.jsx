import { useRef, useState } from 'react'
import { LogViewer } from './LogViewer'

const SAMPLE_LOG = `2024-01-15T10:28:01 INFO  auth: User login successful user_id=4821
2024-01-15T10:28:45 INFO  api: GET /api/orders 200 45ms
2024-01-15T10:29:01 WARN  db: Slow query detected 2340ms SELECT * FROM orders
2024-01-15T10:29:30 ERROR auth: connection refused postgres://db-host:5432/appdb
2024-01-15T10:29:31 ERROR auth: connection refused postgres://db-host:5432/appdb
2024-01-15T10:29:32 FATAL api: Unable to acquire DB connection after 3 retries`

export function LogUploader({ onLogsLoaded }) {
  const [dragging, setDragging]   = useState(false)
  const [text, setText]           = useState('')
  const [entries, setEntries]     = useState([])
  const [parseInfo, setParseInfo] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const fileRef = useRef()

  async function sendToParser(content) {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('http://localhost:8000/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Parse failed')
      setEntries(data.entries)
      setParseInfo(data)
      onLogsLoaded(content, data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFile(file) {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target.result
      setText(content)
      sendToParser(content)
    }
    reader.readAsText(file)
  }

  // ── Drag events ──────────────────────────────────────────────────────────
  function onDragOver(e)  { e.preventDefault(); setDragging(true)  }
  function onDragLeave()  { setDragging(false) }
  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Drop zone ─────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? '#085041' : '#C5C3BB'}`,
          borderRadius: 10, padding: '22px 16px', textAlign: 'center',
          background: dragging ? '#E1F5EE' : '#FAFAF7',
          cursor: 'pointer', transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
        <p style={{ fontSize: 13, color: '#444441', fontWeight: 500 }}>
          Drop a <code>.log</code> or <code>.txt</code> file here
        </p>
        <p style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>
          or click to browse · supports plaintext &amp; JSON-lines
        </p>
        <input
          ref={fileRef} type="file" accept=".log,.txt,.json"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
        />
      </div>

      {/* ── Paste area ────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9' }}>— or paste directly —</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={SAMPLE_LOG}
        rows={5}
        style={{
          width: '100%', padding: '10px 12px', fontSize: 11,
          fontFamily: 'Courier New, monospace', borderRadius: 8,
          border: '1px solid #D3D1C7', background: '#FAFAF7',
          resize: 'vertical', outline: 'none', color: '#444441',
          lineHeight: 1.55,
        }}
      />

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { if (text.trim()) sendToParser(text) }}
          disabled={!text.trim() || loading}
          style={{
            flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600,
            background: text.trim() && !loading ? '#085041' : '#C5C3BB',
            color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? '⏳ Parsing…' : '⚙ Parse Logs'}
        </button>
        <button
          onClick={() => { setText(SAMPLE_LOG); sendToParser(SAMPLE_LOG) }}
          disabled={loading}
          style={{
            padding: '9px 14px', fontSize: 12, fontWeight: 500,
            background: '#fff', color: '#444441',
            border: '1px solid #D3D1C7', borderRadius: 7, cursor: 'pointer',
          }}
        >
          Try sample
        </button>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '8px 12px', borderRadius: 6, fontSize: 12,
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Parse summary cards ───────────────────────────────────────── */}
      {parseInfo && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            ['Lines',    parseInfo.total_lines,    '#444441'],
            ['Parsed',   parseInfo.parsed_entries, '#085041'],
            ['Errors',   parseInfo.error_count,    '#DC2626'],
            ['Warnings', parseInfo.warn_count,     '#D97706'],
          ].map(([label, val, color]) => (
            <div key={label} style={{
              flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center',
              background: '#fff', border: '1px solid #E8E6DE',
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color }}>{val.toLocaleString()}</p>
              <p style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Virtualised log viewer ────────────────────────────────────── */}
      {entries.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#444441', marginBottom: 6 }}>
            Log preview
          </p>
          <LogViewer entries={entries} height={240} />
        </div>
      )}
    </div>
  )
}
