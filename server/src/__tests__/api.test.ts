import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../index.js';

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
  smartSelect: [
    { number: 1, name: 'Apple TV', active: true },
    { number: 2, name: 'Music', active: false },
    { number: 3, name: 'PS3', active: false },
    { number: 4, name: 'Xbox', active: false },
  ],
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
  setSmartSelect: vi.fn(),
  sendCommand: vi.fn(),
};

describe('API Routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp(mockMarantz as any, {
      app: {
        title: 'Home Theater Status',
        defaultLanguage: 'en',
      },
    });
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

  describe('POST /api/smartselect/:preset', () => {
    it('should accept valid preset 1-4', async () => {
      const res = await request(app)
        .post('/api/smartselect/2');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preset).toBe(2);
      expect(mockMarantz.setSmartSelect).toHaveBeenCalledWith(2);
    });

    it('should reject preset 0', async () => {
      const res = await request(app)
        .post('/api/smartselect/0');
      expect(res.status).toBe(400);
    });

    it('should reject preset 5', async () => {
      const res = await request(app)
        .post('/api/smartselect/5');
      expect(res.status).toBe(400);
    });

    it('should reject non-numeric preset', async () => {
      const res = await request(app)
        .post('/api/smartselect/abc');
      expect(res.status).toBe(400);
    });
  });
});
