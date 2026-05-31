import { FixedSizeList as List } from 'react-window'
import { useRef, useEffect } from 'react'

const LEVEL_COLORS = {
  ERROR:    '#DC2626',
  FATAL:    '#991B1B',
  CRITICAL: '#DC2626',
  WARN:     '#D97706',
  WARNING:  '#D97706',
  INFO:     '#1D9E75',
  DEBUG:    '#888780',
}

const LEVEL_BG = {
  ERROR:    '#FEF2F2',
  FATAL:    '#FEF2F2',
  CRITICAL: '#FEF2F2',
  WARN:     '#FFFBEB',
  WARNING:  '#FFFBEB',
  INFO:     '#F0FDF4',
  DEBUG:    '#FAFAF7',
}

const VIRTUALISE_THRESHOLD = 5000  // lines above this get virtualised

// ── Single row rendered by react-window ──────────────────────────────────────
function LogRow({ index, style, data }) {
  const entry = data[index]
  const color = LEVEL_COLORS[entry.level] || '#888780'
  const bg    = LEVEL_BG[entry.level]    || '#FAFAF7'

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        padding: '0 12px',
        background: index % 2 === 0 ? bg : '#fff',
        borderBottom: '0.5px solid #EDEBE3',
        cursor: 'default',
      }}
    >
      {/* Level badge */}
      <span style={{
        fontSize: 10, fontWeight: 700, minWidth: 52, flexShrink: 0,
        color, letterSpacing: '0.03em',
      }}>
        {entry.level}
      </span>

      {/* Service */}
      <span style={{
        fontSize: 10, color: '#888780', minWidth: 64,
        flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {entry.service}
      </span>

      {/* Timestamp */}
      <span style={{
        fontSize: 10, color: '#B4B2A9', minWidth: 148,
        flexShrink: 0, fontFamily: 'Courier New, monospace',
      }}>
        {entry.timestamp}
      </span>

      {/* Message */}
      <span style={{
        fontSize: 11, fontFamily: 'Courier New, monospace',
        color: '#2C2C2A', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>
        {entry.message}
      </span>
    </div>
  )
}

// ── Column header row ─────────────────────────────────────────────────────────
function ListHeader() {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '6px 12px',
      background: '#2C2C2A', borderRadius: '6px 6px 0 0',
    }}>
      {[
        ['Level',     52],
        ['Service',   64],
        ['Timestamp', 148],
        ['Message',   null],
      ].map(([label, width]) => (
        <span key={label} style={{
          fontSize: 10, fontWeight: 600, color: '#888780',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          minWidth: width || undefined, flex: width ? undefined : 1,
        }}>
          {label}
        </span>
      ))}
    </div>
  )
}

// ── Main exported LogViewer ───────────────────────────────────────────────────
export function LogViewer({ entries, height = 280 }) {
  const listRef = useRef()

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (listRef.current && entries.length > 0) {
      listRef.current.scrollToItem(entries.length - 1, 'end')
    }
  }, [entries.length])

  if (!entries || entries.length === 0) return null

  const useVirtualisation = entries.length > VIRTUALISE_THRESHOLD

  return (
    <div style={{ borderRadius: 8, border: '1px solid #E8E6DE', overflow: 'hidden' }}>
      <ListHeader />

      {/* Entry count + virtualisation badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 12px', background: '#F6F5F0',
        borderBottom: '0.5px solid #E8E6DE',
      }}>
        <span style={{ fontSize: 11, color: '#888780' }}>
          {entries.length.toLocaleString()} entries
        </span>
        {useVirtualisation && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px',
            borderRadius: 99, background: '#EEEDFE', color: '#3C3489',
          }}>
            ⚡ Virtualised list
          </span>
        )}
      </div>

      {useVirtualisation ? (
        // react-window for large files — only renders visible rows
        <List
          ref={listRef}
          height={height}
          itemCount={entries.length}
          itemSize={32}
          itemData={entries}
          width="100%"
          style={{ background: '#fff' }}
        >
          {LogRow}
        </List>
      ) : (
        // Plain scrollable div for small files — simpler, no overhead
        <div style={{ maxHeight: height, overflowY: 'auto', background: '#fff' }}>
          {entries.map((entry, index) => (
            <LogRow
              key={index}
              index={index}
              style={{ position: 'relative', height: 32, width: '100%' }}
              data={entries}
            />
          ))}
        </div>
      )}
    </div>
  )
}
