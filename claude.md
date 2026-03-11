# claude.md — AI Guidance File for BudgetFlow

This file documents how AI (Claude by Anthropic) was used to assist in building this project.

---

## Project Context Given to AI

```
Build a personal budget tracker web app.
Stack: React (Vite) + Python Flask + SQLite
Features:
- User registration/login
- Onboarding: user sets monthly salary + custom budget categories
- Each category has a monthly budget (fixed ₹ or % of salary)
- Add income/expense transactions
- Dashboard: balance, income, expense, budget bars per category, monthly trend
- Search & filter transactions
- Over-budget warnings
- CSV export
- Clean, modern dark UI
```

---

## Prompting Approach

### 1. Iterative feature building
Started with a minimal working app (no auth, in-memory storage), then layered on:
- SQLite persistence
- User authentication
- Onboarding flow
- Budget tracking per category
- Charts and export

### 2. Debugging with AI
Shared exact error messages and terminal output. Key issues resolved:
- CORS policy blocking frontend→backend requests
- Flask running on wrong port / routes returning 404
- Mixed async/await + .then() syntax bug in React

### 3. Architecture questions
Asked AI to recommend between SQLite vs PostgreSQL, JWT vs session tokens, and single-file vs multi-file React — with tradeoffs explained before deciding.

---

## Constraints Given to AI

- Keep dependencies minimal (no ORMs, no external auth libraries)
- All data must be per-user (no shared data between accounts)
- Budget warnings should not block transactions — only warn
- UI must be dark-themed, modern, and production-quality
- Single App.jsx file for simplicity

---

## Coding Standards Enforced

- Flask routes follow REST conventions (`GET /api/resource`, `POST /api/resource`, `DELETE /api/resource/:id`)
- All API responses return JSON with consistent shape: `{ data }` on success, `{ error: "message" }` on failure
- Frontend uses token stored in `localStorage` with `Authorization: Bearer <token>` header
- No hardcoded user data — everything scoped by `user_id` from session
- SQL uses parameterized queries only (no string interpolation — prevents SQL injection)

---

## Risks Identified by AI

1. **Token storage in localStorage** — Vulnerable to XSS. In production, use httpOnly cookies.
2. **SHA-256 password hashing** — Should use bcrypt with salt in production.
3. **No rate limiting** — Login endpoint is brute-forceable. Add Flask-Limiter in production.
4. **SQLite concurrency** — Not suitable for multi-user production. Use PostgreSQL.
5. **CORS open to all origins** — Locked down to specific origin in production.
