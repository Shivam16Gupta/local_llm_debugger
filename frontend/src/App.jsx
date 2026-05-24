import { useState } from "react"
import { LogUploader } from "./LogUploader"
import { ResultPanel } from "./ResultPanel"

export default function App() {
  const [logContent, setLogContent]   = useState("")
  const [parseData,  setParseData]    = useState(null)
  const [result,     setResult]       = useState(null)
  const [streaming,  setStreaming]    = useState(false)
  const [streamText, setStreamText]   = useState("")
  const [error,      setError]        = useState("")
  const [mode,       setMode]         = useState("stream")  // "stream" | "full"

  function handleLogsLoaded(content, parsed) {
    setLogContent(content)
    setParseData(parsed)
    setResult(null)
    setStreamText("")
    setError("")
  }

  async function handleAnalyze() {
    if (!logContent.trim()) return
    setResult(null)
    setStreamText("")
    setError("")

    if (mode === "stream") {
      setStreaming(true)
      try {
        const res = await fetch("http://127.0.0.1:8000/api/analyze/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: logContent }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Stream error")
        }

        const reader = res.body.getReader()
        const dec    = new TextDecoder()
        let   buf    = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = dec.decode(value)
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              buf += line.slice(6)
              setStreamText(buf)
            }
          }
        }

        // Try to parse the accumulated JSON
        try {
          setResult(JSON.parse(buf))
        } catch {
          setResult({ root_cause: buf, affected_component: "—", remediation: "—", confidence: "low" })
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setStreaming(false)
      }

    } else {
      // Full (non-streaming) mode
      try {
        const res  = await fetch("http://127.0.0.1:8000/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: logContent }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || "Analysis error")
        setResult(data)
      } catch (e) {
        setError(e.message)
      }
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#085041" }}>
          🔍 LLM Debugging Tool
        </h1>
        <p style={{ fontSize: 13, color: "#888780", marginTop: 4 }}>
          Paste your logs → get root cause analysis powered by GPT-4o-mini
        </p>
      </div>

      {/* Two column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Left – upload + parse */}
        <div>
          <SectionCard title="1. Upload & parse logs">
            <LogUploader onLogsLoaded={handleLogsLoaded} />
          </SectionCard>
        </div>

        {/* Right – analyse + result */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="2. Run analysis">
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["stream", "full"].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 500,
                  borderRadius: 6, border: "1px solid #D3D1C7", cursor: "pointer",
                  background: mode === m ? "#085041" : "#fff",
                  color: mode === m ? "#fff" : "#444441",
                }}>
                  {m === "stream" ? "⚡ Streaming" : "📦 Full response"}
                </button>
              ))}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!logContent || streaming}
              style={{
                width: "100%", padding: "10px 0", fontSize: 14, fontWeight: 700,
                background: logContent && !streaming ? "#085041" : "#C5C3BB",
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
              }}
            >
              {streaming ? "Analysing…" : "Analyse Logs →"}
            </button>

            {!logContent && (
              <p style={{ fontSize: 11, color: "#888780", textAlign: "center", marginTop: 8 }}>
                Parse logs first on the left →
              </p>
            )}

            {error && (
              <div style={{
                marginTop: 10, padding: "10px 14px", borderRadius: 6,
                background: "#FEE2E2", border: "1px solid #FCA5A5",
                fontSize: 12, color: "#B91C1C",
              }}>
                ⚠ {error}
              </div>
            )}
          </SectionCard>

          {(streaming || result) && (
            <ResultPanel result={result} streaming={streaming} streamText={streamText} />
          )}
        </div>
      </div>

    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E8E6DE", borderRadius: 10, padding: 18,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A", marginBottom: 14 }}>
        {title}
      </p>
      {children}
    </div>
  )
}
