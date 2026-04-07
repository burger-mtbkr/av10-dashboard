# Project Structure & File Reference

This document provides a detailed breakdown of every folder and file in the **Home Theater Status Dashboard** project, explaining the purpose and responsibility of each.

## Folder Structure

```
ht_status/
│
├── .gitignore
├── .npmrc
├── package.json
├── package-lock.json
├── README.md
├── STRUCTURE.md
├── settings.json
├── sample-data.json
├── playwright.config.ts
│
├── e2e/
│   └── dashboard.spec.ts
│
├── server/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts
│       ├── marantz-service.ts
│       ├── http-client.ts
│       ├── constants.ts
│       ├── types.ts
│       └── __tests__/
│           ├── api.test.ts
│           ├── constants.test.ts
│           └── marantz-service.test.ts
│
└── client/
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── vite-env.d.ts
    ├── public/
    │   └── vite.svg
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── theme.ts
        ├── types.ts
        ├── __tests__/
        │   ├── setup.ts
        │   ├── test-utils.tsx
        │   └── components/
        │       ├── AudioCard.test.tsx
        │       ├── InputCard.test.tsx
        │       ├── SpeakerCard.test.tsx
        │       ├── SubwooferCard.test.tsx
        │       ├── SystemCard.test.tsx
        │       ├── VideoCard.test.tsx
        │       └── VolumeCard.test.tsx
        ├── hooks/
        │   └── useAVRStatus.ts
        ├── components/
        │   ├── SpeakerCard.tsx
        │   ├── VolumeCard.tsx
        │   ├── InputCard.tsx
        │   ├── VideoCard.tsx
        │   ├── AudioCard.tsx
        │   ├── SubwooferCard.tsx
        │   └── SystemCard.tsx
        └── i18n/
            ├── index.ts
            └── en.json
```

---

## Root Files

These files live at the top level of the monorepo and control the overall project configuration.

| File | Purpose |
|------|---------|
| `.gitignore` | Excludes `node_modules/`, `dist/`, `.env`, `server/.env`, and `*.log` files from version control. |
| `.npmrc` | Pins the npm registry to `https://registry.npmjs.org` so installs work regardless of any corporate/private registry configured globally on the machine. |
| `package.json` | Root monorepo package. Defines the `dev`, `build`, `start`, and `install:all` scripts that orchestrate both the server and client using `concurrently`. |
| `package-lock.json` | Lock file for the root `concurrently` dependency. Ensures deterministic installs. |
| `README.md` | Main project documentation — architecture, features, quick start guide, configuration reference, protocol details, and tech stack. |
| `STRUCTURE.md` | This file. Detailed breakdown of every folder and file in the project with purpose descriptions. |
| `settings.json` | Non-sensitive application configuration: dashboard title, default language, input label overrides. Read by the backend at startup and shared with the frontend via API. This is the single config file for both local and future AWS Amplify deployments. |
| `sample-data.json` | Sample AVR status JSON payload used for development and testing without a live receiver. |
| `playwright.config.ts` | Configuration for Playwright E2E tests (browser automation). |

---

## Server Folder (`server/`)

The backend is a **Node.js + Express + WebSocket** server that acts as a bridge between the Marantz AV10 receiver (on your LAN) and the browser dashboard.

### Server Root Files

| File | Purpose |
|------|---------|
| `.env` | **Not committed.** Contains sensitive/environment-specific config: the receiver's IP address (`AVR_HOST`), telnet port, HTTP port, server port, and poll interval. Created by copying `.env.example`. |
| `.env.example` | Template for `.env` with placeholder values. Committed to git so new developers (or new machines) know which variables to set. |
| `.gitignore` | Server-specific ignore rules: `node_modules/`, `dist/`, `.env`. |
| `package.json` | Server dependencies (`express`, `ws`, `xml2js`, `dotenv`, `cors`) and dev dependencies (`typescript`, `tsx`, `@types/*`). Defines `dev` (tsx watch), `build` (tsc), and `start` (node) scripts. |
| `package-lock.json` | Lock file for deterministic server dependency installs. |
| `tsconfig.json` | TypeScript configuration targeting ES2022 with ESNext modules, bundler module resolution, Node.js type definitions, and output to `dist/`. |
| `vitest.config.ts` | Vitest configuration for server unit tests. |

### Server Source Files (`server/src/`)

