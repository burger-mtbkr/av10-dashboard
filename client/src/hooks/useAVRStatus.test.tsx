import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/http/client";
import { useAVRStatus } from "./useAVRStatus";
import { createMockStatus } from "../test/test-utils";

vi.mock("../api/http/client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

class TestWebSocket {
  static instances: TestWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = TestWebSocket.OPEN;
  url: string;
  closeCalled = false;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    TestWebSocket.instances.push(this);
  }

  send(_data: string) {}

  close() {
    this.closeCalled = true;
    this.readyState = TestWebSocket.CLOSED;
  }

  emitOpen() {
    this.onopen?.(new Event("open"));
  }

  emitClose() {
    this.readyState = TestWebSocket.CLOSED;
    this.onclose?.({} as CloseEvent);
  }

  emitMessage(payload: unknown) {
    const data =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }
}

describe("useAVRStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestWebSocket.instances = [];
    Object.defineProperty(globalThis, "WebSocket", {
      value: TestWebSocket,
      writable: true,
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 200,
      data: { success: true },
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("connects and updates status from websocket messages", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    expect(socket.url).toMatch(/\/ws$/);

    act(() => {
      socket.emitOpen();
    });

    expect(result.current.wsConnected).toBe(true);

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ volume: 61, connected: false }),
      });
    });
    expect(result.current.status.volume).toBe(61);
    expect(result.current.status.connected).toBe(false);

    act(() => {
      socket.emitMessage({
        type: "connected",
        data: "Connected to Marantz AV10",
      });
    });
    expect(result.current.status.connected).toBe(true);

    act(() => {
      socket.emitMessage({
        type: "disconnected",
        data: "Disconnected from Marantz AV10",
      });
    });
    expect(result.current.status.connected).toBe(false);
  });

  it("logs parse and server errors without throwing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitMessage("not-json");
    });

    act(() => {
      socket.emitMessage({ type: "error", data: "server-side failure" });
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[WS] Parse error:",
      expect.any(SyntaxError),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[WS] Server error:",
      "server-side failure",
    );
  });

  it("calls the expected REST endpoints for control helpers", async () => {
    const { result } = renderHook(() => useAVRStatus());

    await act(async () => {
      await result.current.setVolume(62);
      await result.current.volumeUp();
      await result.current.volumeDown();
      await result.current.setInput("GAME");
      await result.current.toggleMute();
      await result.current.selectSmartPreset(3);
      await result.current.selectSpeakerPreset(2);
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/api/volume", {
      volume: 62,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/api/volume/up");
    expect(apiClient.post).toHaveBeenNthCalledWith(3, "/api/volume/down");
    expect(apiClient.post).toHaveBeenNthCalledWith(4, "/api/input", {
      input: "GAME",
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(5, "/api/mute", {
      muted: true,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(6, "/api/smartselect/3");
    expect(apiClient.post).toHaveBeenNthCalledWith(7, "/api/speakerpreset/2");
  });

  it("keeps the optimistic volume until websocket status catches up", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ volume: 50, volumeDisplay: "50" }),
      });
    });

    await act(async () => {
      await result.current.setVolume(30);
    });

    expect(result.current.status.volume).toBe(30);
    expect(result.current.status.volumeDisplay).toBe("30");

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ volume: 50, volumeDisplay: "50" }),
      });
    });

    expect(result.current.status.volume).toBe(30);
    expect(result.current.status.volumeDisplay).toBe("30");

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ volume: 30, volumeDisplay: "30" }),
      });
    });

    expect(result.current.status.volume).toBe(30);
    expect(result.current.status.volumeDisplay).toBe("30");
  });

  it("expires optimistic state if the backend never confirms it", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ volume: 50, volumeDisplay: "50" }),
      });
    });

    await act(async () => {
      await result.current.setVolume(30);
    });

    expect(result.current.status.volume).toBe(30);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.status.volume).toBe(50);
    expect(result.current.status.volumeDisplay).toBe("50");
  });

  it("keeps the optimistic smart select state until websocket status catches up", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    const smartSelectOne = [
      { number: 1, name: "Apple TV", active: true },
      { number: 2, name: "Music", active: false },
      { number: 3, name: "PS3", active: false },
      { number: 4, name: "Xbox", active: false },
    ];
    const smartSelectThree = smartSelectOne.map((preset) => ({
      ...preset,
      active: preset.number === 3,
    }));

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ smartSelect: smartSelectOne }),
      });
    });

    await act(async () => {
      await result.current.selectSmartPreset(3);
    });

    expect(
      result.current.status.smartSelect.find((preset) => preset.active)?.number,
    ).toBe(3);

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ smartSelect: smartSelectOne }),
      });
    });

    expect(
      result.current.status.smartSelect.find((preset) => preset.active)?.number,
    ).toBe(3);

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ smartSelect: smartSelectThree }),
      });
    });

    expect(
      result.current.status.smartSelect.find((preset) => preset.active)?.number,
    ).toBe(3);
  });

  it("keeps the optimistic speaker preset until websocket status catches up", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1 }),
      });
    });

    await act(async () => {
      await result.current.selectSpeakerPreset(2);
    });

    expect(result.current.status.speakerPreset).toBe(2);

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1 }),
      });
    });

    expect(result.current.status.speakerPreset).toBe(2);

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 2 }),
      });
    });

    expect(result.current.status.speakerPreset).toBe(2);
  });

  it("uses cached layouts so selected configuration stays aligned with the chosen preset", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    const presetOneSpeakers = createMockStatus().speakers;
    const presetTwoSpeakers = [
      { code: "FL", name: "Front Left", active: true, group: "ear" as const },
      { code: "FR", name: "Front Right", active: true, group: "ear" as const },
      { code: "C", name: "Center", active: true, group: "ear" as const },
      { code: "SL", name: "Surround Left", active: true, group: "ear" as const },
      { code: "SR", name: "Surround Right", active: true, group: "ear" as const },
      { code: "SW", name: "Subwoofer", active: true, group: "sub" as const },
      { code: "TFL", name: "Top Front Left", active: true, group: "height" as const },
      { code: "TFR", name: "Top Front Right", active: true, group: "height" as const },
    ];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1, speakerLayout: "7.2.4", speakers: presetOneSpeakers }),
      });
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 2, speakerLayout: "5.1.2", speakers: presetTwoSpeakers }),
      });
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1, speakerLayout: "7.2.4", speakers: presetOneSpeakers }),
      });
    });

    expect(result.current.selectedSpeakerPresetLayout).toBe("7.2.4");

    await act(async () => {
      await result.current.selectSpeakerPreset(2);
    });

    expect(result.current.status.speakerPreset).toBe(2);
    expect(result.current.selectedSpeakerPresetLayout).toBe("5.1.2");
    expect(result.current.speakerPresetLayoutPending).toBe(false);
  });

  it("marks selected configuration as updating when switching to an uncached preset", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1, speakerLayout: "7.2.4" }),
      });
    });

    await act(async () => {
      await result.current.selectSpeakerPreset(2);
    });

    expect(result.current.status.speakerPreset).toBe(2);
    expect(result.current.selectedSpeakerPresetLayout).toBe("");
    expect(result.current.speakerPresetLayoutPending).toBe(true);
  });

  it("clears speakers and speakerLayout optimistically when switching speaker presets", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1, speakerLayout: "7.2.4" }),
      });
    });

    expect(result.current.status.speakers.length).toBeGreaterThan(0);
    expect(result.current.status.speakerLayout).toBe("7.2.4");

    await act(async () => {
      await result.current.selectSpeakerPreset(2);
    });

    expect(result.current.status.speakerPreset).toBe(2);
    expect(result.current.status.speakers).toEqual([]);
    expect(result.current.status.speakerLayout).toBe("");
  });

  it("restores speakers and speakerLayout once the server confirms the new preset with layout data", async () => {
    const { result } = renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    const presetTwoSpeakers = [
      { code: "FL", name: "Front Left", active: true, group: "ear" as const },
      { code: "FR", name: "Front Right", active: true, group: "ear" as const },
    ];

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 1, speakerLayout: "7.2.4" }),
      });
    });

    await act(async () => {
      await result.current.selectSpeakerPreset(2);
    });

    expect(result.current.status.speakers).toEqual([]);
    expect(result.current.status.speakerLayout).toBe("");

    act(() => {
      socket.emitMessage({
        type: "status",
        data: createMockStatus({ speakerPreset: 2, speakerLayout: "5.1.2", speakers: presetTwoSpeakers }),
      });
    });

    expect(result.current.status.speakerPreset).toBe(2);
    expect(result.current.status.speakerLayout).toBe("5.1.2");
    expect(result.current.status.speakers).toEqual(presetTwoSpeakers);
    expect(result.current.speakerPresetLayoutPending).toBe(false);
  });

  it("reconnects after close and closes the active socket on cleanup", () => {
    const { result, unmount } = renderHook(() => useAVRStatus());
    const firstSocket = TestWebSocket.instances[0];

    act(() => {
      firstSocket.emitClose();
    });

    expect(result.current.wsConnected).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(TestWebSocket.instances).toHaveLength(2);
    const secondSocket = TestWebSocket.instances[1];

    unmount();

    expect(secondSocket.closeCalled).toBe(true);
  });

  it("closes the socket when the websocket errors", () => {
    renderHook(() => useAVRStatus());
    const socket = TestWebSocket.instances[0];

    act(() => {
      socket.emitError();
    });

    expect(socket.closeCalled).toBe(true);
  });
});
