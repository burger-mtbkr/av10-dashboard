import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createServerMock = vi.fn();
let lastMarantzInstance: any;

class MockWebSocketServer {
  handlers: Record<string, (...args: any[]) => void> = {};
  close = vi.fn();

  constructor(public options: Record<string, unknown>) {}

  on(event: string, handler: (...args: any[]) => void) {
    this.handlers[event] = handler;
    return this;
  }

  emit(event: string, ...args: any[]) {
    this.handlers[event]?.(...args);
  }
}

class MockMarantzService {
  listeners: Record<string, Array<(...args: any[]) => void>> = {};
  connect = vi.fn().mockResolvedValue(undefined);
  disconnect = vi.fn();
  getStatus = vi.fn(() => ({ power: 'ON', connected: true }));
  refreshStatus = vi.fn().mockResolvedValue(undefined);
  setVolume = vi.fn();
  setInput = vi.fn();
  setSmartSelect = vi.fn();
  sendCommand = vi.fn();

  constructor(..._args: any[]) {
    lastMarantzInstance = this;
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return this;
  }

  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners[event] || []) {
      listener(payload);
    }
  }
}

vi.mock('http', () => ({
  createServer: createServerMock,
}));

vi.mock('ws', () => ({
  WebSocketServer: MockWebSocketServer,
  WebSocket: { OPEN: 1 },
}));

vi.mock('../marantz-service.js', () => ({
  MarantzService: MockMarantzService,
}));

describe('index runtime helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerMock.mockReset();
    lastMarantzInstance = null;
    createServerMock.mockImplementation((app: unknown) => ({
      app,
      listen: vi.fn((_port: number, callback?: () => void) => callback?.()),
      close: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns runtime config from environment overrides', async () => {
    const { getRuntimeConfig } = await import('../index.js');

    expect(
      getRuntimeConfig({
        AVR_HOST: '10.0.0.50',
        AVR_PORT: '2323',
        AVR_HTTP_PORT: '8081',
        SERVER_PORT: '4000',
        POLL_INTERVAL: '15000',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      avrHost: '10.0.0.50',
      avrPort: 2323,
      avrHttpPort: 8081,
      serverPort: 4000,
      pollInterval: 15000,
      reconnectInterval: 10000,
    });
  });

  it('returns empty settings when the settings file is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadSettings } = await import('../index.js');

    expect(loadSettings('C:/definitely-missing/settings.json')).toEqual({});
    expect(warnSpy).toHaveBeenCalledWith('[Server] Could not load settings.json, using defaults');
  });

  it('sends initial status and broadcasts Marantz events to websocket clients', async () => {
    const { createRealtimeServer } = await import('../index.js');
    const marantz = new MockMarantzService();
    const server = { close: vi.fn() } as any;
    const wss = createRealtimeServer(server, marantz as any) as unknown as MockWebSocketServer;

    const clientHandlers: Record<string, () => void> = {};
    const client = {
      readyState: 1,
      send: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        clientHandlers[event] = handler;
      }),
    };

    wss.emit('connection', client);
    expect(client.send).toHaveBeenCalledWith(JSON.stringify({ type: 'status', data: { power: 'ON', connected: true } }));
  expect(marantz.refreshStatus).toHaveBeenCalledTimes(1);

    marantz.emit('connected');
    marantz.emit('event', { event: 'MV', parameter: '50' });
    expect(client.send).toHaveBeenCalledWith(JSON.stringify({ type: 'connected', data: 'Connected to Marantz AV10' }));
    expect(client.send).toHaveBeenCalledWith(JSON.stringify({ type: 'event', data: { event: 'MV', parameter: '50' } }));

    clientHandlers.close();
    marantz.emit('disconnected');
    expect(client.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'disconnected', data: 'Disconnected from Marantz AV10' }));
  });

  it('starts the server, connects to Marantz, and registers SIGINT shutdown', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process as any);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { startServer } = await import('../index.js');

    const runtime = startServer(
      { app: { title: 'Home Theater Status', defaultLanguage: 'en' } },
      {
        avrHost: '10.0.0.5',
        avrPort: 23,
        avrHttpPort: 8080,
        serverPort: 3001,
        pollInterval: 30000,
        reconnectInterval: 10000,
      },
    );

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(lastMarantzInstance.connect).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[Server] HTTP + WebSocket server running on port 3001');
    expect(logSpy).toHaveBeenCalledWith('[Server] Connecting to Marantz AV10 at 10.0.0.5:23...');

    const shutdownHandler = processOnSpy.mock.calls.find(([event]) => event === 'SIGINT')?.[1] as (() => void) | undefined;
    expect(shutdownHandler).toBeDefined();

    shutdownHandler?.();

    expect(lastMarantzInstance.disconnect).toHaveBeenCalledTimes(1);
    expect((runtime.server as any).close).toHaveBeenCalledTimes(1);
    expect((runtime.wss as any).close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});