| File | Purpose |
|------|---------|
| `index.ts` | **Main entry point.** Loads environment variables via `dotenv`, reads `settings.json`, creates the Express app with CORS, defines REST API routes (`/api/status`, `/api/volume`, `/api/input`, `/api/mute`, `/api/health`, `/api/settings`), starts the HTTP server, attaches the WebSocket server, initialises the `MarantzService`, and wires up event listeners to broadcast real-time status to all connected browser clients. |
| `marantz-service.ts` | **Core Marantz communication service.** Extends `EventEmitter`. Opens a persistent TCP/telnet connection (port 23) to the receiver for real-time event streaming. Parses incoming telnet events (e.g. `MV50` → volume change, `SIBD` → input change) and updates an internal `AVRStatus` object. Also triggers periodic HTTP polling as a backup. Emits `statusChanged`, `connected`, and `disconnected` events consumed by `index.ts`. Provides `setVolume()` and `setInput()` methods for control. |
| `http-client.ts` | **HTTP/XML API client.** Makes HTTP GET and POST requests to the receiver's XML endpoints (`/goform/formMainZone_MainZoneXmlStatus.xml`, `/goform/AppCommand.xml`, `/goform/AppCommand0300.xml`). Parses XML responses with `xml2js` to extract: main zone status (power, volume, mute, input, surround mode), active speakers (`GetActiveSpeaker`), custom source names (`GetSourceRename`), video info (`GetVideoInfo`), and audio info (`GetAudioInfo`). |
| `constants.ts` | **Protocol constants and lookup tables.** Maps speaker channel codes to human-readable names and groups (e.g. `FL` → "Front Left" / ear level). Maps source IDs to default names (e.g. `SAT/CBL` → "CBL/SAT"). Maps telnet event prefixes to status fields. Contains `parseVolume()` and `volumeToCommand()` functions for converting between Marantz's raw volume format and absolute 0-98 values. |
| `types.ts` | **Shared TypeScript type definitions.** Defines all interfaces used across the backend: `AVRStatus`, `SpeakerStatus`, `VideoInfo`, `AudioInfo`, `SubwooferInfo`, `InputSource`, `WSMessage`, and `TelnetEvent`. These same shapes are mirrored on the client side. |

---

## Client Folder (`client/`)

The frontend is a **React 19 + Vite + MUI 6** single-page application that connects to the backend via WebSocket for real-time updates and REST API for controls.

### Client Root Files

| File | Purpose |
|------|---------|
| `.gitignore` | Client-specific ignore rules: `node_modules/`, `dist/`, `.env`. |
| `index.html` | The single HTML page served by Vite. Sets the dark background colour (`#121212`), viewport meta tag for mobile, and mounts the React app into `<div id="root">`. |
| `package.json` | Client dependencies (`react`, `react-dom`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `i18next`, `react-i18next`) and dev dependencies (`typescript`, `vite`, `@vitejs/plugin-react`, `@types/react*`). |
| `package-lock.json` | Lock file for deterministic client dependency installs. |
| `tsconfig.json` | TypeScript configuration for the browser: ES2022 + DOM + DOM.Iterable libs, React JSX transform, bundler module resolution, path alias `@/*` → `src/*`, `noEmit` (Vite handles bundling). |
| `vite.config.ts` | Vite bundler configuration. Enables the React plugin, sets up the `@` path alias, configures the dev server on port 5173 with proxy rules that forward `/api` requests to the backend at `localhost:3001` and upgrade `/ws` to WebSocket. Production build outputs to `dist/`. |
| `vitest.config.ts` | Vitest configuration for client component unit tests. |
| `vite-env.d.ts` | Type declaration file that references Vite's client types, enabling TypeScript to understand Vite-specific imports (e.g. `import.meta.env`). |

### Static Assets (`client/public/`)

| File | Purpose |
|------|---------|
| `vite.svg` | Custom SVG favicon/logo depicting a stylised speaker icon with coloured equaliser bars. Served as-is at the root URL. |

### Client Source Files (`client/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | **Root React component.** Wraps the app in MUI's `ThemeProvider` (dark theme) and `CssBaseline`. Renders the dashboard header with connection status indicators (AVR + WebSocket) and a responsive `Grid2` layout containing all seven dashboard cards. Consumes the `useAVRStatus` hook and passes data/callbacks to each card. |
| `main.tsx` | **React entry point.** Imports `i18n` to initialise translations, then mounts `<App />` inside `<StrictMode>` into the `#root` DOM element. |
| `theme.ts` | **MUI dark theme definition.** Configures palette (primary: `#4fc3f7` cyan, secondary: `#66bb6a` green, background: `#0a0a0f` / `#141420`), typography (Inter/Roboto font stack, weighted headings), border radius (16px), and component style overrides for `Card`, `CardContent`, `Chip`, and `Slider`. |
| `types.ts` | **Client-side TypeScript interfaces.** Mirrors the server's `types.ts` — defines `AVRStatus`, `SpeakerStatus`, `VideoInfo`, `AudioInfo`, `SubwooferInfo`, `InputSource`, and `WSMessage` so the frontend has full type safety on all data from the backend. |

### Hooks (`client/src/hooks/`)

| File | Purpose |
|------|---------|
| `useAVRStatus.ts` | **Real-time data hook.** Manages the WebSocket connection to the backend, handles automatic reconnection (3-second retry), parses incoming `WSMessage` events, and maintains the full `AVRStatus` state. Exposes API helper functions (`setVolume`, `volumeUp`, `volumeDown`, `setInput`, `toggleMute`) that call the REST endpoints. Returns `{ status, wsConnected, setVolume, volumeUp, volumeDown, setInput, toggleMute }`. |

