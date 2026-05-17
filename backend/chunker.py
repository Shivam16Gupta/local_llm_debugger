from typing import List
from log_parser import LogEntry

MAX_TOKENS = 3000


def _estimate_tokens(text: str) -> int:
    """Rough estimate: ~4 characters per token (good enough for chunking)."""
    return max(1, len(text) // 4)


def get_relevant_chunk(entries: List[LogEntry]) -> str:
    """
    Filter to ERROR/WARN entries, then take the most recent ones
    that fit within MAX_TOKENS. Returns a plain string ready for the LLM.
    """
    important = {"ERROR", "FATAL", "WARN", "WARNING", "CRITICAL"}
    filtered = [e for e in entries if e.level in important]

    if not filtered:
        # Fall back to all entries if nothing is important
        filtered = entries

    # Newest first so we always include the most recent events
    filtered = list(reversed(filtered))

    lines = []
    total_tokens = 0
    for e in filtered:
        line = f"[{e.timestamp}] {e.level} {e.service}: {e.message}"
        tokens = _estimate_tokens(line)
        if total_tokens + tokens > MAX_TOKENS:
            break
        lines.append(line)
        total_tokens += tokens

    # Return in chronological order
    return "\n".join(reversed(lines))