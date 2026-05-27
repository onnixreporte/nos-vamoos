# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js with webpack)
npm run build    # Production build — run after every sprint to verify no compile errors
npm run lint     # ESLint check
npm start        # Start production server
```

No test suite is configured. Verification is done via `npm run build` + manual browser testing.

## Environment

Requires `.env` (or `.env.local`) with:
```
BOTMAKER_ACCESS_TOKEN=<token>
META_ACCESS_TOKEN=<meta marketing api token, ads_read>
META_AD_ACCOUNT_ID=<ad account id sin prefijo act_>
META_API_VERSION=v25.0
```

Todos los tokens se usan server-side — nunca se exponen al browser. Las llamadas a Botmaker pasan por `app/api/*` y las de Meta Marketing API por `app/api/meta/*`.

## Architecture

**Dashboard analytics for NosVamoos** (travel agency) powered by the [Botmaker](https://api.botmaker.com/v2.0/) chatbot platform API.

### Core principle

All pages are client components (`"use client"`) that fetch from Next.js API routes, which proxy to Botmaker with auth. There is no server-side rendering of data.

**Single source of truth:** Each page fetches its own data directly from `/api/chats` and `/api/agent-metrics`. All KPIs and charts are derived from that fetched data via `useMemo`.

### Route structure

```
app/
  page.tsx                    → redirects to /dashboard
  (dashboard)/
    layout.tsx                → shell: AppSidebar + TopBar + RefreshProvider
    dashboard/page.tsx        → KPIs overview, charts, activity timeline
    agentes/page.tsx          → agent performance metrics and table
    ventas/page.tsx           → sales analytics, conversion, revenue
    conversaciones/page.tsx   → conversation list with detailed metrics
    destinos/page.tsx         → destinations analysis
  api/
    chats/route.ts            → proxies GET /chats from Botmaker (paginated)
    agent-metrics/route.ts    → proxies GET /agent-sessions (paginated)
    agents/route.ts           → proxies GET /agents list
    messages/route.ts         → proxies GET /messages for a chat
```

### Data flow in pages

1. Component mounts → registers refresh callback via `useRefreshContext()`
2. `DateFilterBar` renders with presets (week/month/quarter/year/custom)
3. On filter change (400ms debounce): fetch API routes with date params + AbortController
4. Filter out test data (see `lib/test-contacts.ts` and `EXCLUDED_AGENT_NAMES` in `lib/dashboard-filters.ts`)
5. Aggregate data with `useMemo` via lib aggregation functions
6. Render charts and KPI cards

### API pagination

All Botmaker endpoints are cursor-paginated. Routes loop with `nextPage` parameter until no more pages (max 200 pages guard). Results are accumulated into a single array before returning.

### Key lib files

| File | Purpose |
|------|---------|
| `lib/fetch-with-retry.ts` | HTTP client with 3 retries, exponential backoff, 120s timeout |
| `lib/date-filters.ts` | Date range presets and builders |
| `lib/dashboard-filters.ts` | Filter options builder; `EXCLUDED_AGENT_NAMES` list |
| `lib/test-contacts.ts` | Test/demo contact IDs to exclude from all metrics |
| `lib/agent-aggregation.ts` | Group metrics by agentId |
| `lib/dashboard-aggregation.ts` | Group by time, channel, country, destination |
| `lib/sales-aggregation.ts` | Sales grouping by agent/destination/typification |

### Refresh system

`store/refresh-context.tsx` provides `RefreshProvider`. Pages call `registerRefresh()` on mount to register a callback. TopBar's refresh button calls `triggerRefresh()` which fires all registered callbacks.

### Styling

- Tailwind CSS v4 (`@import "tailwindcss"` in `globals.css`)
- Primary color: `HSL(347, 88%, 68%)` (pink/magenta) via CSS variables
- Chart colors: use `--chart-1` through `--chart-5` CSS variables for dark mode compatibility
- shadcn/ui components in `components/ui/`

### Types

`types/botmaker.ts` defines all API response types: `ChatWithMessagesResponse`, `AgentMetricsItem`, `AgentListItem`, `AgentSummary`, etc.

## Cursor skill

`.cursor/skills/crear-alcance-proyectos/` contains a skill for generating project scope documents ("alcances") in formal Spanish. Invoke it when asked to create an "alcance" or scope document.
