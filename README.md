# AI Career Coach

AI-powered career guidance with five workflows: **resume feedback**, **skill-gap analysis**, **career roadmaps**, **interview prep** and **interview-answer feedback**, across six situation presets (new grad, career changer, experienced professional, returning after a break, moving into leadership, switching industries).

**Stack:** React (Vite) · Tailwind + shadcn-style UI (Radix primitives) · Clerk (auth) · Node/Express API · OpenAI API · Supabase (Postgres).

```
Browser (React) ── Clerk session token ──► Express API ──► OpenAI (structured JSON outputs)
                                              │
                                              └──► Supabase Postgres (service-role key, server-side only; RLS denies the anon key)
```
**Why a backend?** The OpenAI key and the Supabase service-role key must never reach the browser. The API verifies the Clerk token on every request, enforces per-user quotas, calls OpenAI, validates the answer against a schema, then saves it.

## Quick start (no accounts needed)
Needs Node 20+. With no keys configured the app runs in **demo mode**: demo sign-in, an offline rule-based "coach" engine instead of OpenAI, and an in-memory store. It is for trying the app only.
```powershell
npm run install:all
cd server;  copy .env.example .env      # (macOS/Linux: cp)  leave the keys empty
npm start                               # API on :4000
# second terminal
cd client;  npm run dev                 # app on http://localhost:5173
```

## Real setup
1. **Clerk** – create an application at clerk.com. Put the *publishable key* in `client/.env` (`VITE_CLERK_PUBLISHABLE_KEY`) and in `server/.env` (`CLERK_PUBLISHABLE_KEY`; the server derives the issuer from it and verifies tokens against Clerk's public JWKS). Optionally set `CLERK_AUTHORIZED_PARTIES` to your frontend origin(s).
2. **Supabase** – create a project, run `server/supabase/migrations/001_init.sql` in the SQL editor, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`. The service-role key is server-only. The tables have RLS enabled with no policies, so the public anon key can read/write nothing.
3. **OpenAI** – set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`). Watch your usage: `DAILY_LIMIT` (default 25 analyses/user/24h) and `RATE_PER_MINUTE` protect your bill.
4. Set `NODE_ENV=production` when deploying. The server then **refuses to start** with demo auth or the in-memory store.

Docker: `cp server/.env.example server/.env`, fill it in, `docker compose up --build`, open http://localhost:8080.

## Try the OpenAI code path without a key
`npm run dev:fake-openai` starts a local OpenAI-compatible server; run the API with `AI_ENGINE=openai OPENAI_API_KEY=x OPENAI_BASE_URL=http://localhost:4011/v1`.

## What's where
| Area | Files |
|---|---|
| Workflows & prompts | `server/src/ai/` (`prompts.js`, `openai.js`, `mock.js`, `skills.js`), `server/src/schemas.js`, `server/src/scenarios.js` |
| Auth | `server/src/middleware/auth.js` (Clerk RS256 JWT verification), `client/src/lib/auth.jsx`, `ClerkAuth.jsx` |
| Storage | `server/src/store/` (`supabase.js`, `memory.js`), `server/supabase/migrations/001_init.sql` |
| UI primitives (shadcn-style) | `client/src/components/ui/` – button, card, input, textarea, label, badge, tabs, dialog, accordion, progress, skeleton, separator, alert, select, toaster |
| App components | `client/src/components/` – ScoreRing, TagInput, ScenarioPicker, FormField, ErrorAlert, EmptyState, ConfirmDialog, CopyButton, QuotaBadge, EngineBadge, ResultsSkeleton, PageHeader, report renderers… |

## How the AI is kept honest and safe
- **Structured outputs:** OpenAI is called with a strict JSON schema; every reply is validated with the same zod schema, numbers are clamped, and invalid/truncated replies are retried, then reported as a clean error (nothing saved, no quota used).
- **Prompt-injection:** resumes and job posts are wrapped in `<user_data>` tags, the system prompt says to treat them as data, and the tags are stripped from user text.
- **No invented facts / links:** prompts forbid inventing employers or credentials and forbid URLs (resources are given as titles + search hints). Rewrites use `[brackets]` for numbers the user must supply.
- **Cost control:** per-user per-minute rate limit and a daily quota kept in an append-only usage log (deleting reports does *not* refund quota).
- **Errors:** upstream error bodies and keys never reach the client.

## Tests
```bash
npm run test:server    # 42 tests: engine behaviour, OpenAI client (vs a fake OpenAI server: retries, 429/5xx, refusals,
                       #   timeouts, bad JSON, strict-schema checks), Clerk-style JWT verification (expired/forged/alg=none/
                       #   wrong issuer…), every REST route, user isolation, quotas, store contract
npm run test:client    # 56 tests: UI primitives, TagInput, all five workflows, history/report/dashboard, auth + route protection
server/test/support/run-supabase-tests.sh   # +8 tests on a real Postgres + PostgREST: the SQL migration, the store contract,
                       #   Row Level Security (anon key blocked), constraints, full API on Supabase  (Linux; see the script header)
npm run smoke          # end-to-end checks against a running stack
```

## Known limitations
- **Offline engine ≠ AI.** It is rule-based (skills taxonomy + text heuristics) and far less nuanced than an LLM. The UI labels it clearly. Real quality depends on the OpenAI model and prompts, which I could not evaluate here.
- **Not verified against the live services:** Clerk's hosted sign-in UI and JWKS endpoint, OpenAI's real API, and Supabase Cloud. These were tested via equivalents: locally generated RS256 keys, a fake OpenAI server, and real Postgres + PostgREST. Expect to do a first-run check with your own keys.
- Resume input is pasted text or a `.txt`/`.md` file; PDF/Word parsing is not included.
- The daily quota check is not atomic: concurrent requests from one user could exceed it by a few.
- Docker files were written but not executed here.
- Reports are stored as plain JSON in your database; the app warns users not to paste sensitive data, but add retention/GDPR handling before real use.
