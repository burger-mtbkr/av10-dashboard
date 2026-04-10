import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer, type Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { MarantzService } from './marantz-service.js';
import type { IAVRStatus, IWSMessage } from './types.js';

type MarantzApi = Pick<MarantzService, 'getStatus' | 'setVolume' | 'setInput' | 'setSmartSelect' | 'setSpeakerPreset' | 'sendCommand'>;
type MarantzRealtimeApi = Pick<MarantzService, 'getStatus' | 'on' | 'refreshStatus'>;

export interface ISettings {
  app?: {
    title?: string;
    defaultLanguage?: string;
  };
}

export interface IRuntimeConfig {
  avrHost: string;
  avrPort: number;
  avrHttpPort: number;
  serverPort: number;
  pollInterval: number;
  reconnectInterval: number;
}

export type Settings = ISettings;
export type RuntimeConfig = IRuntimeConfig;

export const loadSettings = (settingsPath = resolve(process.cwd(), '..', 'settings.json')): ISettings => {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    console.warn('[Server] Could not load settings.json, using defaults');
    return {};
  }
};

export const getRuntimeConfig = (env = process.env): IRuntimeConfig => {
  return {
    avrHost: env.AVR_HOST || '192.168.1.170',
    avrPort: parseInt(env.AVR_PORT || '23', 10),
    avrHttpPort: parseInt(env.AVR_HTTP_PORT || '8080', 10),
    serverPort: parseInt(env.SERVER_PORT || '3001', 10),
    pollInterval: parseInt(env.POLL_INTERVAL || '30000', 10),
    reconnectInterval: 10000,
  };
};

export const createApp = (marantz: MarantzApi, settings: ISettings = {}): express.Express => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/settings', (_req, res) => {
    res.json({
      title: settings?.app?.title || 'Home Theater Status',
      defaultLanguage: settings?.app?.defaultLanguage || 'en',
    });
  });

  app.get('/api/status', (_req, res) => {
    res.json(marantz.getStatus());
  });

  app.post('/api/volume', (req, res) => {
    const { volume } = req.body as { volume: number };
    if (typeof volume !== 'number' || volume < 0 || volume > 98) {
      res.status(400).json({ error: 'Volume must be a number between 0 and 98' });
      return;
    }
    marantz.setVolume(volume);
    res.json({ success: true, volume });
  });

  app.post('/api/volume/:direction', (req, res) => {
    const { direction } = req.params;
    if (direction === 'up') {
      marantz.sendCommand('MVUP');
    } else if (direction === 'down') {
      marantz.sendCommand('MVDOWN');
    } else {
      res.status(400).json({ error: 'Direction must be "up" or "down"' });
      return;
    }
    res.json({ success: true, direction });
  });

  app.post('/api/input', (req, res) => {
    const { input } = req.body as { input: string };
    if (!input) {
      res.status(400).json({ error: 'Input source ID required' });
      return;
    }
    marantz.setInput(input);
    res.json({ success: true, input });
  });

  app.post('/api/mute', (req, res) => {
    const { muted } = req.body as { muted: boolean };
    marantz.sendCommand(muted ? 'MUON' : 'MUOFF');
    res.json({ success: true, muted });
  });

  app.post('/api/smartselect/:preset', (req, res) => {
    const num = parseInt(req.params.preset, 10);
    if (isNaN(num) || num < 1 || num > 4) {
      res.status(400).json({ error: 'Preset must be 1-4' });
      return;
    }
    marantz.setSmartSelect(num);
    res.json({ success: true, preset: num });
  });

  app.post('/api/speakerpreset/:preset', async (req, res) => {
    const num = parseInt(req.params.preset, 10);
    if (isNaN(num) || num < 1 || num > 2) {
      res.status(400).json({ error: 'Preset must be 1-2' });
      return;
    }

    try {
      await marantz.setSpeakerPreset(num);
      res.json({ success: true, preset: num });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set speaker preset';
      res.status(502).json({ error: message });
    }
  });

  return app;
};

export const createRealtimeServer = (server: HttpServer, marantz: MarantzRealtimeApi): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    clients.add(ws);

    const msg: IWSMessage = { type: 'status', data: marantz.getStatus() };
    ws.send(JSON.stringify(msg));

    void marantz.refreshStatus().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WS] Failed to refresh status on client connect:', message);
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err);
      clients.delete(ws);
    });
  });

  const broadcast = (message: IWSMessage): void => {
    const json = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    }
  };

  marantz.on('statusChanged', (status: IAVRStatus) => {
    broadcast({ type: 'status', data: status });
  });

  marantz.on('connected', () => {
    broadcast({ type: 'connected', data: 'Connected to Marantz AV10' });
  });

  marantz.on('disconnected', () => {
    broadcast({ type: 'disconnected', data: 'Disconnected from Marantz AV10' });
  });

  marantz.on('event', (event) => {
    broadcast({ type: 'event', data: event });
  });

  return wss;
};

export const registerShutdown = (server: HttpServer, wss: WebSocketServer, marantz: MarantzService): void => {
  process.on('SIGINT', () => {
    console.log('[Server] Shutting down...');
    marantz.disconnect();
    wss.close();
    server.close();
    process.exit(0);
  });
};

export const startServer = (settings = loadSettings(), config = getRuntimeConfig()) => {
  const marantz = new MarantzService(
    config.avrHost,
    config.avrPort,
    config.avrHttpPort,
    config.reconnectInterval,
    config.pollInterval,
  );
  const app = createApp(marantz, settings);
  const server = createServer(app);
  const wss = createRealtimeServer(server, marantz);

  server.listen(config.serverPort, async () => {
    console.log(`[Server] HTTP + WebSocket server running on port ${config.serverPort}`);
    console.log(`[Server] Connecting to Marantz AV10 at ${config.avrHost}:${config.avrPort}...`);
    try {
      await marantz.connect();
    } catch (err) {
      console.error('[Server] Initial connection failed:', err.message);
    }
  });

  registerShutdown(server, wss, marantz);
  return { app, server, wss, marantz };
};

const isDirectExecution = (): boolean => {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
};

if (isDirectExecution()) {
  startServer();
}
