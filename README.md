# QNRCS Cybersecurity Checklist

> Free web app for assessing an organisation's cybersecurity capabilities against the Portuguese **National Cybersecurity Reference Framework (QNRCS)**, published by the National Cybersecurity Centre (CNCS).

**Live app: [ciberseguranca.itcomply.pt](https://ciberseguranca.itcomply.pt)** (interface in Portuguese)

## Why

NIS2 brings many Portuguese organisations into scope for the first time, and the QNRCS is the national baseline they are assessed against. In practice that assessment usually happens in long spreadsheets. This app turns the full framework into a guided checklist that a consultant or an in-house IT team can complete in a browser and then hand over as a report.

## Features

- **The full framework.** All **102 subcategories** across the five objectives: Identify, Protect, Detect, Respond and Recover.
- **Maturity scoring.** Each subcategory is rated against the framework's three maturity levels (Initial, Intermediate, Advanced), and the descriptions of each level are shown inline.
- **Dashboard.** Progress and maturity by objective and category, plus counts per level.
- **Search and filters** across objectives, categories and subcategories, with notes on each item.
- **Reports.**
  - Executive and technical reports, both exportable to PDF.
  - CSV export.
  - Full project export to JSON and import back, so an assessment can be paused, shared or archived.
- **Private by design.**
  - No accounts and no backend database.
  - Assessment data stays in the browser (`localStorage`) until you export it.

## Tech stack

TypeScript · React · TanStack Start/Router · Tailwind CSS · shadcn/ui · Vite · deployed on Cloudflare

## Run locally

```sh
bun install
bun run dev
```

`npm install && npm run dev` also works. Use `bun run build` for a production build.

## Content

The checklist content (`src/data/checklist.json`) comes from the QNRCS, which CNCS makes publicly available. QNRCS and CNCS belong to their respective owners. This project is independent and is not endorsed by CNCS.

## Author

**Roger Rosa**, Network & Cybersecurity Technician
[LinkedIn](https://www.linkedin.com/in/rogerplocharski) · [rogerrosa.pt](https://rogerrosa.pt)
