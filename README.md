# 🛰️ GOES-19 Space Weather Monitor

Real-time space weather visualization app using GOES-19 satellite data and NOAA/SWPC data feeds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 + custom design system |
| Charts | Plotly.js (interactive, dark-themed) |
| Image animation | Canvas API + Web Workers |
| State | Zustand (persistent preferences) |
| Data fetching | TanStack Query v5 (auto-refresh) |
| Fonts | Orbitron (display) · Space Mono (body) · JetBrains Mono (data) |

---

## Setup

### Prerequisites
- **Node.js** v20 LTS (`nvm install 20 && nvm use 20`)
- **pnpm** v9+ (`npm install -g pnpm`)
- **VS Code** with recommended extensions (see `.vscode/extensions.json`)

### Installation

```bash
# 1. Clone or open the project
cd space-weather

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.local.example .env.local
# (no values required to change for local dev)

# 4. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (fonts, providers)
│   ├── page.tsx                    # Dashboard home
│   ├── providers.tsx               # React Query provider
│   ├── (dashboard)/                # All section pages
│   │   ├── documentation/          # GOES-R docs
│   │   ├── satellite-status/       # Instrument status
│   │   ├── imagery/                # ABI 16-channel player
│   │   ├── instruments/
│   │   │   ├── magnetometer/       # Hp, He, Hn chart
│   │   │   ├── xray-flux/          # Solar flare chart
│   │   │   ├── electron-flux/      # Particle flux chart
│   │   │   ├── proton-flux/        # Proton flux chart
│   │   │   ├── suvi/               # Solar UV animation
│   │   │   ├── coronagraph/        # CME animation
│   │   │   └── satellite-environment/ # Combined panel
│   │   ├── aurora/                 # Aurora forecast N+S
│   │   ├── solar-wind/             # WSA-ENLIL model
│   │   └── solar-synoptic/         # Solar map
│   └── api/                        # Server-side CORS proxies
│       ├── goes/
│       │   ├── imagery/            # ABI frame list builder
│       │   ├── data/               # Generic GOES data
│       │   └── status/             # OSPO status page
│       └── swpc/
│           ├── magnetometer/       # → services.swpc.noaa.gov
│           ├── xray-flux/
│           ├── electron-flux/
│           ├── proton-flux/
│           ├── aurora/
│           ├── coronagraph/
│           ├── suvi/
│           ├── solar-wind/
│           └── solar-synoptic/
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx            # Main layout (sidebar + topbar)
│   │   └── TopBar.tsx              # Header with dual clocks (UTC + local)
│   ├── navigation/
│   │   └── Sidebar.tsx             # Collapsible sidebar nav
│   ├── animation/
│   │   └── AnimationPlayer.tsx     # Canvas image loop player
│   ├── charts/
│   │   └── PlotlyChart.tsx         # Dark-themed Plotly wrapper
│   └── ui/
│       ├── UsageImpacts.tsx        # Usage + Impacts info blocks
│       └── TimeRangeSelector.tsx   # 6h | 1d | 3d | 7d picker
│
├── hooks/
│   ├── useClocks.ts                # Real-time UTC + local clocks
│   ├── useAutoRefresh.ts           # TanStack Query polling wrapper
│   └── useAnimationPlayer.ts       # Animation playback logic
│
├── lib/
│   ├── utils.ts                    # cn(), formatUTC(), formatFlux()...
│   ├── swpc-api.ts                 # SWPC endpoint constants + fetchers
│   └── goes-imagery.ts             # ABI URL builders
│
├── stores/
│   ├── animationStore.ts           # Zustand: player state
│   └── uiStore.ts                  # Zustand: UI preferences
│
├── types/
│   ├── goes.ts                     # ABI bands, sectors, instrument types
│   ├── swpc.ts                     # Flux readings, SUVI, coronagraph, aurora
│   ├── animation.ts                # Player state types
│   └── ui.ts                       # Nav, alerts, clock types
│
└── styles/
    └── globals.css                 # Tailwind + dark design system
```

---

## Data Sources

| Product | Source | Refresh |
|---------|--------|---------|
| ABI imagery (16 channels) | cdn.star.nesdis.noaa.gov | 10 min |
| Magnetometer | services.swpc.noaa.gov | 1 min |
| X-Ray Flux | services.swpc.noaa.gov | 1 min |
| Electron Flux | services.swpc.noaa.gov | 5 min |
| Proton Flux | services.swpc.noaa.gov | 5 min |
| SUVI animations | services.swpc.noaa.gov | 5 min |
| Coronagraph | services.swpc.noaa.gov | 10 min |
| Aurora forecast | services.swpc.noaa.gov | 5 min |
| WSA-ENLIL solar wind | services.swpc.noaa.gov | 1 min |
| Satellite status | www.ospo.noaa.gov | 5 min |

---

## Development Roadmap

### Phase 1 — Core Infrastructure ✅
- [x] Project scaffolding (Next.js + TypeScript + Tailwind)
- [x] Design system (dark space theme, fonts, tokens)
- [x] Layout (AppShell, TopBar with dual clocks, Sidebar)
- [x] API proxy routes (all SWPC + GOES endpoints)
- [x] Type definitions (all data models)
- [x] Zustand stores (animation, UI preferences)
- [x] Core hooks (clocks, auto-refresh, animation player)
- [x] Documentation page
- [x] Plotly wrapper component
- [x] Animation player component (Canvas)

### Phase 2 — Instrument Charts 🔄
- [ ] Magnetometer interactive chart (Hp/He/Hn/Total traces)
- [ ] X-Ray Flux chart (with flare class annotations A/B/C/M/X)
- [ ] Electron Flux chart (>2 MeV, >4 MeV)
- [ ] Proton Flux chart (>10, >50, >100, >500 MeV)
- [ ] Satellite Environment (combined 3-panel view)
- [ ] Usage + Impacts content for each instrument

### Phase 3 — Animation Players 🔄
- [ ] ABI Imagery player (16 channels, all controls)
- [ ] SUVI animation player (5 wavelengths)
- [ ] Coronagraph animation player (4 sources)
- [ ] Aurora forecast animations (N + S pole side-by-side)
- [ ] WSA-ENLIL solar wind animation

### Phase 4 — Status & Info
- [ ] Satellite status page (live instrument table)
- [ ] Solar synoptic map
- [ ] Download support (frame download, GIF export)

### Phase 5 — Enhancement
- [ ] PWA support (offline capable)
- [ ] Mobile responsive layout
- [ ] Keyboard shortcuts
- [ ] Alerts panel (SWPC active alerts)

---

## VS Code Recommended Extensions

Install from `.vscode/extensions.json` or manually:
- `bradlc.vscode-tailwindcss` — Tailwind IntelliSense
- `esbenp.prettier-vscode` — Prettier formatter
- `dbaeumer.vscode-eslint` — ESLint
- `ms-vscode.vscode-typescript-next` — TypeScript language features
- `rangav.vscode-thunder-client` — API testing
- `usernamehw.errorlens` — Inline error display
- `eamodio.gitlens` — Git blame + history

---

## Contributing

This project follows a module-per-instrument pattern. When adding a new instrument:
1. Add types to `src/types/swpc.ts`
2. Add API route in `src/app/api/swpc/[instrument]/route.ts`
3. Create page in `src/app/(dashboard)/instruments/[instrument]/page.tsx`
4. Add to sidebar nav in `src/components/navigation/Sidebar.tsx`
