# Project Structure And File Reference

This document maps the primary source, config, documentation, and test files in the Home Theater Status Dashboard repository.

## Top Level

```text
av10-dashboard/
├── architecture/
├── client/
├── e2e/
├── server/
├── README.md
├── STRUCTURE.md
├── package.json
├── playwright.config.ts
├── settings.json
└── sample-data.json
```

| Path | Purpose |
| --- | --- |
| `.gitignore` | Root ignore rules for dependencies, build output, env files, test artifacts, and obsolete root `eq-profiles.json` (canonical store is under `server/data/`). |
| `.npmrc` | Pins installs to the public npm registry. |
| `package.json` | Root scripts for `start`, `dev`, `test`, `test:coverage`, `test:e2e`, `build`, and `install:all`. |
| `playwright.config.ts` | Playwright config. Starts `npm run dev` as the web server and runs Chromium plus mobile projects. |
| `settings.json` | Non-secret app settings. Only `app.title` and `app.defaultLanguage` are used at runtime; the remaining fields are placeholders today. |
| `sample-data.json` | Sample AVR status payload used for development and testing. |
| `README.md` | High-level setup, runtime architecture, protocol notes, and testing summary. |
| `STRUCTURE.md` | This file. |

## Architecture Artifacts

| Path | Purpose |
| --- | --- |
| `architecture/system-architecture.puml` | Raw PlantUML component diagram for the runtime architecture. |
| `architecture/system-architecture.svg` | Rendered SVG output for the runtime architecture diagram. |
| `architecture/control-sequence.puml` | Raw PlantUML sequence diagram covering connection, control, and reconciliation flow. |
| `architecture/control-sequence.svg` | Rendered SVG output for the control sequence diagram. |

## Frontend

The frontend is a React 19 single-page app built with Vite and MUI. It renders the dashboard, manages optimistic control state, and receives live status over WebSocket.

### Frontend Root

| Path | Purpose |
| --- | --- |
| `client/package.json` | Frontend dependencies and scripts for `dev`, `build`, `preview`, `test`, and `test:coverage`. |
| `client/vite.config.ts` | Vite config, React plugin setup, path aliasing, and proxy rules for `/api` and `/ws`. |
| `client/vitest.config.ts` | Vitest configuration for the React test suite. |
| `client/tsconfig.json` | Browser TypeScript settings. |
| `client/index.html` | App shell and mount point. |
| `client/public/vite.svg` | Static favicon asset. |
| `client/coverage/` | Generated coverage artifacts for the frontend test suite. |

### Frontend Source

| Path | Purpose |
| --- | --- |
| `client/src/App.tsx` | Top-level dashboard composition (allowed at `src/` root alongside `main.tsx`). Renders header chips plus Volume, Smart Select, EQ Profiles, Speaker Preset, Subwoofer, Audio, Video, and System cards. |
| `client/src/main.tsx` | React bootstrap entry point. |
| `client/src/theme/index.ts` | Shared MUI theme configuration (default export). |
| `client/src/types/index.ts` | Frontend interfaces/types mirroring the backend status model (barrel). |
| `client/src/types/constants.ts` | Shared UI constants (e.g. `PLACEHOLDER_VALUE`); re-exported from `types/index.ts`. |

### Frontend API Helpers

Only `client/src/api/index.ts` sits at the API folder root (barrel). HTTP helpers live under `client/src/api/http/`. EQ-specific client calls live under `client/src/features/eq/`.

| Path | Purpose |
| --- | --- |
| `client/src/api/index.ts` | Public exports: `apiClient`, volume/input/mute helpers, Smart Select / speaker preset actions. |
| `client/src/api/http/client.ts` | Shared axios instance for browser API calls. |
| `client/src/api/http/request.ts` | POST / JSON POST helpers built on `apiClient`. |
| `client/src/api/http/set-volume.ts` | Set absolute volume. |
| `client/src/api/http/volume-up.ts` | Volume-up command. |
| `client/src/api/http/volume-down.ts` | Volume-down command. |
| `client/src/api/http/set-input.ts` | Change input source. |
| `client/src/api/http/set-mute.ts` | Toggle mute. |
| `client/src/api/http/select-smart-preset.ts` | Recall a Smart Select preset. |
| `client/src/api/http/select-speaker-preset.ts` | Switch speaker preset 1 or 2. |

### Frontend Hooks

| Path | Purpose |
| --- | --- |
| `client/src/hooks/useAVRStatus.ts` | Maintains live AVR state, opens the WebSocket, handles reconnects, applies optimistic updates, and reconciles them against server-confirmed status. |
| `client/src/hooks/index.ts` | Re-export surface for hooks. |

### Frontend EQ Feature

