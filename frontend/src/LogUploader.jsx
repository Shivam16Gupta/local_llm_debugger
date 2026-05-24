import { useRef, useState } from "react"

const LEVEL_COLOR = {
  ERROR: "#DC2626", FATAL: "#991B1B", CRITICAL: "#DC2626",
  WARN: "#D97706",  WARNING: "#D97706",
  INFO: "#1D9E75",  DEBUG: "#888780",
}

export function LogUploader({ onLogsLoaded }) {
  const [dragging, setDragging]   = useState(false)
  const [text, setText]           = useState("")
  const [entries, setEntries]     = useState([])
  const [parseInfo, setParseInfo] = useState(null)
  const [loading, setLoading]     = useState(false)
  const fileRef = useRef()

  async function sendToParser(content) {
    setLoading(true)
    try {
      const res  = await fetch("http://127.0.0.1:8000/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Parse error")
      setEntries(data.entries)
      setParseInfo(data)
      onLogsLoaded(content, data)
    } catch (e) {
      alert("Parse error: " + e.message)
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

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handlePaste() {
    if (text.trim()) sendToParser(text)
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#085041" : "#C5C3BB"}`,
          borderRadius: 10, padding: "28px 16px", textAlign: "center",
          background: dragging ? "#E1F5EE" : "#FAFAF7",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <p style={{ fontSize: 14, color: "#444441" }}>
          📂 Drop a <strong>.log</strong> or <strong>.txt</strong> file here, or click to browse
        </p>
        <p style={{ fontSize: 12, color: "#888780", marginTop: 4 }}>
          Supports plaintext and JSON-lines formats
        </p>
        <input ref={fileRef} type="file" accept=".log,.txt,.json"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }} />
      </div>

      {/* Paste area */}
      <p style={{ fontSize: 12, color: "#888780", margin: "10px 0 4px", textAlign: "center" }}>
        — or paste log text directly —
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"2024-01-15T10:30:01 ERROR auth: connection refused\n{\"time\":\"2024-01-15T10:30:02\",\"level\":\"ERROR\",\"message\":\"timeout\"}"}
        rows={6}
        style={{
          width: "100%", padding: "10px 12px", fontSize: 12,
          fontFamily: "Courier New, monospace", borderRadius: 8,
          border: "1px solid #D3D1C7", background: "#FAFAF7",
          resize: "vertical", outline: "none",
        }}
      />
      <button
        onClick={handlePaste}
        disabled={!text.trim() || loading}
        style={{
          marginTop: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600,
          background: text.trim() ? "#085041" : "#C5C3BB",
          color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
          width: "100%",
        }}
      >
        {loading ? "Parsing…" : "Parse Logs"}
      </button>

      {/* Parse summary */}
      {parseInfo && (
        <div style={{
          marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap",
        }}>
          {[
            ["Total lines", parseInfo.total_lines, "#888780"],
            ["Parsed", parseInfo.parsed_entries, "#085041"],
            ["Errors", parseInfo.error_count, "#DC2626"],
            ["Warnings", parseInfo.warn_count, "#D97706"],
          ].map(([label, val, color]) => (
            <div key={label} style={{
              flex: 1, minWidth: 80, padding: "8px 12px", borderRadius: 8,
              background: "#fff", border: "1px solid #E8E6DE", textAlign: "center",
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color }}>{val}</p>
              <p style={{ fontSize: 11, color: "#888780" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Log preview list */}
      {entries.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#444441", marginBottom: 6 }}>
            Log preview ({entries.length} entries)
          </p>
          <div style={{
            maxHeight: 220, overflowY: "auto", borderRadius: 8,
            border: "1px solid #E8E6DE", background: "#FAFAF7",
          }}>
            {entries.map((e, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "5px 10px",
                borderBottom: "0.5px solid #EDEBE3", alignItems: "baseline",
                background: i % 2 === 0 ? "#FAFAF7" : "#fff",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, minWidth: 52,
                  color: LEVEL_COLOR[e.level] || "#888780",
                }}>
                  {e.level}
                </span>
                <span style={{ fontSize: 10, color: "#888780", minWidth: 60 }}>
                  {e.service}
                </span>
                <span style={{
                  fontSize: 11, fontFamily: "Courier New, monospace",
                  color: "#444441", overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {e.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
