# Typeform Clone

A working clone of Typeform: build forms in a drag-and-drop builder, publish them
to a public link, and collect responses through the one-question-at-a-time
conversational flow.

- **Frontend** — Next.js (App Router, TypeScript strict), Tailwind CSS, Framer Motion, dnd-kit, TanStack Query
- **Backend** — FastAPI, SQLAlchemy 2, Alembic, Pydantic v2
- **Database** — SQLite locally, hosted libSQL (Turso) in production — one `DATABASE_URL` switches between them

> **Live demo:** <https://typeform-clone-frontend-drab.vercel.app>
> — API at <https://typeform-clone-pramanikswapnil9-1372s-projects.vercel.app>
> (`/docs` for the OpenAPI browser). Frontend and API both run in Vercel's `bom1`
> region alongside the Turso database in Mumbai.

---

## Table of contents

1. [What it does](#1-what-it-does)
2. [Setup](#2-setup)
3. [Tech stack, and why](#3-tech-stack-and-why)
4. [Architecture](#4-architecture)
5. [Project structure](#5-project-structure)
6. [Layer breakdown](#6-layer-breakdown)
7. [App flow](#7-app-flow)
8. [Database schema](#8-database-schema)
9. [API overview](#9-api-overview)
10. [Design system](#10-design-system)
11. [Configuration](#11-configuration)
12. [Deployment](#12-deployment)
13. [Testing](#13-testing)
14. [Assumptions and deliberate scope decisions](#14-assumptions-and-deliberate-scope-decisions)

---

## 1. What it does

| Area | Feature | Status |
|---|---|---|
| **Builder** | Add, edit, reorder, duplicate and delete blocks | Built |
| | Eight question types + first-class ending blocks | Built |
| | Inline editing in a live preview (click the text and type) | Built |
| | Drag-and-drop reordering (pointer **and** keyboard) | Built |
| | Autosave on a 600ms debounce, with a Saving…/Saved indicator | Built |
| | Change a block's answer type in place | Built |
| | Add-element modal with the real product's block catalogue | Built |
| **Publishing** | Publish / unpublish; slug minted once and kept forever | Built |
| | Public fill page needing no account | Built |
| **Respondent flow** | One question at a time, directional enter/exit transitions | Built |
| | Keyboard-only completion: Enter, arrows, A–Z, 1–9, Y/N | Built |
| | Inline client validation, re-validated server-side | Built |
| | Optional welcome screen; endings rendered from data | Built |
| | `prefers-reduced-motion` honoured | Built |
| **Results** | Paginated responses table, single-response view | Built |
| | Per-question aggregates computed by the database | Built |
| | Completion rate from partial responses | Built |
| | CSV export (streaming) | Built |
| **Dashboard** | List/grid views, search, sort, row menu, delete confirmation | Built |
| | Row thumbnails tinted by each form's own theme colour | Built |
| | Dark mode | Built |
| **Coming Soon** | Logic jumps, integrations, workflow, embed, team features | Placeheld |

The last row is deliberate. Every unbuilt area has a styled panel where the real
product puts the feature, so its absence reads as a scope decision rather than as
an unfinished screen. See §14.

**Seeded demo data** — `python -m app.seed` creates two published forms covering
all eight question types, one draft, and 17 responses including two partials, so
the completion rate and the summary charts have something real to show.

---

## 2. Setup

Two processes: the API on `:8000`, the web app on `:3000`.

### Backend

> **Python 3.12 or 3.13 — not 3.14.** The libSQL driver used against Turso
> segfaults on connect under CPython 3.14, and Vercel's runtime is 3.12, so the
> local environment matches it.

```bash
cd backend
uv venv --python 3.12 && uv pip install -e .
cp .env.example .env                    # DATABASE_URL=sqlite:///./typeform.db
.venv/bin/alembic upgrade head          # create the schema
.venv/bin/python -m app.seed            # idempotent demo data
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local              # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open <http://localhost:3000>. The seeded forms are live at
`/f/customer-feedback-2f8a1c` and `/f/devcon-registration-7b41e9`.

### Checks

```bash
cd backend  && .venv/bin/python -m pytest tests   # 21 tests
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

---

## 3. Tech stack, and why

| Choice | Reason |
|---|---|
| **Next.js App Router** | The public fill page is server-rendered from the slug, so a shared link paints its first question with no client round trip and no session. |
| **TypeScript (strict)** | `src/types/index.ts` mirrors the Pydantic schemas; a backend field rename becomes a compile error rather than a runtime `undefined`. |
| **Tailwind + a CSS-variable token layer** | No component names a raw colour, so dark mode is one `data-theme` attribute rather than a per-component branch. |
| **Framer Motion** | `AnimatePresence` with a `custom` direction gives the enter/exit pair the flow needs; hand-rolling exit animations in React is where this would have gone wrong. |
| **dnd-kit** | Accessible out of the box — the block list reorders with the keyboard, not just the mouse. |
| **TanStack Query** | The builder's autosave is optimistic cache writes plus a debounced flush. Query already owns caching and invalidation, so no state-management library is needed anywhere in the app. |
| **FastAPI + Pydantic v2** | Request/response schemas double as the OpenAPI contract, which is what keeps the TypeScript mirror honest. |
| **SQLAlchemy 2 (sync)** | This workload is a handful of queries per request. An async engine would add colouring and connection-pool complexity for no measurable gain. |
| **Alembic** | The schema is versioned from the first commit, and the same migration runs against local SQLite and hosted libSQL. |
| **SQLite / libSQL** | Required by the brief, and libSQL is SQLite over the wire — so the dialect, models, migrations and seed script are byte-identical in both environments. |

Deliberately **not** used: Redis, Celery, Docker Compose, a state-management
library, a component library, a monorepo tool.

---

## 4. Architecture

```
┌─────────────────────────────── Browser ───────────────────────────────┐
│                                                                       │
│   /                    /forms/[id]/create        /f/[slug]            │
│   Dashboard            Builder                   Respondent flow      │
│       │                    │                          │               │
│       └────────┬───────────┘                          │               │
│                ▼                                      ▼               │
│        TanStack Query                          useFormFlow            │
│        (lib/queries.ts)                        (step machine)         │
│                │                                      │               │
│                └──────────────┬───────────────────────┘               │
│                               ▼                                       │
│                        lib/api.ts  ── lib/validation.ts               │
│                     (typed client)     (mirrors the server rules)     │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ HTTP / JSON
┌───────────────────────────────▼───────────────────────────────────────┐
│                             FastAPI                                   │
│                                                                       │
│   routers/forms.py      routers/questions.py    routers/public.py     │
│   routers/responses.py                                                │
│   ── parse, call a service, return. Nothing else. ──                  │
│                               │                                       │
│                               ▼                                       │
│   services/forms.py   services/questions.py   services/responses.py   │
│                       services/validation.py  ← the rules, stated once│
│                               │                                       │
│                               ▼                                       │
│                    models/ (SQLAlchemy) → db.py → SQLite / libSQL     │
└───────────────────────────────────────────────────────────────────────┘
```

**The layering rule.** `routers/` handles HTTP only. Anything with a name worth
saying out loud — `publish_form`, `duplicate_form`, `reorder_questions`,
`submit_response`, `summarize_form`, `validate_answer` — lives in `services/`,
takes and returns domain objects or Pydantic models, and knows nothing about
requests. Most routers are three lines.

**Two API surfaces, split at the router.**

- `/api/forms/*` — authoring. Full access to drafts, questions and responses.
- `/api/f/{slug}` — public. Published forms only. Never exposes a numeric form
  ID, never serves a draft, never returns a collected response.

A draft and a non-existent slug are both `404` on the public surface, on
purpose: it must not leak that unpublished work exists.

**One renderer, two consumers.** `components/render/QuestionRenderer.tsx` draws
every question block. The builder's live preview and the public fill page both
mount it and differ only by props — the preview passes `interactive={false}` plus
inline-editing callbacks. There is no second renderer, so the preview cannot
drift from what a respondent sees.

---

## 5. Project structure

```
.
├── README.md
├── backend/
│   ├── pyproject.toml               # deps and the supported Python range
│   ├── requirements.txt             # what Vercel's Python runtime installs
│   ├── vercel.json                  # routes every path to api/index.py; pins bom1
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py                   # URL from settings; JSONText → sa.Text()
│   │   └── versions/
│   │       ├── 0001_initial_schema.py
│   │       └── 0002_cascade_answers_on_question_delete.py
│   ├── tests/
│   │   ├── conftest.py              # throwaway SQLite per test, injected via DI
│   │   └── test_api.py              # 10 tests over the schema's invariants
│   └── app/
│       ├── main.py                  # build_app() factory: CORS + routers
│       ├── config.py                # settings from the environment
│       ├── db.py                    # engine, session dependency, FK pragma
│       ├── seed.py                  # idempotent demo data
│       ├── models/
│       │   ├── types.py             # JSONText column, QuestionType, FormStatus
│       │   ├── form.py              # forms, questions, question_options
│       │   └── response.py          # responses, answers
│       ├── schemas/
│       │   ├── form.py              # form + question in/out, PublicFormOut
│       │   └── response.py          # submission in, response/summary out
│       ├── services/
│       │   ├── forms.py             # CRUD, publish, unpublish, duplicate, slugs
│       │   ├── questions.py         # append, edit, soft delete, reorder
│       │   ├── responses.py         # submit, list, summarize, CSV export
│       │   └── validation.py        # validate_answer — the canonical rules
│       └── routers/
│           ├── deps.py              # session dependency + error translation
│           ├── meta.py              # /  and /api/health (with a db probe)
│           ├── forms.py             # /api/forms/*      authoring
│           ├── questions.py         # /api/questions/*  authoring
│           ├── responses.py         # /api/responses/*  authoring
│           └── public.py            # /api/f/{slug}     public
└── frontend/
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx                    # fonts, providers, no-flash theme script
        │   ├── providers.tsx                 # QueryClient + ToastProvider
        │   ├── globals.css                   # the design-token layer
        │   ├── page.tsx                      # dashboard
        │   ├── f/[slug]/page.tsx             # respondent flow (public, SSR)
        │   ├── f/[slug]/not-found.tsx        # unknown slug *or* draft
        │   └── forms/[id]/
        │       ├── create/page.tsx           # builder
        │       ├── connect/page.tsx          # Coming Soon
        │       ├── share/page.tsx            # public link + embed placeholders
        │       └── results/page.tsx          # responses + summary
        ├── components/
        │   ├── render/                       # SHARED by builder preview + fill page
        │   │   ├── QuestionRenderer.tsx
        │   │   ├── QuestionHeader.tsx        # inline numbered badge + title
        │   │   ├── OkButton.tsx
        │   │   ├── types.ts                  # the input contract
        │   │   └── inputs/
        │   │       ├── index.ts              # the type → component dispatch map
        │   │       ├── TextField.tsx         # borderless underline primitive
        │   │       ├── ShortTextInput.tsx    LongTextInput.tsx
        │   │       ├── EmailInput.tsx        NumberInput.tsx
        │   │       ├── ChoiceInput.tsx       DropdownInput.tsx
        │   │       └── YesNoInput.tsx        RatingInput.tsx
        │   ├── flow/
        │   │   ├── FormFlow.tsx              # the public experience
        │   │   ├── useFormFlow.ts            # the step machine
        │   │   ├── motion.ts                 # the step transition
        │   │   ├── ProgressBar.tsx           # top edge
        │   │   ├── NavChevrons.tsx           # bottom-right + Powered by
        │   │   ├── WelcomeScreen.tsx
        │   │   └── EndingScreen.tsx
        │   ├── builder/
        │   │   ├── useBuilder.ts             # editing model + autosave
        │   │   ├── FormShell.tsx             # Content · Connect · Share · Results
        │   │   ├── QuestionList.tsx          # left rail, dnd-kit
        │   │   ├── PreviewPane.tsx           # centre, editable in place
        │   │   ├── EditableChoiceList.tsx
        │   │   ├── SettingsPanel.tsx         # right panel
        │   │   ├── AddElementModal.tsx
        │   │   ├── SaveIndicator.tsx
        │   │   └── Toggle.tsx
        │   ├── dashboard/
        │   │   ├── Sidebar.tsx  FormTable.tsx  RowMenu.tsx
        │   ├── results/
        │   │   ├── ResponsesTable.tsx  ResponseDetail.tsx  SummaryPanel.tsx
        │   └── ui/
        │       ├── Button.tsx  Modal.tsx  Toast.tsx  Spinner.tsx
        │       ├── InlineText.tsx  EmptyState.tsx  ComingSoon.tsx
        │       ├── ThemeToggle.tsx  icons.tsx
        ├── lib/
        │   ├── api.ts                        # the only place that knows the API URL
        │   ├── validation.ts                 # mirror of services/validation.py
        │   ├── queries.ts                    # TanStack hooks + query keys
        │   ├── questionTypes.tsx             # block catalogue + groups
        │   ├── hooks.ts                      # hotkeys, debounce, media queries
        │   ├── theme.ts                      # light/dark external store
        │   └── format.ts                     # dates, percentages, cn()
        └── types/index.ts                    # mirrors the Pydantic schemas
```

---

## 6. Layer breakdown

### Backend

| File | Responsibility |
|---|---|
| `main.py` | Creates the `FastAPI` app, mounts CORS and the four routers. |
| `config.py` | `DATABASE_URL`, `CORS_ORIGINS`. One env var drives both environments. |
| `db.py` | Engine, `SessionLocal`, the `get_db` dependency, and the `PRAGMA foreign_keys=ON` listener SQLite needs for `ON DELETE CASCADE` to mean anything. |
| `models/types.py` | `JSONText` (JSON in a real `TEXT` column, compact separators), `QuestionType`, `FormStatus`. |
| `models/form.py` | `Form`, `Question`, `QuestionOption`. `Form.live_questions` filters soft-deleted rows. |
| `models/response.py` | `Response`, `Answer` — the typed answer columns and the snapshots. |
| `schemas/form.py` | Builder and dashboard payloads, plus `PublicFormOut` (no ID, no status). |
| `schemas/response.py` | `SubmissionIn`/`SubmissionOut`, `ResponsePage`, `FormSummaryStats`. |
| `services/forms.py` | `list_forms` (counts as correlated subqueries — one round trip), `publish_form`, `unpublish_form`, `duplicate_form`, `get_published_form`, slug minting. |
| `services/questions.py` | `add_question` at `max(position)+1`, `update_question` (type changes in place), `delete_question` (soft), `reorder_questions`. |
| `services/responses.py` | `submit_response` (validate → snapshot → store), `summarize_form` (aggregates batched one query per *kind* of question, not per question), `export_responses_csv` (streaming generator). |
| `services/validation.py` | `validate_answer(question, raw) -> TypedValue`. The rules, written once, in a docstring the TypeScript mirror points back to. |
| `routers/deps.py` | The session dependency and the three exception→HTTP translations. |
| `routers/*.py` | Parse, call a service, return. |
| `seed.py` | Idempotent: deletes only the three forms it owns, then rebuilds them from a fixed random seed so re-seeding reproduces the same charts. |

### Frontend

| File | Responsibility |
|---|---|
| `lib/api.ts` | Typed wrapper over every endpoint. `ApiError` carries the `question_id` the server rejected, so the flow can jump back to it. |
| `lib/validation.ts` | The client mirror. Instant feedback only — the server is the authority. |
| `lib/queries.ts` | Query keys and hooks. Every invalidation names a key from the same object. |
| `lib/hooks.ts` | `useHotkeys` (ignores keystrokes aimed at a focused field), `useDebouncedCallback` (the autosave), media-query hooks via `useSyncExternalStore`. |
| `components/render/inputs/index.ts` | The `QuestionType → Component` map. Adding a type is a module plus one line — never a new branch in a shared component. |
| `components/render/QuestionRenderer.tsx` | Badge, title, description, input, error, OK/Submit. Used by both consumers. |
| `components/flow/useFormFlow.ts` | Phase (`welcome` → `question` → `ending`), index, direction, answers, validation. Direction is state because the exit animation needs to know which way the respondent is travelling. |
| `components/flow/FormFlow.tsx` | Presentation and network only. Also sends the drop-out beacon. |
| `components/builder/useBuilder.ts` | Optimistic cache write + debounced flush; merges `settings` before sending, because the server replaces the whole JSON column. |
| `components/builder/PreviewPane.tsx` | Mounts `QuestionRenderer` with the editing callbacks. |
| `components/dashboard/RowMenu.tsx` | The row menu from the brief, verbatim, grouped as the real product groups it and Delete red below a separator. |
| `components/dashboard/FormThumbnail.tsx` | The row's colour block. The real product renders a miniature of the form; a solid block of its theme colour is the honest reduction. |
| `components/results/SummaryPanel.tsx` | Draws bars. Every number arrives pre-computed; the client does no aggregation. |

---

## 7. App flow

### Respondent: from `/f/{slug}` to a stored answer

1. **`app/f/[slug]/page.tsx`** (server component) calls `GET /api/f/{slug}`.
   `get_published_form` resolves the slug to a **published** form or raises; a
   draft and an unknown slug both become `404` → `not-found.tsx`.
2. **`FormFlow`** mounts with the public payload. `useFormFlow` starts at
   `welcome` if the form defines one, otherwise at the first question.
3. Each step renders through **`QuestionRenderer`**, which looks the input up in
   the dispatch map and autofocuses it.
4. The respondent answers. Enter (or a rating/yes-no keypress, after a beat)
   calls `advance()`, which runs **`validateAnswer`** from `lib/validation.ts`.
   A failure sets an inline error and the flow does not move.
5. On the last question, `FormFlow` POSTs to **`/api/f/{slug}/responses`**.
6. **`submit_response`** re-validates every answer server-side against the
   question it claims to answer, rejects answers naming a question that is not on
   this form, splits each value into its typed column, and **snapshots
   `question_title` and `question_type` onto the answer row**. It also checks
   that every required question was answered — including ones the client never
   sent.
7. A `422` comes back as `{question_id, message}`. `FormFlow` jumps the
   respondent back to that question and shows the message inline.
8. On success the server returns the **ending block as data**. The flow moves to
   the `ending` phase and renders it — there is no hardcoded thank-you page.
9. If the respondent leaves midway having answered something, a
   `visibilitychange` beacon posts `is_complete: false`. That partial row is what
   makes the completion rate meaningful.

```
welcome ──Enter──▶ question[0] ──✓──▶ question[n] ──✓ + POST──▶ ending
                       ▲   │                                      │
                       └───┘ back (direction = -1)          restart│
                       ▲                                          │
                       └──────────────────────────────────────────┘
```

### Creator: a keystroke to a persisted change

`InlineText` → `patchQuestion(id, patch)` → optimistic `setQueryData` (the
preview updates on the keystroke) → patch merged into a pending map → 600ms
debounce → one `PATCH /api/questions/{id}` per touched question → indicator
reads *Saved*.

---

## 8. Database schema

Five tables.

```sql
CREATE TABLE forms (
  id              INTEGER PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            VARCHAR(64) UNIQUE,             -- null until first publish
  status          VARCHAR(16) NOT NULL DEFAULT 'draft',   -- draft | published
  welcome_screen  TEXT,                           -- JSON, nullable
  theme           TEXT,                           -- JSON: colors, font
  created_at      DATETIME NOT NULL,
  updated_at      DATETIME NOT NULL,
  published_at    DATETIME
);
CREATE UNIQUE INDEX ix_forms_slug ON forms (slug);

CREATE TABLE questions (
  id           INTEGER PRIMARY KEY,
  form_id      INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  type         VARCHAR(32) NOT NULL,   -- short_text | long_text | multiple_choice
                                       -- | dropdown | email | number | yes_no
                                       -- | rating | ending
  title        TEXT NOT NULL,
  description  TEXT,
  required     BOOLEAN NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL,
  settings     TEXT,                   -- JSON: max_rating, multi_select, min, max…
  deleted_at   DATETIME                -- soft delete — see decision 2
);
CREATE INDEX ix_questions_form_position ON questions (form_id, position);

CREATE TABLE question_options (
  id           INTEGER PRIMARY KEY,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  position     INTEGER NOT NULL
);

CREATE TABLE responses (
  id            INTEGER PRIMARY KEY,
  form_id       INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  started_at    DATETIME NOT NULL,
  submitted_at  DATETIME,                       -- null = partial → completion rate
  is_complete   BOOLEAN NOT NULL DEFAULT 0,
  meta          TEXT                            -- JSON: user agent, referrer
);
CREATE INDEX ix_responses_form ON responses (form_id, submitted_at);

CREATE TABLE answers (
  id              INTEGER PRIMARY KEY,
  response_id     INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_title  TEXT NOT NULL,        -- snapshot at submit time — decision 2
  question_type   VARCHAR(32) NOT NULL, -- snapshot at submit time — decision 2
  text_value      TEXT,
  number_value    FLOAT,
  bool_value      BOOLEAN,
  option_ids      TEXT,                 -- JSON array, choice/dropdown
  display_value   TEXT NOT NULL,        -- rendered string for the results table
  UNIQUE(response_id, question_id)
);
CREATE INDEX ix_answers_question ON answers (question_id);
```

### Decision 1 — typed answer columns, not a JSON blob

A single `value TEXT` column holding JSON is faster to write and then punishes
you at the summary-statistics requirement: every count becomes a Python loop over
deserialised rows.

Typed columns make the aggregates the database's job:

```python
# services/responses.py — rating and number
select(func.avg(Answer.number_value),
       func.min(Answer.number_value),
       func.max(Answer.number_value)).where(Answer.question_id == question.id)
```

`display_value` is the denormalised rendered string (`"4/5"`, `"Yes"`,
`"Delivery speed, Packaging"`). The responses table and the CSV export both read
it directly, so rendering a row is one query with no per-cell type switch.

**Trade-off accepted:** `option_ids` is still a JSON array, because a
multi-select answer is genuinely multi-valued and there is nothing for SQL to
group on. Those rows are fetched once per form and tallied in Python;
everything else — `answered`, `AVG`/`MIN`/`MAX`, yes/no counts, and the ranked
text verbatims — is grouped across every question in a single statement. A join
table would let the database do that tally too, at the cost of a sixth table.

The batching is not cosmetic. Production is SQLite **over HTTP**, so every
statement is a network round trip; the summary endpoint originally issued one
query per question and one per choice option, which is 19 round trips for a
five-question form. It is 9 now, with byte-identical output.

### Decision 2 — answers must survive their questions

This is the trap in the assignment. A creator publishes a form, collects
responses, then edits or deletes a question. Historical answers now dangle, or
silently misreport what was asked.

Real Typeform solves this with **form versioning**: a submission is tied to the
version of the form that produced it. That is the right answer and it is more
than a 24-hour build. The equivalent here is:

- **Snapshot** `question_title` and `question_type` onto each answer at submit time
- **Soft-delete** questions (`deleted_at`) instead of hard-deleting them, so
  every `answers.question_id` still points at a real row
- The builder and the public form filter `deleted_at IS NULL`; the results view
  and the CSV read the snapshots

**What this buys:** rename a question after collecting responses and the results
table still shows what was actually asked. Delete it and the responses remain
intact and correctly labelled. This is covered by
`test_answers_survive_the_question_being_deleted`.

**Why `answers.question_id` still cascades.** Deleting a *question* is a soft
delete, so its row survives and its answers keep a valid target — that is the
whole point. A question row is only ever really removed when the entire form is
deleted, and at that moment its answers should go too. Without the cascade,
deleting a form that had collected responses fails with `FOREIGN KEY constraint
failed`. Covered by `test_deleting_a_form_that_has_responses_cascades`.

**What it does not buy:** you cannot reconstruct the whole form as it stood on a
given date, and an *option* renamed after the fact will change the label shown
for an old answer (only the question's title and type are snapshotted, not the
option list). Both are what full versioning would add.

### Decision 3 — integer positions, rewritten wholesale

Drag-and-drop sends the **complete ordered array** of question IDs to
`PUT /api/forms/{id}/questions/order`. The server asserts the array is exactly
the form's live questions, then rewrites every `position` in one transaction.

Fractional indexing is more elegant at scale and pointless at twelve questions —
and integers cannot drift into float-precision bugs during a demo. Rejecting a
partial array is what keeps positions dense and gap-free, which is what makes
integers safe here at all.

### Deliberately absent: a users table

There is no auth and no `users` table. See §14.

---

## 9. API overview

Interactive docs at `/docs` when the backend is running.

### Authoring surface — `/api/forms/*`

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/forms` | Dashboard list: status, question count, response count, completed count. Optional `?search=`. |
| `POST` | `/api/forms` | Create a draft (with one ending block, as the real app does). |
| `GET` | `/api/forms/{id}` | Full form + live questions + options, for the builder. |
| `PATCH` | `/api/forms/{id}` | Rename, theme, welcome screen — the target of the autosave. |
| `DELETE` | `/api/forms/{id}` | Delete the form; questions, options, responses and answers cascade. |
| `POST` | `/api/forms/{id}/duplicate` | Deep-copy questions and options into a new draft. Responses are never copied. |
| `POST` | `/api/forms/{id}/publish` | Mint a slug (once) and go live. `400` if the form has no answerable question. |
| `POST` | `/api/forms/{id}/unpublish` | Back to draft. **The slug is kept**, so a shared link survives republishing. |
| `POST` | `/api/forms/{id}/questions` | Append at `max(position) + 1`. |
| `PATCH` | `/api/questions/{id}` | Title, description, required, settings, options, **type**. |
| `DELETE` | `/api/questions/{id}` | Soft delete. |
| `PUT` | `/api/forms/{id}/questions/order` | Full ordered ID array → rewrite every position. |
| `GET` | `/api/forms/{id}/responses` | Paginated submissions (`page`, `page_size`). |
| `GET` | `/api/responses/{id}` | One submission in full. |
| `GET` | `/api/forms/{id}/summary` | Per-question aggregates + completion rate. |
| `GET` | `/api/forms/{id}/responses.csv` | Streaming CSV export. |

### Public surface — `/api/f/{slug}`

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/f/{slug}` | Published forms only, else `404`. No numeric ID in the payload. |
| `POST` | `/api/f/{slug}/responses` | Validate, snapshot, store, return the ending payload. |

`GET /api/health` returns `{"status": "ok"}`.

### Validation

One function — `validate_answer(question, raw) -> TypedValue` in
`services/validation.py` — knows what each question type accepts. The submit
endpoint calls it for every answer and it raises on invalid input.

Its **rules** (not its code) are mirrored in `frontend/src/lib/validation.ts` for
instant inline feedback. The rules are stated once, in that module's docstring,
and the TypeScript file points back to it. The brief asks for client *and* server
validation; this is how to have both without them silently drifting.

| Type | Rule |
|---|---|
| `short_text` | non-empty; ≤ `settings.max_length` (default 200) |
| `long_text` | non-empty; ≤ `settings.max_length` (default 2000) |
| `email` | matches `EMAIL_RE` |
| `number` | finite; within `settings.min` / `settings.max` |
| `yes_no` | boolean |
| `rating` | integer in `1..settings.max_rating` (default 5) |
| `multiple_choice` | one option ID, or many when `settings.multi_select`; every ID must belong to this question |
| `dropdown` | exactly one option ID belonging to this question |

Emptiness is checked first: blank + optional is valid and stores nothing; blank +
required raises. A `422` carries `{question_id, message}` so the flow can jump
back to the offending question.

---

## 10. Design system

All colour lives in `src/app/globals.css` as CSS variables, surfaced to Tailwind
through `@theme inline`. No component names a raw colour, which is why dark mode
is one attribute on `<html>`.

| Token group | Variables |
|---|---|
| Surfaces | `--tf-bg` (white: the flow, cards), `--tf-canvas` (chrome ground), `--tf-panel` (raised), `--tf-rail` (sidebars), `--tf-overlay` |
| Text | `--tf-ink`, `--tf-ink-strong`, `--tf-ink-muted`, `--tf-ink-faint` |
| Lines | `--tf-line`, `--tf-line-strong`, `--tf-groove` (the white gap between shell panels) |
| Chrome states | `--tf-muted` (hover), `--tf-muted-strong` (selected) |
| Accents | `--tf-accent`, `--tf-accent-ink`, `--tf-focus`, `--tf-danger`, `--tf-success` |
| Brand green | `--tf-brand`, `--tf-brand-ink`, `--tf-brand-soft`, `--tf-brand-line` |
| Informational blue | `--tf-info`, `--tf-info-ink`, `--tf-info-line` |
| Identity & AI chrome | `--tf-avatar-green`, `--tf-avatar-tan`, `--tf-ai-ring`, `--tf-ai-ring-soft` |
| Choice cards (flow only) | `--tf-choice-bg`, `--tf-choice-bg-hover`, `--tf-choice-bg-selected`, `--tf-choice-key-bg` |
| Motion | `--tf-step-duration`, `--tf-step-ease` |
| Radii | `--tf-radius`, `--tf-radius-lg` |

The light values are **sampled from the real product's dashboard** rather than
guessed: the warm charcoal `#3b333d` used for buttons and headings, the `#f7f7f8`
chrome ground, the `#377568` brand green, and the `#e5f0fd` informational tile.
The respondent flow keeps its own slightly warmer `choice` palette, because its
answer cards are warmer than the surrounding chrome in the real product too.

Notes worth stating:

- The app's own base rules live inside `@layer base` / `@layer components`.
  Unlayered CSS beats every layered rule regardless of specificity, which would
  otherwise make `focus:outline-none` unusable on the flow's borderless fields.
- **Theme without a flash:** an inline script in `layout.tsx` stamps
  `data-theme` before first paint; `lib/theme.ts` exposes it as an external
  store, so `ThemeToggle` needs no effect and no mount-state.
- **Reduced motion:** `motion.ts` swaps the translate-and-blur step for a plain
  cross-fade, and `globals.css` collapses transition durations.
- Icons are inline SVG in `ui/icons.tsx` — `currentColor`, so they theme for
  free, and no icon package for two dozen glyphs.

### Fidelity notes for the dashboard

The workspace is not a flat, full-bleed layout. The **account bar sits directly
on the white page**, and everything below it lives in a **rounded shell inset
16px from the window edges** on the `#f7f7f8` ground. Its radius is
`14px` — deliberately larger than the 8px on the pills and buttons it
contains, because a container rounded *less* than the controls inside it
reads as a square box with chipped corners. Inside
that shell, panels are divided by **2px white grooves** rather than grey rules —
the sidebar's right edge, the tabs row's bottom edge and the sidebar's own
section breaks all read as gaps cut through the grey, which is why they get their
own `--tf-groove` token. Rules *inside* content (the workspace header's underline)
stay grey.

Matched against a screenshot of the live product: a **full-width account bar**
(workspace chip, handle, Integrations, Brand kit, View plans, help, avatar), a
**full-width workspace nav beneath it** — Forms · Contacts · Automations ·
Insights, then a rule and the Research Flow demo entry — with the sidebar and
workspace pane sitting *below both*, not beside the nav. The sidebar carries the
Create form button, a borderless search row, a Workspaces tree under a
collapsible **Private** group, and, pinned to the bottom, the response meter with
its "Increase response limit" button and the Ask Typeform AI composer. The
workspace header is the title plus `⋯`, Invite and the plan gem, with the sort
control and a labelled List/Grid segmented toggle pushed right.

The list is **stacked cards, not a bordered table** — each row a white card with
an 8px gap, headed by a thumbnail tinted with the form's own theme colour.
Completed is a **percentage of responses** rather than a count, Updated is an
absolute date, and a form with no responses shows `–` in both columns rather
than a zero.

Chrome that the real product has and this build does not implement — Integrations,
Brand kit, View plans, Research Flow, Invite, the AI composer, Increase response
limit — is rendered in place and marked Coming Soon rather than omitted, so the
layout reads as the real thing.

### Fidelity notes for the respondent flow

Details verified against the live product and reproduced here: the numbered badge
sits **inline immediately before** the question text (not as a label above it);
the block is left-aligned in a column starting roughly a third across the
viewport; the input is borderless with an underline only; choice cards are full
width with the letter key in a white rounded square; the **progress bar runs
along the top edge**; the corner chevrons sit bottom-right beside the Powered-by
badge; the final question's button reads **Submit**, not OK.

---

## 11. Configuration

### `backend/.env`

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./typeform.db` | Production: `sqlite+libsql://<db>.turso.io?secure=true` |
| `DATABASE_AUTH_TOKEN` | unset | Turso token. Kept out of the URL — see below. |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated. Add the deployed frontend origin. |
| `CORS_ORIGIN_REGEX` | unset | Optional. Admits origins that change per deployment, e.g. `https://typeform-clone-frontend.*\.vercel\.app`. |

Turso issues the host and the token as two separate values, and they stay two
settings. A credential embedded in a connection string is easy to leak in a log
line and easy to mangle by hand. A token supplied the other way, as
`?authToken=` in the URL, is still honoured so that a string copied from Turso's
own docs keeps working.

### `frontend/.env.local`

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Read by the browser bundle *and* by the server component that renders `/f/[slug]`, so it must be publicly reachable. |

**Secrets.** The Turso auth token is part of `DATABASE_URL`. It belongs in the
host's environment settings, never in the repo — `.env` is gitignored, `.env.example`
is not and carries no real values. There is no secret on the frontend:
`NEXT_PUBLIC_*` is inlined into the client bundle by design, which is why the API
key surface is exactly zero.

---

## 12. Deployment

| Piece | Where | Notes |
|---|---|---|
| Next.js frontend | Vercel | Set `NEXT_PUBLIC_API_URL` to the deployed API origin. |
| FastAPI backend | Vercel, second project, root `backend/` | `vercel.json` **routes** every path to `api/index.py`, the serverless entrypoint that re-exports the ASGI app. |
| Database | Turso (hosted libSQL), AWS AP South (Mumbai) | SQLite over the wire. Data survives redeploys. |

**Both Vercel projects are pinned to `bom1` (Mumbai)** in their `vercel.json`,
matching the database's region. This is not cosmetic: Turso is SQLite *over
HTTP*, so every query is a network round trip, and the summary endpoint makes
19 of them. Same-region that is ~80ms; with the function in Vercel's default
`iad1` and the database in Mumbai it would be roughly four seconds. The rule
is that the database region follows the function, not the user — the browser
never talks to the database.

**Why not a file on disk.** Serverless functions have an ephemeral filesystem, so
a local `.db` file cannot persist in production on any serverless host. Turso
solves this without leaving SQLite — same dialect, same models, same migrations.
Render's free tier is not viable either: free instances cannot mount a persistent
disk and spin down after 15 minutes idle, so a SQLite file is wiped on every
redeploy and wake-up.

**Migrations in production.** Serverless has no release phase, so migrations are
run from a workstation pointed at the production database — the same command,
just a different `DATABASE_URL`:

```bash
cd backend
# Keep the production URL in .env.production (gitignored) so local dev's .env
# keeps pointing at the local file and can't be written to by accident.
set -a && . ./.env.production && set +a
.venv/bin/alembic upgrade head
.venv/bin/python -m app.seed
```

**Two gotchas worth knowing**, both hit during the real deployment:

* The dashboard hands you a `libsql://` URL; SQLAlchemy needs **`sqlite+libsql://`**.
* `sqlalchemy-libsql` folds the URL's query string into the URI it passes the
  driver, but the driver only reads the credential from an `auth_token` keyword
  argument — so a token left in the URL is rejected as an *"empty JWT token"*.
  `DATABASE_AUTH_TOKEN` is passed through `connect_args` instead; nothing else in
  the app has to know.
* The driver **segfaults on CPython 3.14**, which is why `requires-python` caps
  at `<3.14` and the local venv is 3.12, matching Vercel's runtime.
* Vercel vendors dependencies into its own `_vendor/` directory, where setuptools
  entry points are not discovered — so `sqlalchemy-libsql` never advertises the
  `sqlite+libsql` dialect and `create_engine` dies with
  `NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:sqlite.libsql`.
  `db.py` registers the dialect explicitly, which is lazy and therefore harmless
  in environments where the entry point does work.
* Vercel loads the serverless entrypoint **by file path**, putting that file's own
  directory on `sys.path` rather than the backend root, so `import app.*` fails.
  `api/index.py` prepends the root before importing anything.
* Settings are trimmed of whitespace and matching quotes. A credential pasted
  into a deployment dashboard reliably picks up a trailing newline, which reads
  as configured while the driver rejects it — a 349-character token that should
  have been 348, surfacing only as an opaque 401.
* Route with `routes`/`dest`, not `rewrites`/`destination`. A rewrite *replaces*
  the path before the function sees it, so every request arrives at the ASGI app
  as `/api/index` and FastAPI answers `{"detail":"Not Found"}` for the whole API
  while looking perfectly healthy. `routes` passes the original path through.

Set `CORS_ORIGINS` on the backend project to the deployed frontend origin plus
`http://localhost:3000`. Because Vercel mints a new hostname for every
deployment, an explicit list goes stale as soon as you push again — set
`CORS_ORIGIN_REGEX` as well so preview builds keep working:

```
CORS_ORIGINS       https://<frontend>.vercel.app,http://localhost:3000
CORS_ORIGIN_REGEX  https://typeform-clone-frontend-.*-<your-scope>\.vercel\.app
```

Vercel gives a project three kinds of hostname: a short random-word alias
(`typeform-clone-frontend-drab.vercel.app`), an account-scoped alias, and a URL
per deployment. **The short alias has no account suffix**, so a regex anchored on
the scope silently misses the very hostname you hand people — list it explicitly
in `CORS_ORIGINS`.

Anchor the regex on the **account-scoped** suffix, not just the project name.
`*.vercel.app` hostnames are global, so a pattern like
`https://typeform-clone-frontend.*\.vercel\.app` also matches
`typeform-clone-frontend.vercel.app`, which belongs to a different Vercel user
entirely — that origin would then be allowed to call this API from a browser.

---

## 13. Testing

`backend/tests/test_api.py` runs the API end to end against a throwaway SQLite
file, injected through the `get_db` dependency and configured with
`PRAGMA foreign_keys=ON` so cascades behave as they do in production. Twenty-one tests, each covering one
invariant the design rests on rather than one function:

| Test | Invariant |
|---|---|
| `test_publish_requires_at_least_one_question` | A form with only an ending cannot go live. |
| `test_publish_mints_a_slug_and_unpublish_keeps_it` | A shared link survives unpublishing; a draft is still `404` publicly. |
| `test_public_surface_never_exposes_the_numeric_id` | The public payload carries no `id` and no `status`. |
| `test_answers_survive_the_question_being_deleted` | **Decision 2.** Rename then delete a question; the answer keeps its original title and value. |
| `test_server_rejects_what_the_client_might_not` | Invalid email and a missing required answer both `422` with the question ID. |
| `test_choice_answer_must_belong_to_its_question` | A forged option ID is rejected. |
| `test_reorder_rewrites_every_position_and_rejects_partial_arrays` | **Decision 3.** Positions come back dense; a partial array is `400`. |
| `test_duplicate_copies_questions_but_not_responses` | Duplicates are drafts with no slug and no responses. |
| `test_summary_aggregates_and_partials_lower_the_completion_rate` | AVG/MIN/MAX are right and a partial drops the rate to 0.75. |
| `test_choice_counts_come_out_per_option` | Multi-select counts land on the right options. |
| `test_deleting_a_form_that_has_responses_cascades` | Deleting a form with collected answers succeeds and leaves no orphans. |
| `test_requirements_matches_pyproject_dependencies` | The two dependency lists cannot drift apart. |
| `test_libsql_driver_is_a_hard_dependency` | The Turso driver stays a hard dependency, not an optional extra. |
| `test_settings_tolerate_pasted_whitespace_and_quotes` | Env vars survive being pasted into a deployment dashboard. |
| `test_our_own_origins_are_allowed` | Production, preview and localhost origins all pass CORS. |
| `test_unrelated_origins_are_blocked` | An identically-named deployment owned by someone else does not. |

The frontend is covered by `tsc --noEmit`, ESLint (including the React hooks
rules) and a production build, all clean.

---

## 14. Assumptions and deliberate scope decisions

Every shortcut below is a decision, not an omission.

**1. A single creator, no auth.** The brief permits a default logged-in creator,
so there is no `users` table and no login. Every form belongs to the one implicit
creator. Half-built auth would cost hours and earn nothing on the rubric; adding
it later means a `user_id` foreign key on `forms` and a session dependency in
`routers/deps.py` — the layering already has the seam for it.

**2. Per-answer snapshots instead of form versioning.** See decision 2 in §8.
This is the highest-leverage trade-off in the project and its limits are stated
there.

**3. libSQL rather than a `.db` file in production.** Serverless filesystems are
ephemeral. Same dialect, so nothing about the code changes.

**4. Soft-deleted questions are never purged.** A deleted question's row stays
forever so its answers keep a valid foreign key. At real scale this wants a
retention job; at this scale it is a few rows.

**5. Option labels are not snapshotted.** Only `question_title` and
`question_type` are. Renaming an *option* after collecting responses changes the
label shown for old answers. Snapshotting labels too would be the next step.

**6. Choice counts are tallied in Python, not by the database.** `option_ids` is
a JSON array, so there is nothing for SQL to group on. One query per form brings
back the selections and they are counted in memory. A join table would let the
database do it, at the cost of a sixth table; every other statistic in the
summary is a real SQL aggregate.

**7. Partial responses come from a `visibilitychange` beacon.** Browsers do not
guarantee an unload beacon fires, so the completion rate is a good indicator, not
an audit trail.

**8. These panels are intentionally Coming Soon**, each placed where the real
product puts the feature:

| Placement | What is stubbed |
|---|---|
| Builder → *Connect* tab | Webhooks, Google Sheets, Slack, Zapier, HubSpot, Airtable |
| Settings panel → *Logic*, *Comments* | Branching and jump logic; per-block comments |
| Settings panel toggles | Randomize, "Other", "None", Vertical alignment — present but inert |
| Add-element modal | Picture Choice, NPS, Ranking, Matrix, Date, Signature, Payment, File Upload, Scheduler, Statement, Question Group, Redirect, Welcome Screen — shown greyed out in their real groups |
| Add-element modal tabs | *Import questions*, *Create with AI* |
| Share → *Embed & distribute* | Standard/popup/slider/side-tab embeds, email, QR |
| Dashboard nav | *Contacts*, *Automations*, *Insights*, *Research Flow* |
| Dashboard account bar | *Integrations*, *Brand kit*, *View plans*, help, the account switcher |
| Dashboard sidebar | *Ask Typeform AI*, *Increase response limit* |
| Workspace header | *Invite*, the workspace `⋯` menu |
| Row menu | *Workflow*, *Copy to*, *Move to* |
| Sidebar | *New workspace* |

**Nothing is silently dead.** A whole area — a workspace tab, the Connect screen
— gets the `ComingSoon` panel. An individual control that would otherwise sit
there inert stays pressable and answers with a toast naming the feature
(`Coming soon — Integrations`), because a button that does nothing when pressed
reads as a bug, while one that says why reads as a decision. Both come from
`components/ui/ComingSoon.tsx`, so the wording cannot drift.

The controls wired this way: the account switcher, Integrations, Brand kit, View
plans, Help and the avatar in the top bar; Research Flow and the plan gems; the
workspace `⋯`, Invite, New workspace, Increase response limit and the AI
composer; the per-row Integrations button; Workflow, Copy to and Move to in the
row menu; the Video segment, Randomize, "Other", "None", Vertical alignment, the
image slot, Logic and Comments in the settings panel; and every greyed-out block
type plus the Import questions and Create with AI tabs in the add-element modal.

**9. The top nav is Content · Connect · Share · Results.** The current product's
nav reads Content · Workflow · Connect. This keeps the same shape but gives the
results view a home, which the assignment explicitly asks for.

**10. The welcome screen is form-level data, not a question row.** It lives in
`forms.welcome_screen` as JSON, so the builder's selection is a discriminated
union rather than a question ID, and adding one is a form patch. Endings went the
other way — they *are* question rows — because a form may have several and they
need positions; a form has at most one welcome screen.

**11. Theme colours are stored per form but not yet editable.** `forms.theme`
holds JSON and the seed populates it; a colour picker in the settings panel is
the remaining work, and the schema needs no change for it.
