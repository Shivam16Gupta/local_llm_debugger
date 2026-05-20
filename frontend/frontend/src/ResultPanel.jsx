const CONF_STYLE = {
  high:   { bg: "#DCFCE7", color: "#15803D" },
  medium: { bg: "#FEF9C3", color: "#A16207" },
  low:    { bg: "#FEE2E2", color: "#B91C1C" },
}

export function ResultPanel({ result, streaming, streamText }) {
  if (streaming) {
    return (
      <div style={{
        background: "#fff", border: "1px solid #E8E6DE", borderRadius: 10, padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#1D9E75",
            animation: "pulse 1s infinite",
          }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "#085041" }}>Analysing…</p>
        </div>
        <pre style={{
          fontSize: 12, fontFamily: "Courier New, monospace", whiteSpace: "pre-wrap",
          background: "#F6F5F0", padding: 12, borderRadius: 6, color: "#444441",
          minHeight: 80,
        }}>
          {streamText || "Waiting for response…"}
        </pre>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      </div>
    )
  }

  if (!result) return null

  const conf  = result.confidence?.toLowerCase() || "medium"
  const cstyle = CONF_STYLE[conf] || CONF_STYLE.medium
  const isInstant = result.source === "pattern_match"

  return (
    <div style={{
      background: "#fff", border: "1px solid #E8E6DE", borderRadius: 10, padding: 20,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#2C2C2A" }}>Analysis result</p>
        <div style={{ display: "flex", gap: 6 }}>
          {isInstant && (
            <span style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 99,
              background: "#E1F5EE", color: "#085041", fontWeight: 600,
            }}>
              ⚡ Instant match
            </span>
          )}
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 99,
            background: cstyle.bg, color: cstyle.color, fontWeight: 600,
          }}>
            {conf} confidence
          </span>
        </div>
      </div>

      {/* Root cause */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#444441", marginBottom: 6 }}>
        🔍 Root cause
      </p>
      <div style={{
        background: "#FFF8F0", border: "1px solid #FAC775", borderRadius: 6,
        padding: "10px 14px", fontSize: 13, color: "#2C2C2A", marginBottom: 14, lineHeight: 1.5,
      }}>
        {result.root_cause}
      </div>

      {/* Affected component */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#444441", marginBottom: 6 }}>
        🧩 Affected component
      </p>
      <div style={{
        background: "#F6F5F0", borderRadius: 6, padding: "8px 14px",
        fontSize: 13, color: "#444441", marginBottom: 14,
      }}>
        {result.affected_component}
      </div>

      {/* Remediation */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#444441", marginBottom: 6 }}>
        🛠 Remediation steps
      </p>
      <div style={{
        background: "#F6FEF9", border: "1px solid #BBF7D0", borderRadius: 6,
        padding: "10px 14px", fontSize: 13, color: "#2C2C2A", lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}>
        {result.remediation}
      </div>

      {/* Copy button */}
      <button
        onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
        style={{
          marginTop: 14, padding: "7px 16px", fontSize: 12, fontWeight: 500,
          background: "#F6F5F0", border: "1px solid #D3D1C7", borderRadius: 6,
          cursor: "pointer", color: "#444441",
        }}
      >
        📋 Copy JSON
      </button>
    </div>
  )
}