### Components (`client/src/components/`)

Each component is a self-contained MUI `Card` responsible for one section of the dashboard.

| File | Purpose |
|------|---------|
| `SpeakerCard.tsx` | **Speaker configuration display.** Renders a block layout of speaker icons grouped by type (ear level, height/Atmos, subwoofer). Active speakers are highlighted in green, inactive ones are dimmed. Auto-detects any speaker configuration (7.2.4, 9.2.4, 5.1.2, etc.) and displays the layout label as a chip. Supports all Dolby Atmos and DTS:X channel codes. |
| `VolumeCard.tsx` | **Volume control.** Shows the current volume in a large colour-coded display using the absolute 0-98 scale (green < 55, orange < 70, red ≥ 70). Provides a slider for precise adjustment, +/- buttons for step changes, and a mute toggle. The slider uses local state during drag to avoid jitter, committing the value on release. |
| `InputCard.tsx` | **Input source selector.** Displays the currently selected input as a prominent chip and provides a dropdown `Select` to switch inputs. Shows both the custom label and the raw source ID for each option. Calls the backend API on change. |
| `VideoCard.tsx` | **Video signal information.** Displays a visual signal flow: input resolution → output resolution (e.g. "1080p → 4K"). Shows HDR format as a badge (HDR10, Dolby Vision, HLG) when active, plus HDMI output target and input signal type. |
| `AudioCard.tsx` | **Audio signal information.** Highlights the current surround mode (e.g. "Dolby Atmos", "DTS:X") as a prominent chip. Lists input audio format, sampling rate, Dynamic EQ, Dynamic Volume, MultEQ mode, and Dialog Enhancer in an info-row layout. |
| `SubwooferCard.tsx` | **Subwoofer settings.** Displays 1–4 subwoofers with their output level shown as a chip and a gradient progress bar. Shows the LFE (Low Frequency Effect) level as a badge. Supports any number of subwoofers — adapts automatically based on what the receiver reports. |
| `SystemCard.tsx` | **System information.** Shows power state (ON/OFF/STANDBY) as a coloured chip, ECO mode status, last update timestamp, and a connection status indicator for the AVR link. |

### Internationalisation (`client/src/i18n/`)

| File | Purpose |
|------|---------|
| `index.ts` | **i18next configuration.** Initialises i18next with the `react-i18next` plugin, loads the English translation resource, sets `en` as the default and fallback language. To add a new language (e.g. Afrikaans), import the JSON file and add it to the `resources` object. |
| `en.json` | **English translations.** Contains every user-facing string in the application: dashboard title, connection status labels, card titles, speaker group names, volume/input/video/audio/subwoofer/system labels, and common terms (on, off, auto, unknown). All components reference these keys via the `useTranslation()` hook. |

---

## E2E Tests (`e2e/`)

| File | Purpose |
|------|---------|
| `dashboard.spec.ts` | **Playwright E2E test.** Browser automation tests that verify the full dashboard renders and functions correctly end-to-end. |

---

## Test Infrastructure

### Server Tests (`server/src/__tests__/`)

| File | Purpose |
|------|---------|
| `api.test.ts` | Tests the Express REST API routes (`/api/status`, `/api/volume`, `/api/input`, `/api/mute`, `/api/health`) including input validation and error handling. |
| `constants.test.ts` | Tests `parseVolume()` / `volumeToCommand()` round-trip correctness on the absolute 0-98 scale, plus `CHANNEL_MAP`, `SOURCE_MAP`, and `TELNET_EVENT_MAP` coverage. |
| `marantz-service.test.ts` | Tests `MarantzService` event parsing (MV, MU, SI, MS, etc.), telnet buffer processing, deep-copy isolation, and connection state management. |

### Client Tests (`client/src/__tests__/`)

| File | Purpose |
|------|---------|
| `setup.ts` | Test environment setup — configures jsdom globals and testing-library matchers. |
| `test-utils.tsx` | Shared test helpers — `renderWithProviders()` wraps components in MUI theme + i18n context, provides default mock `AVRStatus`. |
| `components/AudioCard.test.tsx` | Tests AudioCard rendering of codec, surround mode, and Audyssey fields. |
| `components/InputCard.test.tsx` | Tests InputCard chip display, select dropdown, and empty-state fallback. |
| `components/SpeakerCard.test.tsx` | Tests SpeakerCard block layout, active/inactive highlighting, and config label. |
| `components/SubwooferCard.test.tsx` | Tests SubwooferCard level display, progress bars, and LFE badge. |
| `components/SystemCard.test.tsx` | Tests SystemCard power/ECO/connection chips and timestamp formatting. |
| `components/VideoCard.test.tsx` | Tests VideoCard signal flow, HDR badge, and resolution display. |
| `components/VolumeCard.test.tsx` | Tests VolumeCard absolute volume display, slider range (0 to maxVolume), colour thresholds, mute toggle, and percentage calculation. |