| Path | Purpose |
| --- | --- |
| `client/src/features/eq/api.ts` | EQ request helpers (`get`, `save`, `apply`, and processor sync). |
| `client/src/features/eq/gain-range.ts` | Shared EQ gain math/constants used by UI and hook logic. |
| `client/src/features/eq/use-eq-profiles.ts` | EQ profile state/hook orchestration for load/edit/save/apply flows. |
| `client/src/features/eq/index.ts` | Barrel export for EQ feature utilities and hook. |

### Frontend Components

| Path | Purpose |
| --- | --- |
| `client/src/components/VolumeCard.tsx` | Volume slider, mute button, and step controls. |
| `client/src/components/InputCard.tsx` | Smart Select buttons plus metadata for the active preset. |
| `client/src/components/SpeakerPresetCard.tsx` | Speaker preset selector and live speaker-position visualization. |
| `client/src/components/SubwooferCard.tsx` | Per-sub level display with progress bars. |
| `client/src/components/AudioCard.tsx` | Current sound mode and audio-processing details. |
| `client/src/components/VideoCard.tsx` | Signal resolution, HDR, and HDMI output view. |
| `client/src/components/SystemCard.tsx` | Power, model, firmware, network, IP, last update, and connection status. |
| `client/src/components/EqProfilesCard.tsx` | EQ profile picker, save/apply/sync, uses feature hook and graphic EQ UI. |
| `client/src/components/GraphicEqBands.tsx` | Graphic EQ band sliders / visualization. |
| `client/src/components/index.ts` | Re-export surface for dashboard cards. |

Colocated unit tests: each `*.tsx` card may have a matching `*.test.tsx` in the same folder.

### Frontend i18n

| Path | Purpose |
| --- | --- |
| `client/src/i18n/index.ts` | i18next bootstrap and resource registration. |
| `client/src/i18n/en.json` | English translation bundle used across the UI. |

## Backend

The backend is an Express 5 and WebSocket service that keeps a single AVR status model in memory, proxies control actions, and integrates with the receiver over telnet, HTTP/XML, web-control, and HEOS interfaces.

### Backend Root

| Path | Purpose |
| --- | --- |
| `server/.env.example` | Template for the backend runtime variables. |
| `server/.env` | Local environment file used during development. Not committed. |
| `server/package.json` | Backend dependencies and scripts for `dev`, `build`, `start`, `test`, and `test:coverage`. |
| `server/tsconfig.json` | Backend TypeScript settings. |
| `server/vitest.config.ts` | Vitest configuration for backend tests. |
| `server/data/eq-profiles.json` | Persistent EQ profiles data file (default store location). |
| `server/debug/` | Optional local-only folder for ad hoc probe and debugging scripts for receiver endpoints and transports. Not committed by default. |
| `server/coverage/` | Generated coverage artifacts for the backend test suite. |

### Backend Runtime Modules

| Path | Purpose |
| --- | --- |
| `server/src/index.ts` | Backend entry point. Loads settings, exposes the REST API, creates the WebSocket server, and wires `MarantzService` events into broadcasts. |
| `server/src/services/marantz.service.ts` | Marantz telnet/service runtime implementation. Maintains canonical AVR state and emits status updates. |
| `server/src/core/constants.ts` | Receiver protocol constants, channel/source maps, and volume conversion helpers. |
| `server/src/types/index.ts` | Central barrel for backend type definitions. |
| `server/src/types/core.ts` | Core runtime status/event types shared across the server runtime. |
| `server/src/types/api.ts` | API transport-layer request/response support types. |
| `server/src/types/eq.ts` | EQ domain types (bands, profiles, preset store model). |
| `server/src/lib/graphic-eq-protocol.ts` | Graphic EQ telnet formatter/parser entrypoint used by services and tests. |

### Backend EQ Feature

| Path | Purpose |
| --- | --- |
| `server/src/features/eq/index.ts` | Barrel: store, validators, preset helpers. |
| `server/src/features/eq/store.ts` | `EqProfilesStore`: read/write `eq-profiles.json`, list/save profiles per speaker preset. |
| `server/src/features/eq/validators.ts` | Band and store validation; gain clamping. |
| `server/data/eq-profiles.json` | Default on-disk EQ profiles database (override path with `EQ_PROFILES_JSON_PATH`). |

### Backend API Transport Layer

`server/src/api/` is now split by responsibility (`http/`, `heos/`, `status/`, and `parsers/`).

