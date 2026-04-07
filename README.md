# Home Theater Status Dashboard

A modern, real-time dashboard for the **Marantz AV10** processor built with React, MUI, Vite, and a Node.js backend.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│  React + MUI + i18n (Vite dev server :5173) │
│         ↕ WebSocket (real-time)             │
│         ↕ REST API (controls)               │
├─────────────────────────────────────────────┤
│            Node.js Backend (:3001)          │
│     Express + WebSocket Server              │
│         ↕ Telnet TCP:23 (real-time)         │
│         ↕ HTTP XML API :8080 (polling)      │
├─────────────────────────────────────────────┤
│           Marantz AV10 Processor            │
│              (LAN Connected)                │
└─────────────────────────────────────────────┘
```

## Features

- **Real-time status** via Telnet/TCP connection to the receiver
- **Speaker configuration** block layout — auto-detects active speakers, displays layout (e.g. 7.2.4)
- **Volume control** with slider, +/-, and mute toggle (absolute 0-98 scale)
- **Input selection** with custom labels from the receiver
- **Video signal info** — input → output resolution, HDR format
- **Audio signal info** — codec, surround mode, sampling rate, Audyssey settings
- **Subwoofer levels** — supports up to 4 subs with LFE crossover display
- **System info** — power state, ECO mode, connection status
- **Dark mode** — modern MUI dark theme, fully responsive/mobile-friendly
- **Internationalization** — English included, ready for additional languages

## Prerequisites

- Node.js 22+
- Marantz AV10 (or compatible Denon/Marantz AVR) connected to your local network
- The receiver's IP address

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd ht_status
npm run install:all
```

> **Note:** The project includes an `.npmrc` that pins the registry to `https://registry.npmjs.org`. This ensures installs work regardless of any corporate/private npm registry configured on your machine.

### 2. Configure the receiver IP

Copy the example env file and edit it with your receiver's IP:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
AVR_HOST=192.168.1.100   # ← Your Marantz AV10's IP address
AVR_PORT=23               # Telnet port (default)
AVR_HTTP_PORT=8080        # HTTP API port (default for 2016+ models)
SERVER_PORT=3001          # Backend server port
POLL_INTERVAL=30000       # HTTP poll backup interval in ms
```

### 3. Start development

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently via `concurrently`.

Open **http://localhost:5173** in your browser.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both backend + frontend in dev mode |
| `npm run dev:server` | Start only the backend (Express + WebSocket) |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run build` | Production build of the frontend |
| `npm start` | Start the backend in production mode |
| `npm run install:all` | Install dependencies for root, server, and client |
| `npm test` | Run server + client unit tests via Vitest |

## Project Structure

```
ht_status/
├── .gitignore             # Root gitignore (node_modules, dist, .env, logs)
├── .npmrc                 # Forces public npm registry (avoids corporate proxy issues)
├── settings.json          # App configuration (title, language, input overrides)
├── sample-data.json       # Sample AVR status payload for development/testing
├── package.json           # Root monorepo scripts (concurrently)
├── playwright.config.ts   # Playwright E2E test configuration
├── README.md
│
├── e2e/                   # Playwright E2E tests
│   └── dashboard.spec.ts
│
├── server/                # Node.js backend (Express + WebSocket + Telnet)
│   ├── .env               # Environment variables — NOT committed (see .env.example)
│   ├── .env.example       # Template for .env
│   ├── .gitignore
│   ├── tsconfig.json      # TypeScript config (ES2022, Node types)
│   ├── vitest.config.ts   # Vitest configuration for server tests
│   ├── package.json
│   └── src/
│       ├── index.ts            # Express + WebSocket server entry point
│       ├── marantz-service.ts  # Telnet TCP connection + event parsing
│       ├── http-client.ts      # HTTP/XML API client (AppCommand endpoints)
│       ├── constants.ts        # Protocol constants, channel/source mappings
│       ├── types.ts            # Shared TypeScript interfaces
│       └── __tests__/          # Server unit tests
│           ├── api.test.ts
│           ├── constants.test.ts
│           └── marantz-service.test.ts
│
├── client/                # React frontend (Vite + MUI + i18next)
│   ├── .gitignore
│   ├── index.html         # HTML entry point
│   ├── vite.config.ts     # Vite config (proxy to backend, aliases)
│   ├── vitest.config.ts   # Vitest configuration for client tests
│   ├── vite-env.d.ts      # Vite type declarations
│   ├── tsconfig.json      # TypeScript config (DOM, React JSX)
│   ├── package.json
│   ├── public/
│   │   └── vite.svg       # Favicon
│   └── src/
│       ├── App.tsx         # Main dashboard layout (Grid2)
│       ├── main.tsx        # React entry point
│       ├── theme.ts        # MUI dark theme configuration
│       ├── types.ts        # Frontend type definitions (mirrors server types)
│       ├── __tests__/      # Client unit tests
│       │   ├── setup.ts
│       │   ├── test-utils.tsx
│       │   └── components/
│       │       ├── AudioCard.test.tsx
│       │       ├── InputCard.test.tsx
│       │       ├── SpeakerCard.test.tsx
│       │       ├── SubwooferCard.test.tsx
│       │       ├── SystemCard.test.tsx
│       │       ├── VideoCard.test.tsx
│       │       └── VolumeCard.test.tsx
│       ├── hooks/
│       │   └── useAVRStatus.ts  # WebSocket hook for real-time data + API helpers
│       ├── components/
│       │   ├── SpeakerCard.tsx    # Speaker block layout (auto-detects config)
│       │   ├── VolumeCard.tsx     # Volume slider + mute + absolute 0-98 display
│       │   ├── InputCard.tsx      # Input source selector with custom labels
│       │   ├── VideoCard.tsx      # Video signal flow (input → output + HDR)
│       │   ├── AudioCard.tsx      # Audio codec, surround mode, Audyssey
│       │   ├── SubwooferCard.tsx  # Subwoofer levels (1-4) + LFE
│       │   └── SystemCard.tsx     # Power, ECO mode, connection status
│       └── i18n/
│           ├── index.ts   # i18next configuration
│           └── en.json    # English translations (all UI strings)
```

