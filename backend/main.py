import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from log_parser import parse_logs
from chunker import get_relevant_chunk
from prefilter import quick_match
from llm_client import call_llm, call_llm_stream

app = FastAPI(
    title="LLM Debugging Tool",
    description="Paste logs → get root cause analysis powered by GPT-4o-mini",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,      # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ────────────────────────────────────────────────

class LogPayload(BaseModel):
    content: str


class ParseResponse(BaseModel):
    total_lines: int
    parsed_entries: int
    error_count: int
    warn_count: int
    entries: list


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    """Quick health-check — confirms the API is running."""
    return {"status": "ok", "message": "LLM Debugging Tool API is running"}


@app.post("/api/parse")
def parse(payload: LogPayload):
    """
    Parse raw log text into structured entries.
    Returns a summary + the full list of parsed entries.
    Useful for verifying the parser before calling the LLM.
    """
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Log content cannot be empty")

    entries = parse_logs(payload.content)
    if not entries:
        raise HTTPException(status_code=422, detail="No recognisable log lines found")

    return {
        "total_lines": len(payload.content.splitlines()),
        "parsed_entries": len(entries),
        "error_count": sum(1 for e in entries if e.level in ("ERROR", "FATAL", "CRITICAL")),
        "warn_count":  sum(1 for e in entries if e.level in ("WARN", "WARNING")),
        "entries": [e.to_dict() for e in entries],
    }
 
 
@app.post("/api/analyze")
async def analyze(payload: LogPayload):
    """
    Full analysis pipeline:
    1. Parse the raw log
    2. Run the fast pattern pre-filter
    3. If no pattern match → build a token-safe chunk and call the LLM
    Returns a structured JSON result with root_cause, affected_component,
    remediation, and confidence.
    """
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Log content cannot be empty")

    # Step 1 – parse
    entries = parse_logs(payload.content)
    if not entries:
        raise HTTPException(status_code=422, detail="No recognisable log lines found")

    # Step 2 – pre-filter (fast, free, no LLM call)
    quick = quick_match(payload.content)
    if quick:
        return {**quick, "parsed_entries": len(entries)}

    # Step 3 – build chunk and call LLM
    chunk = get_relevant_chunk(entries)
    if not chunk:
        chunk = "\n".join(
            f"[{e.timestamp}] {e.level}: {e.message}"
            for e in entries[:30]
        )

    raw_json = await call_llm(chunk)

    try:
        result = json.loads(raw_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"LLM returned non-JSON response: {raw_json[:200]}"
        )

    return {**result, "parsed_entries": len(entries), "source": "llm"}


@app.post("/api/analyze/stream")
async def analyze_stream(payload: LogPayload):
    """
    Streaming version of /api/analyze.
    Tokens are sent back via server-sent events (SSE) as they arrive
    from the LLM, so the UI can display them in real-time.
    """
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Log content cannot be empty")

    entries = parse_logs(payload.content)
    if not entries:
        raise HTTPException(status_code=422, detail="No recognisable log lines found")

    # Still run the pre-filter — if it matches, stream back the result instantly
    quick = quick_match(payload.content)
    if quick:
        async def instant():
            yield f"data: {json.dumps(quick)}\n\n"
        return StreamingResponse(instant(), media_type="text/event-stream")

    chunk = get_relevant_chunk(entries)

    async def generate():
        async for token in call_llm_stream(chunk):
            # SSE format: "data: <token>\n\n"
            yield f"data: {token}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")