| Path | Purpose |
| --- | --- |
| `server/src/api/index.ts` | Re-export surface for backend API namespaces and selected helpers. |
| `server/src/api/http/index.ts` | HTTP transport namespace (axios-backed REST/XML helpers and fetchers). |
| `server/src/api/http/client.ts` | Shared axios client and HTTP error normalization. |
| `server/src/api/http/get.ts` | Raw HTTP GET helper for XML and web-control endpoints. |
| `server/src/api/http/post-xml.ts` | HTTP POST helper for XML payloads. |
| `server/src/api/http/fetch-main-zone-status.ts` | Fetches Main Zone XML status from the legacy `:8080` interface. |
| `server/src/api/http/fetch-app-command-0300.ts` | Executes AppCommand0300 requests. |
| `server/src/api/http/fetch-web-control-config.ts` | Reads newer web-control config endpoints from port `11080`. |
| `server/src/api/http/fetch-speaker-preset.ts` | Reads the active speaker preset from `/ajax/speakers/get_config?type=11`. |
| `server/src/api/http/set-speaker-preset.ts` | Writes speaker preset changes through `/ajax/speakers/set_config?type=11`. |
| `server/src/api/heos/index.ts` | HEOS transport namespace (raw TCP command helpers). |
| `server/src/api/heos/command.ts` | Executes HEOS CLI commands over TCP. |
| `server/src/api/heos/get-player-id.ts` | Resolves the HEOS player identifier for the receiver. |
| `server/src/api/heos/fetch-quick-select-names.ts` | Pulls Quick Select names from HEOS. |
| `server/src/api/status/fetch-http-status.ts` | Aggregates full receiver status across HTTP and HEOS sources. |
| `server/src/api/status/index.ts` | Status namespace barrel for aggregate status fetchers. |

### Backend Parsers

| Path | Purpose |
| --- | --- |
| `server/src/api/parsers/parse-active-speakers.ts` | Parses AppCommand0300 speaker-activity results. |
| `server/src/api/parsers/parse-audio-info.ts` | Parses audio input, output, and processing data. |
| `server/src/api/parsers/parse-network-info.ts` | Extracts network transport and IP address from web-control XML. |
| `server/src/api/parsers/parse-processor-model.ts` | Resolves the branded processor model name from web-control endpoints. |
| `server/src/api/parsers/parse-smart-select-names.ts` | Builds Smart Select names from AppCommand results. |
| `server/src/api/parsers/parse-software-version.ts` | Extracts firmware/software version details. |
| `server/src/api/parsers/parse-source-renames.ts` | Maps source rename responses into display labels. |
| `server/src/api/parsers/parse-speaker-layout.ts` | Helper logic for speaker-layout derivation. |
| `server/src/api/parsers/parse-speaker-preset.ts` | Parses the active speaker preset from web-control XML. |
| `server/src/api/parsers/parse-video-info.ts` | Parses HDMI and resolution information. |
| `server/src/api/parsers/index.ts` | Re-export surface for parser helpers. |

## End-To-End Tests

All Playwright specs live under `e2e/` (`playwright.config.ts` sets `testDir: './e2e'`). Root script: `npm run test:e2e` → `npx playwright test e2e`.

| Path | Purpose |
| --- | --- |
| `e2e/dashboard.spec.ts` | Page load, header, connection chips, card titles, dark theme, mobile viewport, API health smoke checks. |

## Unit Tests

### Backend Tests

Vitest discovers `server/src/**/*.test.ts` (currently under `server/src/__tests__/`).

| Path | Purpose |
| --- | --- |
| `server/src/__tests__/api.test.ts` | REST routes, validation, error responses. |
| `server/src/__tests__/constants.test.ts` | Volume conversion helpers and protocol lookup tables. |
| `server/src/__tests__/graphic-eq-protocol.test.ts` | Graphic EQ telnet parse/format helpers. |
| `server/src/__tests__/http-client.test.ts` | HTTP status aggregation and parsing. |
| `server/src/__tests__/index.test.ts` | Express bootstrap, WebSocket wiring, config, shutdown. |
| `server/src/__tests__/marantz-service.test.ts` | Telnet parsing, HTTP merge, speaker layout, reconnect, commands. |

### Frontend Tests

Vitest discovers `client/src/**/*.test.{ts,tsx}`. Tests are **colocated** with source (no `__tests__` tree). Shared setup lives under `client/src/test/`.

| Path | Purpose |
| --- | --- |
| `client/src/test/setup.ts` | Vitest setup: `jest-dom`, axios/WebSocket mocks (loaded via `client/vitest.config.ts` `setupFiles`). |
| `client/src/test/test-utils.tsx` | `renderWithProviders`, `createMockStatus`, `createMockSpeakers`. |
| `client/src/App.test.tsx` | Dashboard card ordering with hooks mocked. |
| `client/src/hooks/useAVRStatus.test.tsx` | WebSocket flow, optimistic updates, REST helpers. |
| `client/src/components/*.test.tsx` | Per-card UI tests next to each component module. |
| `client/src/features/eq/gain-range.test.ts` | EQ gain-range math. |

## Generated And Support Artifacts

The repository may generate or include local support directories such as `client/coverage/`, `server/coverage/`, `test-results/`, and `.tmp-ui/` after running tests or UI tooling. Those are operational artifacts rather than primary source modules, so they are only referenced here when they affect testing or documentation.