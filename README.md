# Home Theater Status Dashboard

A real-time dashboard for the Marantz AV10 built with React, Vite, MUI, and a Node.js backend.

## Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│ Browser                                                          │
│ React 19 + MUI 6 + i18next                                       │
│ App.tsx -> useAVRStatus -> dashboard cards                       │
│  ↕ WebSocket /ws (live status stream)                            │
│  ↕ REST /api/* (control actions)                                 │
├────────────────────────────────────────────────────────────────────┤
│ Node.js Backend :3001                                            │
│ Express 5 + ws                                                   │
│ createApp() + createRealtimeServer() + MarantzService            │
│  ↕ Telnet TCP :23            for live events + commands          │
│  ↕ HTTP/XML :8080             for Main Zone + AppCommand0300     │
│  ↕ Web Control :11080        for model, firmware, network,       │
│                              and speaker preset reads            │
│  ↕ HEOS CLI :1255            for Quick Select names fallback     │
├────────────────────────────────────────────────────────────────────┤
│ Marantz AV10                                                     │
└────────────────────────────────────────────────────────────────────┘
```

The frontend keeps optimistic UI state for volume, mute, input, Smart Select, and speaker preset changes. The backend maintains a single in-memory `IAVRStatus` snapshot, updates it from telnet events, enriches it with HTTP and web-control polling, and broadcasts changes over WebSocket.

## Features

- Real-time status over telnet plus WebSocket broadcast to the browser
- Volume control with slider, step controls, mute toggle, and optimistic updates on the absolute `0-98` scale
- Smart Select recall with friendly preset names and live metadata for source, format, sampling rate, and video input
- Speaker preset switching with live layout visualization and stale-layout protection during preset transitions
- Video signal card with input/output resolution, input signal type, HDR format, and HDMI output target
- Audio signal card with surround mode, input format, sampling rate, Dynamic EQ, Dynamic Volume, MultEQ, and dialog enhancer
- Subwoofer status card for `1-4` subs with per-sub level display
- System card with power state, processor model, software version, network transport, IP address, last update time, and receiver connectivity
- Responsive dark UI for desktop and mobile viewports
- English i18n bundle with additional language support ready to extend

## Prerequisites

- Node.js 22+
- A Marantz AV10, or a compatible Denon/Marantz receiver exposing the same control surfaces
- Network access to the receiver from the backend machine

## Quick Start

### 1. Install dependencies

```bash
git clone <repo-url>
cd av10-dashboard
npm run install:all
```

The repository includes an `.npmrc` pinned to `https://registry.npmjs.org`, so installs are not affected by a machine's global registry override.

### 2. Configure the backend

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
AVR_HOST=192.168.1.170
AVR_PORT=23
AVR_HTTP_PORT=8080
SERVER_PORT=3001
POLL_INTERVAL=30000
```

### 3. Start development

```bash
npm run dev
```

Then open `http://localhost:5173`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start backend and frontend together |
| `npm run dev:server` | Start only the backend |
| `npm run dev:client` | Start only the frontend |
| `npm run build` | Build the frontend production bundle |
| `npm start` | Start the compiled backend from `server/dist` |
| `npm test` | Run server and client unit tests |
| `npm run test:coverage` | Run server and client tests with coverage |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run install:all` | Install root, server, and client dependencies |

## Project Layout

```text
av10-dashboard/
├── architecture/          # PlantUML sources and generated SVG diagrams
├── client/                # React frontend
├── e2e/                   # Playwright end-to-end tests
├── server/                # Express + WebSocket backend and Marantz transport
├── README.md              # High-level setup and architecture guide
├── STRUCTURE.md           # Detailed file responsibility reference
├── settings.json          # Non-secret application settings and placeholders
└── sample-data.json       # Sample AVR status payload
```

See `STRUCTURE.md` for the detailed source, config, and test file map.

## Configuration

### `settings.json`

Only a small subset of `settings.json` is consumed at runtime today:

- `app.title` is exposed through `/api/settings`
- `app.defaultLanguage` is exposed through `/api/settings`

The following fields exist in the file but are not currently used by the running application:

- `app.refreshInterval`
- `avr.*`
- `inputLabels.overrides`
- `speakerLayout`

Backend connectivity is controlled by `server/.env`, not by the `avr` block in `settings.json`.

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `AVR_HOST` | `192.168.1.170` | Receiver IP address |
| `AVR_PORT` | `23` | Telnet control port |
| `AVR_HTTP_PORT` | `8080` | Legacy HTTP/XML API port |
| `SERVER_PORT` | `3001` | Backend HTTP + WebSocket port |
| `POLL_INTERVAL` | `30000` | Periodic HTTP refresh interval in milliseconds |

## Testing

Latest local verification from this repository state:

| Suite | Result |
| --- | --- |
| Server unit tests | `133/133` passed |
| Client unit tests | `70/70` passed |
| Playwright E2E | `17` passed, `1` skipped |

Latest local coverage artifacts:

| Package | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `server` | `78.45%` | `67.46%` | `81.74%` | `78.54%` |
| `client` | `92.98%` | `79.83%` | `94.80%` | `93.96%` |

If you need fresh JSON coverage summaries, regenerate them inside each package:

```bash
cd server && npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text
cd client && npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text
```

## Receiver Protocols And Endpoints

- Telnet `:23` provides live events such as volume, mute, input, surround mode, Smart Select, speaker profile, and system audio updates.
- Legacy HTTP/XML `:8080` is used for Main Zone status and `AppCommand0300` detail queries.
- Web Control `:11080` is used for newer configuration endpoints, including firmware version, network info, processor model, and speaker preset reads. An exported write helper also exists in the codebase, but it is not the live runtime path.
- HEOS CLI `:1255` is queried as a fallback source for Quick Select names.

Current runtime speaker preset writes use telnet via `MarantzService.setSpeakerPreset()`:

```text
SPPR {1|2}
```

After a preset change, the backend immediately publishes a pending preset state, sends `SPPR {1|2}` over telnet, then performs a short burst of refreshes and ignores stale speaker-layout data until the new preset is confirmed. The repository also contains a Web Control helper for preset writes, but that helper is not wired into the live REST path.

## Architecture Artifacts

The repository now includes PlantUML source and generated SVG output under `architecture/`:

- `system-architecture.puml` and `system-architecture.svg`
- `control-sequence.puml` and `control-sequence.svg`

## Adding Languages

1. Copy `client/src/i18n/en.json` to a new file such as `af.json`.
2. Translate the values.
3. Register the file in `client/src/i18n/index.ts`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, TypeScript 5, MUI 6 |
| State flow | `useAVRStatus` with optimistic reconciliation |
| Backend | Node.js, Express 5, `ws`, `axios`, `xml2js` |
| Tests | Vitest, Testing Library, Playwright |
| Receiver transports | Telnet, HTTP/XML, Web Control, HEOS CLI |

## License

Private repository for personal use.
