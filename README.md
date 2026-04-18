# Velmora AI — Setup Guide

## Folder Structure (after extraction)

```
velmora-ai/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .env            ← YOU CREATE THIS (Step 1)
│
└── frontend/
    ├── package.json
    ├── public/
    │   ├── index.html
    │   └── logo.png    ← already included ✅
    └── src/
        ├── index.js
        ├── App.js
        ├── style.css
        └── DailyCopilot.jsx
```

---

## Step 1 — Create your .env file

Inside the `backend/` folder, create a file named `.env`:

```
OPENROUTER_API_KEY=paste_your_actual_key_here
```

**Get a free key:**
1. Go to https://openrouter.ai
2. Sign up / log in
3. Click **Keys** → **Create Key**
4. Copy and paste it into the `.env` file

---

## Step 2 — Start the Backend

Open a terminal:

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

✅ You should see: `Uvicorn running on http://0.0.0.0:8000`

Test it: open http://localhost:8000 in your browser.
You should see: `{"status":"Velmora Backend Running ✅"}`

---

## Step 3 — Start the Frontend

Open a **second** terminal (keep the backend running in the first):

```bash
cd frontend
npm install
npm start
```

✅ Browser opens automatically at http://localhost:3000

---

## Step 4 — Use the App

- Pick a **Mode** from the left sidebar (Think / Plan / Execute / Review)
- Type your message and press **Enter**
- The green dot in the top-right means backend is connected

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Logo not showing | `logo.png` must be in `frontend/public/` — it's already there in the zip ✅ |
| "Backend Offline" red dot | Make sure `uvicorn` is running on port 8000 |
| "OPENROUTER_API_KEY is not set" | Create `.env` in the `backend/` folder with your key |
| `npm install` fails | Make sure Node.js 16+ is installed: https://nodejs.org |
| `pip install` fails | Make sure Python 3.8+ is installed: https://python.org |
| Port 3000 already in use | React will ask to use another port — press Y |
| Port 8000 already in use | Run: `uvicorn server:app --reload --port 8001` and update the fetch URL in DailyCopilot.jsx |