## Configuration

### settings.json

Non-sensitive configuration lives in `settings.json` at the project root:

- **app.title** — Dashboard title (also configurable via i18n)
- **app.defaultLanguage** — Default language code
- **inputLabels.overrides** — Override input source names (takes priority over receiver custom names)

### Environment Variables

Sensitive/environment-specific config uses `.env` files in `server/`:

| Variable | Default | Description |
|----------|---------|-------------|
| `AVR_HOST` | `192.168.1.100` | Marantz receiver IP address |
| `AVR_PORT` | `23` | Telnet port |
| `AVR_HTTP_PORT` | `8080` | HTTP API port |
| `SERVER_PORT` | `3001` | Backend server port |
| `POLL_INTERVAL` | `30000` | HTTP poll interval in ms |

## Adding Languages

1. Copy `client/src/i18n/en.json` to a new file, e.g. `af.json` for Afrikaans
2. Translate all values
3. Register in `client/src/i18n/index.ts`:
   ```ts
   import af from './af.json';
   const resources = {
     en: { translation: en },
     af: { translation: af },
   };
   ```

## Communication Protocol

The Marantz AV10 uses the **Denon/Marantz IP Control Protocol**:

- **Telnet (TCP port 23)** — Real-time bidirectional communication. Events are CR-terminated strings like `MV50`, `SIBD`, `MSDOLBY ATMOS`. Volume uses an absolute 0-98 scale (e.g. `MV50` = volume 50, `MVMAX 75` = max limit 75).
- **HTTP/XML API (port 8080)** — RESTful XML endpoints for detailed queries:
  - `/goform/formMainZone_MainZoneXmlStatus.xml` — Main zone status
  - `/goform/AppCommand.xml` — Simple commands
  - `/goform/AppCommand0300.xml` — Advanced queries (speakers, video, audio, source rename)

## Future: AWS Amplify Deployment

The monorepo structure is designed for single-deployment to AWS Amplify Gen 2:
- Frontend: Static build served from Amplify hosting
- Backend: Will need a persistent compute layer (EC2/ECS/Fargate) with network access to your receiver (via VPN)
- The `settings.json` approach works for both local and deployed configurations

## Resuming on Another Machine

After cloning the repo on a new machine:

```bash
git clone <repo-url>
cd ht_status
npm run install:all
cp server/.env.example server/.env
# Edit server/.env with your Marantz IP
npm run dev
```

> The `.npmrc` at the project root ensures `npm install` uses the public npm registry, so it works on any machine regardless of global npm config.

> `server/.env` is git-ignored. You must create it from `.env.example` on each machine.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.x |
| UI Library | MUI (Material UI) | 6.x |
| Bundler | Vite | 6.x |
| Language | TypeScript | 5.8.x |
| i18n | i18next + react-i18next | 25.x / 15.x |
| Backend | Node.js + Express | 5.x |
| Real-time | WebSocket (ws) | 8.x |
| XML Parsing | xml2js | 0.6.x |
| Monorepo | concurrently | 9.x |

## License

Private — personal use.
