import { useState, useEffect, useRef, useCallback } from 'react';
import {
  selectSpeakerPresetRequest,
  selectSmartPresetRequest,
  setInputRequest,
  setMuteRequest,
  setVolumeRequest,
  volumeDownRequest,
  volumeUpRequest,
} from '../api';
import { PLACEHOLDER_VALUE, type IAVRStatus, type IWSMessage } from '../types';

type OptimisticStatus = Partial<
  Pick<
    IAVRStatus,
    'volume' | 'volumeDisplay' | 'muted' | 'input' | 'availableInputs' | 'smartSelect' | 'speakerPreset' | 'speakers' | 'speakerLayout'
  >
>;

type OptimisticKey = keyof OptimisticStatus;

const OPTIMISTIC_STATUS_TIMEOUT_MS = 5000;

const DEFAULT_STATUS: IAVRStatus = {
  power: 'OFF',
  processorModel: PLACEHOLDER_VALUE,
  softwareVersion: PLACEHOLDER_VALUE,
  volume: 0,
  volumeDisplay: '--',
  maxVolume: 98,
  muted: false,
  input: { id: '', name: PLACEHOLDER_VALUE, selected: true },
  availableInputs: [],
  smartSelect: [
    { number: 1, name: 'Smart Select 1', active: false },
    { number: 2, name: 'Smart Select 2', active: false },
    { number: 3, name: 'Smart Select 3', active: false },
    { number: 4, name: 'Smart Select 4', active: false },
  ],
  speakerPreset: null,
  speakerLayout: '',
  speakers: [],
  video: {
    inputResolution: PLACEHOLDER_VALUE,
    outputResolution: PLACEHOLDER_VALUE,
    hdrFormat: PLACEHOLDER_VALUE,
    inputSignal: PLACEHOLDER_VALUE,
    hdmiOutput: 'Auto',
  },
  audio: {
    inputFormat: PLACEHOLDER_VALUE,
    soundMode: PLACEHOLDER_VALUE,
    samplingRate: PLACEHOLDER_VALUE,
    dialogEnhancer: 'Off',
    dynamicEq: PLACEHOLDER_VALUE,
    dynamicVolume: PLACEHOLDER_VALUE,
    multEq: PLACEHOLDER_VALUE,
  },
  subwoofers: [],
  lfeLevel: '0 dB',
  ecoMode: PLACEHOLDER_VALUE,
  networkConnection: PLACEHOLDER_VALUE,
  ipAddress: PLACEHOLDER_VALUE,
  surroundMode: PLACEHOLDER_VALUE,
  connected: false,
  lastUpdate: '',
};

export const useAVRStatus = () => {
  const [baseStatus, setBaseStatus] = useState<IAVRStatus>(DEFAULT_STATUS);
  const [optimisticStatus, setOptimisticStatus] = useState<OptimisticStatus>({});
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optimisticTimers = useRef<Map<OptimisticKey, ReturnType<typeof setTimeout>>>(new Map());
  const baseStatusRef = useRef(DEFAULT_STATUS);
  const optimisticStatusRef = useRef<OptimisticStatus>({});
  const speakerPresetLayoutsRef = useRef<Partial<Record<1 | 2, string>>>({});

  const cacheSpeakerPresetLayout = useCallback((nextStatus: IAVRStatus) => {
    if (nextStatus.speakerPreset === null) {
      return;
    }

    const layoutLabel = nextStatus.speakerLayout.trim();
    if (!layoutLabel) {
      return;
    }

    speakerPresetLayoutsRef.current[nextStatus.speakerPreset] = layoutLabel;
  }, []);

  const syncBaseStatus = useCallback(
    (nextStatus: IAVRStatus | ((prev: IAVRStatus) => IAVRStatus)) => {
      setBaseStatus((prev) => {
        const resolvedStatus =
          typeof nextStatus === 'function'
            ? (nextStatus as (prev: IAVRStatus) => IAVRStatus)(prev)
            : nextStatus;

        baseStatusRef.current = resolvedStatus;
        return resolvedStatus;
      });
    },
    [],
  );

  const syncOptimisticStatus = useCallback((nextStatus: OptimisticStatus) => {
    optimisticStatusRef.current = nextStatus;
    setOptimisticStatus(nextStatus);
  }, []);

  const clearOptimisticKeys = useCallback(
    (keys: OptimisticKey[]) => {
      const uniqueKeys = [...new Set(keys)];
      if (uniqueKeys.length === 0) {
        return;
      }

      const nextStatus = { ...optimisticStatusRef.current };
      let changed = false;

      for (const key of uniqueKeys) {
        const timer = optimisticTimers.current.get(key);
        if (timer) {
          clearTimeout(timer);
          optimisticTimers.current.delete(key);
        }

        if (key in nextStatus) {
          delete nextStatus[key];
          changed = true;
        }
      }

      if (changed) {
        syncOptimisticStatus(nextStatus);
      }
    },
    [syncOptimisticStatus],
  );

  const queueOptimisticUpdate = useCallback(
    (patch: OptimisticStatus) => {
      const keys = Object.keys(patch) as OptimisticKey[];
      if (keys.length === 0) {
        return;
      }

      syncOptimisticStatus({
        ...optimisticStatusRef.current,
        ...patch,
      });

      for (const key of keys) {
        const existingTimer = optimisticTimers.current.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        optimisticTimers.current.set(
          key,
          setTimeout(() => {
            clearOptimisticKeys([key]);
          }, OPTIMISTIC_STATUS_TIMEOUT_MS),
        );
      }
    },
    [clearOptimisticKeys, syncOptimisticStatus],
  );

  const reconcileOptimisticStatus = useCallback(
    (nextStatus: IAVRStatus) => {
      const currentOptimisticStatus = optimisticStatusRef.current;
      const keysToClear: OptimisticKey[] = [];

      if (
        currentOptimisticStatus.volume !== undefined &&
        nextStatus.volume === currentOptimisticStatus.volume
      ) {
        keysToClear.push('volume', 'volumeDisplay');
      }

      if (
        currentOptimisticStatus.muted !== undefined &&
        nextStatus.muted === currentOptimisticStatus.muted
      ) {
        keysToClear.push('muted');
      }

      if (
        currentOptimisticStatus.input &&
        nextStatus.input.id === currentOptimisticStatus.input.id
      ) {
        keysToClear.push('input', 'availableInputs');
      }

      if (currentOptimisticStatus.smartSelect) {
        const optimisticPreset = currentOptimisticStatus.smartSelect.find(
          (preset: IAVRStatus['smartSelect'][number]) => preset.active,
        )?.number;
        const activePreset = nextStatus.smartSelect.find(
          (preset: IAVRStatus['smartSelect'][number]) => preset.active,
        )?.number;

        if (optimisticPreset !== undefined && optimisticPreset === activePreset) {
          keysToClear.push('smartSelect');
        }
      }

      if (
        currentOptimisticStatus.speakerPreset !== undefined &&
        nextStatus.speakerPreset === currentOptimisticStatus.speakerPreset &&
        nextStatus.speakerLayout.trim() !== ''
      ) {
        keysToClear.push('speakerPreset', 'speakers', 'speakerLayout');
      }

      clearOptimisticKeys(keysToClear);
    },
    [clearOptimisticKeys],
  );

  const getRenderedStatus = useCallback(
    (): IAVRStatus => ({
      ...baseStatusRef.current,
      ...optimisticStatusRef.current,
    }),
    [],
  );

  const runOptimisticRequest = useCallback(
    async (patch: OptimisticStatus, request: () => Promise<unknown>) => {
      const keys = Object.keys(patch) as OptimisticKey[];
      queueOptimisticUpdate(patch);

      try {
        await request();
      } catch (error) {
        clearOptimisticKeys(keys);
        throw error;
      }
    },
    [clearOptimisticKeys, queueOptimisticUpdate],
  );

  const status = {
    ...baseStatus,
    ...optimisticStatus,
  };

  const selectedSpeakerPresetLayout = (() => {
    if (status.speakerPreset === null) {
      return '';
    }

    const cachedLayout = speakerPresetLayoutsRef.current[status.speakerPreset];
    if (cachedLayout) {
      return cachedLayout;
    }

    const isOptimisticPresetChange =
      optimisticStatus.speakerPreset !== undefined
      && baseStatus.speakerPreset !== status.speakerPreset;

    if (isOptimisticPresetChange) {
      return '';
    }

    return status.speakerLayout.trim();
  })();

  const speakerPresetLayoutPending =
    status.speakerPreset !== null
    && optimisticStatus.speakerPreset !== undefined
    && selectedSpeakerPresetLayout === '';

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
        const msg: IWSMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'status':
            cacheSpeakerPresetLayout(msg.data as IAVRStatus);
            syncBaseStatus(msg.data as IAVRStatus);
            reconcileOptimisticStatus(msg.data as IAVRStatus);
            break;
          case 'connected':
            syncBaseStatus((prev) => ({ ...prev, connected: true }));
            break;
          case 'disconnected':
            syncBaseStatus((prev) => ({ ...prev, connected: false }));
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
  }, [cacheSpeakerPresetLayout, reconcileOptimisticStatus, syncBaseStatus]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      optimisticTimers.current.forEach((timer) => clearTimeout(timer));
      optimisticTimers.current.clear();
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // API helper functions
  const setVolume = useCallback(async (volume: number) => {
    await runOptimisticRequest(
      {
        volume,
        volumeDisplay: Number.isInteger(volume) ? String(volume) : volume.toFixed(1),
      },
      () => setVolumeRequest(volume),
    );
  }, [runOptimisticRequest]);

  const volumeUp = useCallback(async () => {
    const currentStatus = getRenderedStatus();
    const nextVolume = Math.min(currentStatus.volume + 1, currentStatus.maxVolume);

    await runOptimisticRequest(
      {
        volume: nextVolume,
        volumeDisplay: Number.isInteger(nextVolume)
          ? String(nextVolume)
          : nextVolume.toFixed(1),
      },
      volumeUpRequest,
    );
  }, [getRenderedStatus, runOptimisticRequest]);

  const volumeDown = useCallback(async () => {
    const currentStatus = getRenderedStatus();
    const nextVolume = Math.max(currentStatus.volume - 1, 0);

    await runOptimisticRequest(
      {
        volume: nextVolume,
        volumeDisplay: Number.isInteger(nextVolume)
          ? String(nextVolume)
          : nextVolume.toFixed(1),
      },
      volumeDownRequest,
    );
  }, [getRenderedStatus, runOptimisticRequest]);

  const setInput = useCallback(async (inputId: string) => {
    const currentStatus = getRenderedStatus();
    const nextInput = currentStatus.availableInputs.find((input) => input.id === inputId) ?? {
      id: inputId,
      name: inputId,
      selected: true,
    };

    await runOptimisticRequest(
      {
        input: { ...nextInput, selected: true },
        availableInputs: currentStatus.availableInputs.map((input) => ({
          ...input,
          selected: input.id === inputId,
        })),
      },
      () => setInputRequest(inputId),
    );
  }, [getRenderedStatus, runOptimisticRequest]);

  const toggleMute = useCallback(async () => {
    const currentStatus = getRenderedStatus();
    const muted = !currentStatus.muted;

    await runOptimisticRequest(
      { muted },
      () => setMuteRequest(muted),
    );
  }, [getRenderedStatus, runOptimisticRequest]);

  const selectSmartPreset = useCallback(async (preset: number) => {
    const currentStatus = getRenderedStatus();

    await runOptimisticRequest(
      {
        smartSelect: currentStatus.smartSelect.map((option) => ({
          ...option,
          active: option.number === preset,
        })),
      },
      () => selectSmartPresetRequest(preset),
    );
  }, [getRenderedStatus, runOptimisticRequest]);

  const selectSpeakerPreset = useCallback(async (preset: 1 | 2) => {
    await runOptimisticRequest(
      { speakerPreset: preset, speakers: [], speakerLayout: '' },
      () => selectSpeakerPresetRequest(preset),
    );
  }, [runOptimisticRequest]);

  return {
    status,
    selectedSpeakerPresetLayout,
    speakerPresetLayoutPending,
    wsConnected,
    setVolume,
    volumeUp,
    volumeDown,
    setInput,
    toggleMute,
    selectSmartPreset,
    selectSpeakerPreset,
  };
};
