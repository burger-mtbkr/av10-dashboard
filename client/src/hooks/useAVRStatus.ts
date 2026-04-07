import { useState, useEffect, useRef, useCallback } from 'react';
import type { AVRStatus, WSMessage } from '../types';

const DEFAULT_STATUS: AVRStatus = {
  power: 'OFF',
  volume: 0,
  volumeDisplay: '--',
  maxVolume: 98,
  muted: false,
  input: { id: '', name: '---', selected: true },
  availableInputs: [],
  speakers: [],
  video: {
    inputResolution: '---',
    outputResolution: '---',
    hdrFormat: '---',
    inputSignal: '---',
    hdmiOutput: 'Auto',
  },
  audio: {
    inputFormat: '---',
    soundMode: '---',
    samplingRate: '---',
    dialogEnhancer: 'Off',
    dynamicEq: '---',
    dynamicVolume: '---',
    multEq: '---',
  },
  subwoofers: [],
  lfeLevel: '0 dB',
  ecoMode: '---',
  surroundMode: '---',
  connected: false,
  lastUpdate: '',
};

export function useAVRStatus() {
  const [status, setStatus] = useState<AVRStatus>(DEFAULT_STATUS);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Determine WebSocket URL based on current page location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'status':
            setStatus(msg.data as AVRStatus);
            break;
          case 'connected':
            setStatus((prev) => ({ ...prev, connected: true }));
            break;
          case 'disconnected':
            setStatus((prev) => ({ ...prev, connected: false }));
            break;
          case 'error':
            console.error('[WS] Server error:', msg.data);
            break;
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // API helper functions
  const setVolume = useCallback(async (volume: number) => {
    await fetch('/api/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume }),
    });
  }, []);

  const volumeUp = useCallback(async () => {
    await fetch('/api/volume/up', { method: 'POST' });
  }, []);

  const volumeDown = useCallback(async () => {
    await fetch('/api/volume/down', { method: 'POST' });
  }, []);

  const setInput = useCallback(async (inputId: string) => {
    await fetch('/api/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: inputId }),
    });
  }, []);

  const toggleMute = useCallback(async () => {
    await fetch('/api/mute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ muted: !status.muted }),
    });
  }, [status.muted]);

  return {
    status,
    wsConnected,
    setVolume,
    volumeUp,
    volumeDown,
    setInput,
    toggleMute,
  };
}
