# spine-lab

> An alternative to doomscrolling. You're building a spine at the same time.

**Spine** is a reading-behavior-aware ArXiv feed for CS-AI researchers that gets smarter the more you read.

Not a discovery tool. Not a recommendation engine. A commitment layer.

---

## What this is

Most research tools help you find papers. This one makes you reckon with them.

Spine tracks how you actually read — dwell time per section, scroll depth, where you slow down and where you bail — and uses that signal to shape what you see next. No star ratings. No manual tagging. Just behavior.

After reading, you get nudged with four questions to take outside the app — to another LLM, a notebook, wherever:

- What's the problem?
- What's proposed?
- What's obvious?
- What's confusing?

Not in-app prompts. Not graded. Not judged. Just a reminder that "I read it" and "I understood it" are not the same thing — and that working through it elsewhere is the point.

---

## What this is not

- Not optimized for engagement
- Not a closed ecosystem — cross-checking with other tools and LLMs is actively encouraged, not just permitted
- Not trying to replace deep reading — trying to make it happen more often

---

## Philosophy

Addiction-by-design is failure. The gamification here does the bare minimum to keep you honest — reading streaks, depth scores — and nothing more. The goal is a user who needs the app less over time because they've internalized the habit, not one who can't leave because the loop is too tight.

Necessary friction is a feature. If you never read methodology sections, a summary isn't the answer. The app notices, and it nudges.

---

## Open Problems

These are unresolved design bets, not future features. They affect core decisions now.

**Signal quality.** Dwell time alone is noisy — a user who opens a paper and walks away looks identical to someone reading carefully. A secondary intent signal is required: did they stay in-app or open the PDF externally? Without this, the re-ranking loop can't trust its own inputs.

**Paper size ≠ complexity.** Some papers are long but straightforward; some are short but dense. The algorithm can't treat all dwell times uniformly — 3 minutes on a 4-page paper is different from 3 minutes on a 40-page one. Signal scores need to be normalized against page count, not raw time.

**Cold start trust.** Before behavioral signal accumulates, the feed defaults to seed topic + recency. That's fine. What's not fine is if the re-ranking kicks in too early on thin data and degrades quality before the user has given it enough signal to work with. Needs a confidence threshold before behavioral re-ranking takes effect.

---

## Stack

- **Backend:** FastAPI + PostgreSQL (Supabase)
- **Frontend:** React + Vite — served as static by FastAPI
- **Infra:** Docker single-image on port 8000, Railway (deploy)
- **Data source:** ArXiv API (CS.AI, no key required)

---

## Running

**Docker (recommended):**
```bash
bash scripts/dev.sh          # watch mode — backend reloads on change
docker compose up --build    # production build
```

**Local:**
```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

App runs on `localhost:8000` (Docker) or `localhost:5173` (local dev).

**Utilities:**
```bash
bash scripts/purge-null-images.sh   # clean dangling Docker images
```

---

## Current Status

Foundation, ArXiv integration, reader shell, and Docker infra are built.
Signal scoring runs on session close. Three reading modes: Read, Listen (TTS), Skim.

Active work: re-ranking confidence threshold, full paper rendering, gamification layer.

See [PIPELINE.md](./PIPELINE.md) for the full build checklist.

---

## Why

Because the best researchers aren't the ones who read the most papers.
They're the ones who know what they actually understood.

---

*Built by Abhinav Balakrishnan*
