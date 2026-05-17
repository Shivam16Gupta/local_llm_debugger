import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are a senior Site Reliability Engineer analysing application logs.
Given the log excerpt below, return ONLY valid JSON with exactly these keys:
- root_cause: one clear sentence explaining the most likely cause of the issue
- affected_component: the service or module most likely at fault
- remediation: a string with 2-3 numbered steps to fix the issue
- confidence: one of "high", "medium", or "low"

Respond ONLY with a JSON object. No preamble, no explanation, no markdown fences.
""".strip()


async def call_llm(log_chunk: str) -> str:
    """
    Send a log chunk to gpt-4o-mini and return the raw JSON string response.
    """
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=512,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Analyse these logs:\n\n{log_chunk}"},
        ],
    )
    return response.choices[0].message.content


async def call_llm_stream(log_chunk: str):
    """
    Stream tokens back from gpt-4o-mini.
    Yields raw content deltas as strings.
    """
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=512,
        stream=True,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Analyse these logs:\n\n{log_chunk}"},
        ],
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta