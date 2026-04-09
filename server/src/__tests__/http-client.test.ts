import { EventEmitter } from 'events';
import type { AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { receiverHttpClient } from '../api/http-client.js';

vi.mock('../api/http-client.js', () => ({
  receiverHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  toHttpRequestError: (error: unknown) => (error instanceof Error ? error : new Error('HTTP request failed')),
}));

const createConnectionMock = vi.fn();

vi.mock('net', () => ({
  createConnection: createConnectionMock,
}));

const mockHttpResponses = (responses: Record<string, { body?: string; error?: Error }>) => {
  vi.mocked(receiverHttpClient.get).mockImplementation(async (url: string) => {
    const key = new URL(url).pathname + new URL(url).search;
    const response = responses[key];
    if (!response) {
      throw new Error(`Unexpected HTTP path: ${key}`);
    }
    if (response.error) {
      throw response.error;
    }
    return {
      data: response.body ?? '',
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    } as AxiosResponse<string>;
  });

  vi.mocked(receiverHttpClient.post).mockImplementation(async (url: string) => {
    const key = new URL(url).pathname + new URL(url).search;
    const response = responses[key];
    if (!response) {
      throw new Error(`Unexpected HTTP path: ${key}`);
    }
    if (response.error) {
      throw response.error;
    }
    return {
      data: response.body ?? '',
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    } as AxiosResponse<string>;
  });
};

const mockHeosResponses = (options?: {
  playersResponse?: string;
  quickselectsResponse?: string;
  connectionError?: Error;
}) => {
  createConnectionMock.mockImplementation(() => {
    const socket = new EventEmitter() as EventEmitter & {
      setEncoding: ReturnType<typeof vi.fn>;
      setTimeout: ReturnType<typeof vi.fn>;
      write: (command: string) => void;
      destroy: ReturnType<typeof vi.fn>;
    };

    socket.setEncoding = vi.fn();
    socket.setTimeout = vi.fn();
    socket.destroy = vi.fn();
    socket.write = (command: string) => {
      if (options?.connectionError) {
        process.nextTick(() => {
          socket.emit('error', options.connectionError);
        });
        return;
      }

      const payload = command.includes('get_players')
        ? options?.playersResponse
        : options?.quickselectsResponse;

      if (payload) {
        process.nextTick(() => {
          socket.emit('data', payload);
        });
      }
    };

    process.nextTick(() => socket.emit('connect'));
    return socket;
  });
};

describe('fetchHttpStatus', () => {
  beforeEach(() => {
    vi.resetModules();
    createConnectionMock.mockReset();
    vi.mocked(receiverHttpClient.get).mockReset();
    vi.mocked(receiverHttpClient.post).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses main zone, AppCommand0300, and HEOS quick select data', async () => {
    mockHttpResponses({
      '/goform/formMainZone_MainZoneXmlStatus.xml': {
        body: `
          <item>
            <Power><value>ON</value></Power>
            <MasterVolume><value>-35.5</value></MasterVolume>
            <Mute><value>on</value></Mute>
            <InputFuncSelect><value>SAT/CBL</value></InputFuncSelect>
            <selectSurround><value>Dolby Atmos</value></selectSurround>
          </item>
        `,
      },
      '/goform/AppCommand0300.xml': {
        body: `
          <rx>
            <cmd id="3"><name>GetActiveSpeaker</name><list><param name="activespall"><FL>2</FL><FR>1</FR><SW>2</SW><TFL>2</TFL></param></list></cmd>
            <cmd id="3"><name>GetSourceRename</name><list><param name="SAT/CBL">Cinema Apple TV</param><param name="BD">Disc Player</param></list></cmd>
            <cmd id="3"><name>GetRenameQuickselect</name><list><param name="quick1">Movie Night</param><param name="quick2">Music</param></list></cmd>
            <cmd id="3"><name>GetVideoInfo</name><list><param name="hdmisigin">2160p</param><param name="hdmisigout">2160p</param><param name="videooutput">HDMI</param></list></cmd>
            <cmd id="3"><name>GetAudioInfo</name><list><param name="signal">Dolby TrueHD</param><param name="sound">Dolby Atmos</param><param name="fs">48kHz</param></list></cmd>
          </rx>
        `,
      },
      '/ajax/general/get_config?type=12': {
        body: '<Information><Firmware><Version>8000-2122-F016-8380</Version></Firmware></Information>',
      },
      '/ajax/network/get_config?type=2': {
        body: '<Information><Connection>3</Connection><IPAddress>192.168.1.170</IPAddress></Information>',
      },
    });

    mockHeosResponses({
      playersResponse: '{"heos":{"result":"success"},"payload":[{"pid":7,"ip":"192.168.1.170"}]}\r\n',
      quickselectsResponse: '{"heos":{"result":"success"},"payload":[{"id":1,"name":"HEOS Movie"},{"id":4,"name":"HEOS Games"}]}\r\n',
    });

    const { fetchHttpStatus } = await import('../api/index.js');
    const status = await fetchHttpStatus('192.168.1.170', 8080);

    expect(status.power).toBe('ON');
    expect(status.softwareVersion).toBe('8000-2122-F016-8380');
    expect(status.volume).toBe(-35.5);
    expect(status.muted).toBe(true);
    expect(status.input).toEqual({
      id: 'SAT/CBL',
      name: 'Cinema Apple TV',
      selected: true,
    });
    expect(status.surroundMode).toBe('Dolby Atmos');
    expect(status.networkConnection).toBe('Ethernet');
    expect(status.ipAddress).toBe('192.168.1.170');
    expect(status.availableInputs?.find((input: { id: string }) => input.id === 'BD')).toMatchObject({
      name: 'Disc Player',
      selected: false,
    });
    expect(status.speakers).toEqual([
      { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
      { code: 'FR', name: 'Front Right', active: false, group: 'ear' },
      { code: 'SW', name: 'Subwoofer', active: true, group: 'sub' },
      { code: 'TFL', name: 'Top Front Left', active: true, group: 'height' },
    ]);
    expect(status.smartSelect).toEqual([
      { number: 1, name: 'HEOS Movie', active: false },
      { number: 2, name: 'Music', active: false },
      { number: 3, name: 'Smart Select 3', active: false },
      { number: 4, name: 'HEOS Games', active: false },
    ]);
    expect(status.video).toEqual({
      inputResolution: '2160p',
      outputResolution: '2160p',
      hdrFormat: '---',
      inputSignal: 'HDMI',
      hdmiOutput: 'Auto',
    });
    expect(status.audio).toEqual({
      inputFormat: 'Dolby TrueHD',
      soundMode: 'Dolby Atmos',
      samplingRate: '48kHz',
    });
  });

  it('supports alternate active speaker parameter format', async () => {
    mockHttpResponses({
      '/goform/formMainZone_MainZoneXmlStatus.xml': {
        body: '<item><ZonePower><value>ON</value></ZonePower><Mute><value>off</value></Mute></item>',
      },
      '/goform/AppCommand0300.xml': {
        body: `
          <rx>
            <cmd id="3"><name>GetActiveSpeaker</name><list><param name="FL">2</param><param name="FR">1</param><param name="SW2">2</param></list></cmd>
            <cmd id="3"><name>GetRenameSmartselect</name><list><param name="smart3">Late Night</param></list></cmd>
          </rx>
        `,
      },
      '/ajax/general/get_config?type=12': {
        body: '<Information><Firmware><Version>8000-2122-F016-8380</Version></Firmware></Information>',
      },
      '/ajax/network/get_config?type=2': {
        body: '<Information><Connection>4</Connection><IPAddress>192.168.1.171</IPAddress></Information>',
      },
    });

    mockHeosResponses({
      playersResponse: '{"heos":{"result":"success"},"payload":[{"pid":7,"ip":"192.168.1.170"}]}\r\n',
      quickselectsResponse: '{"heos":{"result":"success"},"payload":[]}\r\n',
    });

    const { fetchHttpStatus } = await import('../api/index.js');
    const status = await fetchHttpStatus('192.168.1.170', 8080);

    expect(status.power).toBe('ON');
    expect(status.muted).toBe(false);
    expect(status.softwareVersion).toBe('8000-2122-F016-8380');
    expect(status.networkConnection).toBe('Wi-Fi');
    expect(status.ipAddress).toBe('192.168.1.171');
    expect(status.speakers).toEqual([
      { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
      { code: 'FR', name: 'Front Right', active: false, group: 'ear' },
      { code: 'SW2', name: 'Subwoofer 2', active: true, group: 'sub' },
    ]);
    expect(status.smartSelect?.[2]).toEqual({ number: 3, name: 'Late Night', active: false });
  });

  it('returns partial data when downstream requests fail', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockHttpResponses({
      '/goform/formMainZone_MainZoneXmlStatus.xml': {
        body: '<item><Power><value>ON</value></Power></item>',
      },
      '/goform/AppCommand0300.xml': {
        error: new Error('AppCommand0300 unavailable'),
      },
      '/ajax/general/get_config?type=12': {
        body: '<Information><Firmware><Version>8000-2122-F016-8380</Version></Firmware></Information>',
      },
      '/ajax/network/get_config?type=2': {
        body: '<Information><Connection>3</Connection><IPAddress>192.168.1.170</IPAddress></Information>',
      },
    });

    mockHeosResponses({
      connectionError: new Error('HEOS unavailable'),
    });

    const { fetchHttpStatus } = await import('../api/index.js');
    const status = await fetchHttpStatus('192.168.1.170', 8080);

    expect(status).toEqual({
      power: 'ON',
      muted: false,
      softwareVersion: '8000-2122-F016-8380',
      networkConnection: 'Ethernet',
      ipAddress: '192.168.1.170',
    });
    expect(errorSpy).toHaveBeenCalledWith('[HTTP] AppCommand0300 fetch error:', 'AppCommand0300 unavailable');
    expect(errorSpy).toHaveBeenCalledWith('[HTTP] HEOS smart select fetch error:', 'HEOS unavailable');
  });
});