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
| `.gitignore` | Root ignore rules for dependencies, build output, env files, and test artifacts. |
| `.npmrc` | Pins installs to the public npm registry. |
| `package.json` | Root scripts for `dev`, `test`, `test:coverage`, `test:e2e`, `build`, and `install:all`. |
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
| `client/src/App.tsx` | Top-level dashboard composition. Renders header chips plus Volume, Smart Select, Speaker Preset, Subwoofer, Audio, Video, and System cards. |
| `client/src/main.tsx` | React bootstrap entry point. |
| `client/src/theme.ts` | Shared MUI theme configuration. |
| `client/src/constants.ts` | Shared frontend constants such as placeholder values. |
| `client/src/types.ts` | Frontend type definitions that mirror the backend status model. |

### Frontend API Helpers

Each action has its own request module under `client/src/api/`.

| Path | Purpose |
| --- | --- |
| `client/src/api/client.ts` | Shared axios instance for browser API calls. |
| `client/src/api/request.ts` | Small helpers for POST and JSON POST requests. |
| `client/src/api/index.ts` | Re-export surface for the action helpers. |
| `client/src/api/set-volume.ts` | Set absolute volume. |
| `client/src/api/volume-up.ts` | Send volume-up command. |
| `client/src/api/volume-down.ts` | Send volume-down command. |
| `client/src/api/set-input.ts` | Change the input source. |
| `client/src/api/set-mute.ts` | Toggle mute state. |
| `client/src/api/select-smart-preset.ts` | Recall a Smart Select preset. |
| `client/src/api/select-speaker-preset.ts` | Switch speaker preset 1 or 2. |

### Frontend Hook

| Path | Purpose |
| --- | --- |
| `client/src/hooks/useAVRStatus.ts` | Maintains live AVR state, opens the WebSocket, handles reconnects, applies optimistic updates, and reconciles them against server-confirmed status. |
| `client/src/hooks/index.ts` | Re-export surface for hooks. |

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
| `client/src/components/index.ts` | Re-export surface for the dashboard cards. |

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
| `server/debug/` | Ad hoc probe and debugging scripts for receiver endpoints and transports. |
| `server/coverage/` | Generated coverage artifacts for the backend test suite. |

### Backend Runtime Modules

| Path | Purpose |
| --- | --- |
| `server/src/index.ts` | Backend entry point. Loads settings, exposes the REST API, creates the WebSocket server, and wires `MarantzService` events into broadcasts. |
| `server/src/marantz-service.ts` | Long-lived receiver integration service. Maintains the canonical `IAVRStatus`, parses telnet events, runs HTTP refreshes, performs speaker-preset transition guarding, and emits status updates. |
| `server/src/constants.ts` | Receiver protocol constants, channel/source maps, and volume conversion helpers. |
| `server/src/types.ts` | Shared backend types, mirrored on the client. |

### Backend API Transport Layer

`server/src/api/` contains one transport concern per file.

| Path | Purpose |
| --- | --- |
| `server/src/api/http-client.ts` | Shared axios client and error normalization for receiver-side HTTP calls. |
| `server/src/api/http-get.ts` | Raw HTTP GET helper for XML and web-control endpoints. |
| `server/src/api/http-post-xml.ts` | HTTP POST helper for XML payloads. |
| `server/src/api/fetch-main-zone-status.ts` | Fetches Main Zone XML status from the legacy `:8080` interface. |
| `server/src/api/fetch-app-command-0300.ts` | Executes AppCommand0300 requests. |
| `server/src/api/fetch-http-status.ts` | Orchestrates full status refresh by combining Main Zone, AppCommand0300, web-control, HEOS, and speaker-preset reads. |
| `server/src/api/fetch-web-control-config.ts` | Reads newer web-control config endpoints from port `11080`. |
| `server/src/api/fetch-speaker-preset.ts` | Reads the active speaker preset from `/ajax/speakers/get_config?type=11`. |
| `server/src/api/set-speaker-preset.ts` | Helper for writing speaker preset changes through `/ajax/speakers/set_config?type=11`. Exported and tested, but not used by the current REST runtime path. |
| `server/src/api/get-heos-player-id.ts` | Resolves the HEOS player identifier for the receiver. |
| `server/src/api/heos-command.ts` | Executes HEOS CLI commands. |
| `server/src/api/fetch-heos-quick-select-names.ts` | Pulls Quick Select names from HEOS when needed. |
| `server/src/api/index.ts` | Re-export surface for backend API helpers. |
| `server/src/api/types.ts` | Internal transport-layer types for aggregated HTTP status results. |

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

| Path | Purpose |
| --- | --- |
| `e2e/dashboard.spec.ts` | Playwright coverage for page load, header rendering, connection chips, major cards, responsive layout, and API smoke checks. |

## Unit Tests

### Backend Tests

| Path | Purpose |
| --- | --- |
| `server/src/__tests__/api.test.ts` | Validates REST routes, input validation, and error responses. |
| `server/src/__tests__/constants.test.ts` | Covers volume conversion helpers and protocol lookup tables. |
| `server/src/__tests__/http-client.test.ts` | Covers aggregated HTTP status fetch behavior and response parsing. |
| `server/src/__tests__/index.test.ts` | Covers runtime helpers, WebSocket broadcast wiring, config loading, and shutdown registration. |
| `server/src/__tests__/marantz-service.test.ts` | Covers telnet parsing, HTTP merge behavior, speaker-layout logic, reconnection, and command dispatch. |

### Frontend Tests

| Path | Purpose |
| --- | --- |
| `client/src/__tests__/setup.ts` | jsdom and matcher setup. |
| `client/src/__tests__/test-utils.tsx` | Shared render helpers and mock status builders. |
| `client/src/__tests__/App.test.tsx` | Verifies dashboard card ordering. |
| `client/src/__tests__/hooks/useAVRStatus.test.tsx` | Covers WebSocket handling, optimistic state, timeout rollback, and API helper calls. |
| `client/src/__tests__/components/AudioCard.test.tsx` | Covers audio card rendering. |
| `client/src/__tests__/components/InputCard.test.tsx` | Covers Smart Select rendering and active metadata. |
| `client/src/__tests__/components/SpeakerPresetCard.test.tsx` | Covers preset switching UI and speaker-layout rendering. |
| `client/src/__tests__/components/SubwooferCard.test.tsx` | Covers subwoofer level display and progress bars. |
| `client/src/__tests__/components/SystemCard.test.tsx` | Covers power, network, IP, and timestamp presentation. |
| `client/src/__tests__/components/VideoCard.test.tsx` | Covers signal and HDR presentation. |
| `client/src/__tests__/components/VolumeCard.test.tsx` | Covers volume rendering, controls, thresholds, and callbacks. |

## Generated And Support Artifacts

The repository also contains generated or support directories such as `client/coverage/`, `server/coverage/`, `test-results/`, and `.tmp-ui/`. Those are operational artifacts rather than primary source modules, so they are only referenced here when they affect testing or documentation.