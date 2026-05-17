import re
from typing import Optional, Dict

KNOWN_PATTERNS = [
    (
        re.compile(r"OOMKilled|out of memory|MemoryError", re.I),
        "Memory limit exceeded — process was killed by the OOM killer",
        "Pod / container",
        "1. Increase memory limits in deployment config\n2. Profile the process for memory leaks\n3. Add resource requests/limits if missing",
    ),
    (
        re.compile(r"connection refused|ECONNREFUSED|connect ETIMEDOUT", re.I),
        "Downstream service is unreachable or not accepting connections",
        "Network / service mesh",
        "1. Verify target service is running and healthy\n2. Check firewall rules and security groups\n3. Review service discovery / DNS resolution",
    ),
    (
        re.compile(r"5\d{2}.*repeated|repeated.*5\d{2}|HTTP 5\d{2}", re.I),
        "Sustained 5xx error burst from upstream service",
        "API gateway / upstream service",
        "1. Check upstream service logs for root cause\n2. Verify request payload and headers\n3. Enable circuit breaker if not already in place",
    ),
    (
        re.compile(r"disk.*(full|space|quota)|no space left", re.I),
        "Disk is full or quota exceeded",
        "Host / storage layer",
        "1. Free disk space — clear old logs, temp files\n2. Expand volume or add additional storage\n3. Set up disk-usage alerts to prevent recurrence",
    ),
    (
        re.compile(r"database.*connect|connect.*database|too many connections|SQLSTATE", re.I),
        "Database connection failure or pool exhaustion",
        "Database / connection pool",
        "1. Check DB server is running and reachable\n2. Increase connection pool size in app config\n3. Look for connection leaks in application code",
    ),
    (
        re.compile(r"permission denied|Access denied|403 Forbidden|unauthorized", re.I),
        "Permission or authentication failure",
        "Auth / IAM layer",
        "1. Verify credentials and API keys are current\n2. Check IAM roles and policy attachments\n3. Review recent permission changes",
    ),
    (
        re.compile(r"timeout|timed out|deadline exceeded", re.I),
        "Operation timed out — downstream is slow or unresponsive",
        "Upstream service / network",
        "1. Check downstream service latency and health\n2. Increase timeout thresholds if appropriate\n3. Add retry logic with exponential backoff",
    ),
]


def quick_match(raw_log: str) -> Optional[Dict]:
    """
    Run fast local regex checks before calling the LLM.
    Returns a result dict (same shape as the LLM response) if a known
    pattern is matched, otherwise returns None.
    """
    for pattern, cause, component, fix in KNOWN_PATTERNS:
        if pattern.search(raw_log):
            return {
                "root_cause": cause,
                "affected_component": component,
                "remediation": fix,
                "confidence": "high",
                "source": "pattern_match",   # lets the UI show "instant match" badge
            }
    return None