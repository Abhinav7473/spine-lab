# Spine — Build Pipeline

Living checklist. Check off as things ship. Add ideas below the line.

---

## Foundation
- [x] PostgreSQL schema — papers, sessions, reading events, signals
- [x] Supabase — hosted Postgres, connected
- [x] FastAPI skeleton — feed, session tracking, user seed, papers endpoints
- [x] Docker — single image, port 8000, `docker compose watch` for dev

## ArXiv Integration
- [x] ArXiv API — pull CS.AI papers by seed topic, upsert to DB
- [ ] Rate limit handling — retry with backoff (partial — needs real test)
- [ ] Page count enrichment — fetch from PDF metadata to normalize dwell time

## Reader
- [x] React feed view — paper cards, ranked by signal score
- [x] In-app reader — three modes: Read, Listen (TTS), Skim
- [x] Silent tracking layer — dwell time, scroll depth, IntersectionObserver section tracking
- [x] Events logged to backend on session close
- [ ] Full paper rendering — parse ArXiv HTML, section by section (currently abstract only)

## Signal
- [x] Signal score computed on session close — normalized dwell × scroll depth × in-app multiplier
- [x] Cold start — seed topic + ArXiv recency
- [ ] Re-ranking confidence threshold — don't activate behavioral ranking until N sessions
- [ ] Feed updates on session open (currently manual refresh)
- [ ] Re-ranking tuning — test signal quality with real usage data

## Commitment Layer
- [x] Post-reading nudge — four questions, external (not in-app)
- [ ] Optional personal history log — track that nudge was shown, not the answers

## Minimum Viable Gamification
- [ ] Reading streak — days active, not papers consumed
- [ ] Depth score per paper — did they read past abstract?
- [ ] Nothing more

## Ship
- [ ] Deploy to Railway — single service, root Dockerfile
- [ ] One URL, works on mobile browser
- [ ] Show to Dr. Tianyi Li

---

## Backlog (captured, not forgotten, not built yet)

- Full paper in-app rendering — parse ArXiv HTML into sections
- Patron model for paper feasibility checking
- Limitations-based feed filtering
- AI section summaries — paid, API-gated
- Subscription model — free tier earns, paid tier accelerates
- Methodology section teaching mode
- Behavior data export for personal research
- Multi-topic seed onboarding
- Cross-tool encouragement UX
