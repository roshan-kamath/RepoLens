# RepoMind

I built this because I got tired of cloning a repo and spending the first hour just figuring out where things are. RepoMind lets you point it at any GitHub repository and just... ask questions about it. Like having a conversation with someone who's already read the whole codebase.

---

## What it does

Paste a GitHub URL, wait a minute or two for it to index, then ask things like:

- *"How does authentication work here?"*
- *"Where's the database configured?"*
- *"What happens when a user submits this form?"*

It reads the actual code, chunks it up, embeds it into a vector store, and uses LLaMA 3.3 (via Groq) to answer based on what's really in the repo — not a hallucinated guess.

---

## Stack

- FastAPI for the backend
- ChromaDB + HuggingFace `all-MiniLM-L6-v2` for embeddings and vector search
- Groq API (LLaMA 3.3 70b) for the answers — free and fast
- Plain HTML/CSS/JS for the frontend, no framework needed

---

## Getting started

You'll need Python 3.10+ and a free [Groq API key](https://console.groq.com).

```bash
git clone https://github.com/roshan-kamath/repo-assistant.git
cd repo-assistant
```

Copy the example env file and drop your key in:

```bash
cp .env.example .env
```

```
GROQ_API_KEY=your_key_here
```

Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Start the backend:

```bash
python -m uvicorn main:app --reload --port 8000
```

Open the frontend in another terminal:

```bash
cd ../frontend
python -m http.server 3000
```

Then go to `http://localhost:3000` and paste any public GitHub repo URL.

---

## A few things worth knowing

**First run is slow.** The HuggingFace embedding model (~90MB) downloads once on first use. After that it's cached and everything's faster.

**Big repos take longer.** Something like the FastAPI repo takes 1–2 minutes to index. A small personal project is usually under 30 seconds.

**It only reads code, not issues or PRs.** The context comes entirely from the files in the repository — README, source files, configs, etc.

**Answers aren't always perfect.** If the relevant code wasn't pulled into the context window, the answer might be incomplete. Asking more specific questions usually helps.

---

## Project layout

```
repo-assistant/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── ingest.py        # Clone, parse, embed
│   ├── retriever.py     # Vector search + prompt
│   ├── llm.py           # Groq integration
│   ├── summarizer.py    # Architecture summary
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
└── .env.example
```

---

Feedback is welcomed.