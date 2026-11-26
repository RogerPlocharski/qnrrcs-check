# QNRCS Cybersecurity Checklist

> Free web app for assessing an organisation's cybersecurity maturity against the Portuguese **National Cybersecurity Reference Framework (QNRCS)**, published by the National Cybersecurity Centre (CNCS).

**Live app: [ciberseguranca.itcomply.pt](https://ciberseguranca.itcomply.pt)** (interface in Portuguese)

No sign-up, no accounts, no ads. Answers stay in the browser of the person filling in the checklist, and nothing is sent to a server.

## Why

NIS2 brings many Portuguese organisations into scope for the first time, and the QNRCS is the national baseline they are assessed against. In practice that assessment usually happens in long spreadsheets. This app turns the full framework into a guided checklist that a consultant or an in-house IT team can complete in a browser and then hand over as a report.

## Features

- **The full framework.**
  - All **102 subcategories**, across the five objectives: Identify, Protect, Detect, Respond and Recover.
  - Each one shows the description and evidence for its three maturity levels, plus the related standard references (ISO/IEC 27001, NIST SP 800-53, CIS CSC, COBIT).
- **Dashboard.**
  - How much of the assessment is filled in, and the average maturity, which is weighted per subcategory.
  - Distribution by objective and by level.
- **Executive report.** A summary, charts and a *priority gaps* section that lists, for each unassessed subcategory, what is needed to reach Level 1.
- **Technical report.** Every subcategory in detail, with its evidence and notes.
- **Export / import.**
  - CSV for spreadsheets.
  - Full project export to JSON and import back, so an assessment can be resumed later or handed to a colleague. Projects saved in v1 format are migrated automatically.
- **Search and filters.**
  - Search ignores accents and also covers standard references, descriptions and evidence.
  - Status filters and expand/collapse all.
- **Accessibility.**
  - Colour pairs are checked against WCAG 2.1 AA in both light and dark themes.
  - Messages appear as toasts instead of blocking browser dialogs.

### Scoring rules

Besides the three maturity levels, two statuses are deliberately kept apart:

| Status | Meaning | Effect on score |
|---|---|---|
| **Does not exist** | Applies to the organisation, but the capability is missing | Counts as maturity 0 |
| **Not applicable** | Out of scope for the organisation | Excluded from the average |

The levels also depend on each other:
- **Level 2 replaces Level 1.** Ticking Level 2 also ticks Level 1.
- **Level 3 adds to Level 2.** It can only be ticked once Level 2 is met.
- **Unticking a level** also unticks the levels above it.
- **The level achieved** is the highest one with all lower levels met.

## Security notes

- **Reports.** All user-supplied content is HTML-escaped before it goes into a report. This prevents script injection through notes in an imported project.
- **Saved data.** Answers are stored under the subcategory code (`ID.GA-1`), not its full text, so wording fixes never invalidate saved assessments.

## Tech stack

TypeScript · React 19 · TanStack Start (SSR) · Tailwind CSS 4 · shadcn/ui · Recharts · deployed as a Cloudflare Worker

## Run locally

```sh
bun install        # npm install also works
bun run dev
```

## Deploy

The build uses Nitro's `cloudflare-module` preset and produces a Worker ready to publish:

```sh
bun run build
npx wrangler deploy --config .output/server/wrangler.json
```

`VITE_SITE_URL` (optional) overrides the public URL used in Open Graph tags. It defaults to `https://ciberseguranca.itcomply.pt`.

## Disclaimer

This is a self-assessment tool with no official link to CNCS. Results are not a certification and do not replace a formal audit. The framework content (`src/data/checklist.json`) belongs to CNCS. Always check the [official QNRCS publication](https://www.cncs.gov.pt) as the authoritative source.

## Author

**Roger Rosa**, Network & Cybersecurity Technician
[LinkedIn](https://www.linkedin.com/in/rogerplocharski) · [rogerrosa.pt](https://rogerrosa.pt)
