import re
import json
from dataclasses import dataclass
from typing import List


@dataclass
class LogEntry:
    timestamp: str
    level: str
    service: str
    message: str

    def to_dict(self):
        return {
            "timestamp": self.timestamp,
            "level": self.level,
            "service": self.service,
            "message": self.message,
        }


# Matches: 2024-01-15T10:30:00 ERROR some message
#      or: 2024-01-15 10:30:00 WARN  some message
PLAIN_RE = re.compile(
    r"(?P<ts>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})"
    r".*?(?P<lvl>INFO|WARN|WARNING|ERROR|FATAL|DEBUG|CRITICAL)"
    r"\s+(?P<svc>[a-zA-Z0-9_\-\.]+:)?"   # optional service prefix like "auth:"
    r"\s*(?P<msg>.+)",
    re.IGNORECASE,
)


def parse_logs(raw: str) -> List[LogEntry]:
    entries = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue

        # Try JSON-lines first
        try:
            obj = json.loads(line)
            level = obj.get("level", obj.get("severity", "INFO")).upper()
            entries.append(LogEntry(
                timestamp=obj.get("time", obj.get("timestamp", obj.get("@timestamp", ""))),
                level=level,
                service=obj.get("service", obj.get("logger", obj.get("app", "app"))),
                message=obj.get("message", obj.get("msg", str(obj))),
            ))
            continue
        except (json.JSONDecodeError, ValueError):
            pass

        # Fallback: plaintext regex
        m = PLAIN_RE.search(line)
        if m:
            svc_raw = m.group("svc") or ""
            entries.append(LogEntry(
                timestamp=m.group("ts"),
                level=m.group("lvl").upper(),
                service=svc_raw.rstrip(":") or "app",
                message=m.group("msg").strip(),
            ))

    return entries


def filter_important(entries: List[LogEntry]) -> List[LogEntry]:
    """Keep only ERROR, FATAL, WARN entries for LLM analysis."""
    important = {"ERROR", "FATAL", "WARN", "WARNING", "CRITICAL"}
    return [e for e in entries if e.level in important]