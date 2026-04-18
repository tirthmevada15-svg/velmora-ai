"""
Velmora AI — FastAPI Backend
Run:  uvicorn server:app --reload --port 8000
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Velmora AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory sessions  (replace with Redis/DB for production)
sessions: dict = {}

API_KEY = os.getenv("OPENROUTER_API_KEY")

SYSTEM_PROMPT = """You are Velmora AI — a sharp, structured daily thinking partner.
Your job is to help users THINK clearly, PLAN concretely, EXECUTE tasks, and REVIEW progress.

Rules:
- Be direct and action-oriented. No filler phrases.
- Use bullet points / numbered steps / headers when it improves clarity.
- When the user is vague, ask exactly ONE clarifying question before proceeding.
- Adapt to the user's mode:
    THINK   → probe assumptions, surface the real problem, break it into pieces.
    PLAN    → produce a concrete, prioritised, sequenced action plan.
    EXECUTE → help draft, write, calculate, analyse, or decide right now.
    REVIEW  → summarise what was accomplished, what is pending, and recommend next focus.
"""


@app.get("/")
def health():
    return {"status": "Velmora Backend Running ✅"}


@app.post("/chat")
async def chat(request: Request):
    try:
        body    = await request.json()
        user_id = body.get("user_id") or str(uuid.uuid4())
        message = body.get("message", "").strip()
        mode    = body.get("mode", "think").lower()

        if not message:
            return {"reply": "No message provided.", "tasks": [], "user_id": user_id}

        if not API_KEY:
            return {
                "reply": (
                    "⚠️ OPENROUTER_API_KEY is not set.\n\n"
                    "Create a file called .env in the backend folder with:\n"
                    "OPENROUTER_API_KEY=your_key_here\n\n"
                    "Get a free key at https://openrouter.ai"
                ),
                "tasks": [],
                "user_id": user_id,
            }

        # First message → seed with system prompt
        if user_id not in sessions:
            sessions[user_id] = [{"role": "system", "content": SYSTEM_PROMPT}]

        sessions[user_id].append({
            "role": "user",
            "content": f"[Mode: {mode.upper()}] {message}",
        })

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type":  "application/json",
                "HTTP-Referer":  "http://localhost:3000",
                "X-Title":       "Velmora AI",
            },
            json={
                "model":    "meta-llama/llama-3-8b-instruct",
                "messages": sessions[user_id],
            },
            timeout=30,
        )

        data = response.json()
        print("\n[OpenRouter]", data, "\n")

        if "error" in data:
            err = data["error"].get("message", "Unknown error")
            return {"reply": f"⚠️ API Error: {err}", "tasks": [], "user_id": user_id}

        if not data.get("choices"):
            return {"reply": "⚠️ Empty response from AI.", "tasks": [], "user_id": user_id}

        reply = data["choices"][0]["message"]["content"]
        sessions[user_id].append({"role": "assistant", "content": reply})

        tasks = [
            line.strip()
            for line in reply.split("\n")
            if line.strip() and line.strip()[0] in ("1","2","3","4","5","-","•","*")
        ]

        return {"reply": reply, "tasks": tasks, "user_id": user_id}

    except requests.exceptions.Timeout:
        return {"reply": "⚠️ Request timed out. Please try again.", "tasks": [], "user_id": "error"}
    except Exception as e:
        print(f"[Backend Error] {e}")
        return {"reply": "⚠️ Backend error — check your terminal.", "tasks": [], "user_id": "error"}
