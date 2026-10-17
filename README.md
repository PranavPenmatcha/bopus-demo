# BOPUS Dashboard (demo)

Lightweight client for searching BOPUS orders and viewing their details. It runs on dummy data for now.

```bash
npm install
npm run dev
```

- `src/pages/SearchPage.tsx`: filters, the results table, and Assign / Unassign / Download (CSV)
- `src/pages/OrderDetailsPage.tsx`: Customer and Order Details tabs, notes, cancel and reprint actions
- `src/api/types.ts`: the `BopusApi` interface, the single contract the UI uses
- `src/api/mockApi.ts` + `src/mocks/seed.ts`: in-memory fake backend (resets on reload)

To hook up the real API, write a `BopusApi` implementation and return it from `src/api/index.ts`.
