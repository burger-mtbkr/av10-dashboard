import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MarantzService } from './marantz-service.js';
import type { AVRStatus, WSMessage } from './types.js';

// --- Load settings ---
const settingsPath = resolve(process.cwd(), '..', 'settings.json');
let settings: any = {};
try {
  settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
} catch {
  console.warn('[Server] Could not load settings.json, using defaults');
}

// --- Config from env / settings ---
const AVR_HOST = process.env.AVR_HOST || '192.168.1.170';
const AVR_PORT = parseInt(process.env.AVR_PORT || '23', 10);
const AVR_HTTP_PORT = parseInt(process.env.AVR_HTTP_PORT || '8080', 10);
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3001', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '30000', 10);

// --- Express setup ---
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get settings (non-sensitive)
app.get('/api/settings', (_req, res) => {
  res.json({
    title: settings?.app?.title || 'Home Theater Status',
    defaultLanguage: settings?.app?.defaultLanguage || 'en',
  });
});

// --- Marantz Service ---
const marantz = new MarantzService(AVR_HOST, AVR_PORT, AVR_HTTP_PORT, 10000, POLL_INTERVAL);

// Get current status
app.get('/api/status', (_req, res) => {
  res.json(marantz.getStatus());
});

// Set volume
app.post('/api/volume', (req, res) => {
  const { volume } = req.body as { volume: number };
  if (typeof volume !== 'number' || volume < -80 || volume > 18) {
    res.status(400).json({ error: 'Volume must be a number between -80 and 18' });
    return;
  }
  marantz.setVolume(volume);
  res.json({ success: true, volume });
});

// Volume up/down
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

// Set input
app.post('/api/input', (req, res) => {
  const { input } = req.body as { input: string };
  if (!input) {
    res.status(400).json({ error: 'Input source ID required' });
    return;
  }
  marantz.setInput(input);
  res.json({ success: true, input });
});

// Mute toggle
app.post('/api/mute', (req, res) => {
  const { muted } = req.body as { muted: boolean };
  marantz.sendCommand(muted ? 'MUON' : 'MUOFF');
  res.json({ success: true, muted });
});

// --- HTTP server + WebSocket ---
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  clients.add(ws);

  // Send current status immediately
  const msg: WSMessage = { type: 'status', data: marantz.getStatus() };
  ws.send(JSON.stringify(msg));

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err);
    clients.delete(ws);
  });
});

/** Broadcast a message to all connected WebSocket clients */
function broadcast(message: WSMessage): void {
  const json = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

// --- Wire up Marantz events to WebSocket broadcasts ---
marantz.on('statusChanged', (status: AVRStatus) => {
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

// --- Start ---
server.listen(SERVER_PORT, () => {
  console.log(`[Server] HTTP + WebSocket server running on port ${SERVER_PORT}`);
  console.log(`[Server] Connecting to Marantz AV10 at ${AVR_HOST}:${AVR_PORT}...`);
  marantz.connect().catch((err) => {
    console.error('[Server] Initial connection failed:', err.message);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Server] Shutting down...');
  marantz.disconnect();
  wss.close();
  server.close();
  process.exit(0);
});
