import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// Create a mock status object
const mockStatus = {
  power: 'ON',
  volume: 45,
  volumeDisplay: '45',
  maxVolume: 75,
  muted: false,
  input: { id: 'SAT/CBL', name: 'CBL/SAT', selected: true },
  availableInputs: [
    { id: 'SAT/CBL', name: 'CBL/SAT', selected: true },
    { id: 'BD', name: 'Blu-ray', selected: false },
  ],
  speakers: [],
  video: {
    inputResolution: '4K',
    outputResolution: '4K',
    hdrFormat: 'HDR10',
    inputSignal: 'HDMI',
    hdmiOutput: 'Auto',
  },
  audio: {
    inputFormat: 'Dolby TrueHD',
    soundMode: 'Dolby Atmos',
    samplingRate: '48kHz',
    dialogEnhancer: 'Off',
    dynamicEq: 'ON',
    dynamicVolume: 'OFF',
    multEq: 'AUDYSSEY',
  },
  subwoofers: [{ number: 1, level: '0.0 dB', active: true }],
  lfeLevel: '0 dB',
  ecoMode: 'OFF',
  surroundMode: 'Dolby Atmos',
  connected: true,
  lastUpdate: '2025-01-01T00:00:00.000Z',
};

// Create mock marantz instance
const mockMarantz = {
  getStatus: () => JSON.parse(JSON.stringify(mockStatus)),
  setVolume: vi.fn(),
  setInput: vi.fn(),
  sendCommand: vi.fn(),
};

// Build a test Express app matching the real route structure
function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/settings', (_req, res) => {
    res.json({
      title: 'Home Theater Status',
      defaultLanguage: 'en',
    });
  });

  app.get('/api/status', (_req, res) => {
    res.json(mockMarantz.getStatus());
  });

  app.post('/api/volume', (req, res) => {
    const { volume } = req.body as { volume: number };
    if (typeof volume !== 'number' || volume < 0 || volume > 98) {
      res.status(400).json({ error: 'Volume must be a number between 0 and 98' });
      return;
    }
    mockMarantz.setVolume(volume);
    res.json({ success: true, volume });
  });

  app.post('/api/volume/:direction', (req, res) => {
    const { direction } = req.params;
    if (direction === 'up') {
      mockMarantz.sendCommand('MVUP');
    } else if (direction === 'down') {
      mockMarantz.sendCommand('MVDOWN');
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
    mockMarantz.setInput(input);
    res.json({ success: true, input });
  });

  app.post('/api/mute', (req, res) => {
    const { muted } = req.body as { muted: boolean };
    mockMarantz.sendCommand(muted ? 'MUON' : 'MUOFF');
    res.json({ success: true, muted });
  });

  return app;
}

describe('API Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/settings', () => {
    it('should return app settings', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Home Theater Status');
      expect(res.body.defaultLanguage).toBe('en');
    });
  });

  describe('GET /api/status', () => {
    it('should return AVR status', async () => {
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body.power).toBe('ON');
      expect(res.body.volume).toBe(45);
      expect(res.body.muted).toBe(false);
      expect(res.body.input.id).toBe('SAT/CBL');
      expect(res.body.connected).toBe(true);
    });

    it('should include video info', async () => {
      const res = await request(app).get('/api/status');
      expect(res.body.video.inputResolution).toBe('4K');
      expect(res.body.video.hdrFormat).toBe('HDR10');
    });

    it('should include audio info', async () => {
      const res = await request(app).get('/api/status');
      expect(res.body.audio.inputFormat).toBe('Dolby TrueHD');
      expect(res.body.audio.soundMode).toBe('Dolby Atmos');
    });
  });

  describe('POST /api/volume', () => {
    it('should accept valid volume', async () => {
      const res = await request(app)
        .post('/api/volume')
        .send({ volume: 50 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMarantz.setVolume).toHaveBeenCalledWith(50);
    });

    it('should reject volume below 0', async () => {
      const res = await request(app)
        .post('/api/volume')
        .send({ volume: -1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject volume above 98', async () => {
      const res = await request(app)
        .post('/api/volume')
        .send({ volume: 99 });
      expect(res.status).toBe(400);
    });

    it('should reject non-numeric volume', async () => {
      const res = await request(app)
        .post('/api/volume')
        .send({ volume: 'loud' });
      expect(res.status).toBe(400);
    });

    it('should reject missing volume', async () => {
      const res = await request(app)
        .post('/api/volume')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/volume/:direction', () => {
    it('should accept "up"', async () => {
      const res = await request(app)
        .post('/api/volume/up');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMarantz.sendCommand).toHaveBeenCalledWith('MVUP');
    });

    it('should accept "down"', async () => {
      const res = await request(app)
        .post('/api/volume/down');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMarantz.sendCommand).toHaveBeenCalledWith('MVDOWN');
    });

    it('should reject invalid direction', async () => {
      const res = await request(app)
        .post('/api/volume/sideways');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/input', () => {
    it('should accept valid input source', async () => {
      const res = await request(app)
        .post('/api/input')
        .send({ input: 'BD' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMarantz.setInput).toHaveBeenCalledWith('BD');
    });

    it('should reject empty input', async () => {
      const res = await request(app)
        .post('/api/input')
        .send({ input: '' });
      expect(res.status).toBe(400);
    });

    it('should reject missing input', async () => {
      const res = await request(app)
        .post('/api/input')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/mute', () => {
    it('should send MUON when muted=true', async () => {
      const res = await request(app)
        .post('/api/mute')
        .send({ muted: true });
      expect(res.status).toBe(200);
      expect(mockMarantz.sendCommand).toHaveBeenCalledWith('MUON');
    });

    it('should send MUOFF when muted=false', async () => {
      const res = await request(app)
        .post('/api/mute')
        .send({ muted: false });
      expect(res.status).toBe(200);
      expect(mockMarantz.sendCommand).toHaveBeenCalledWith('MUOFF');
    });
  });
});
