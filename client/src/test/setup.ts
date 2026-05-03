import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { apiClient } from "../api/http/client";

vi.mock("../api/http/client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(_data: string) {}
  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
}

Object.defineProperty(globalThis, "WebSocket", {
  value: MockWebSocket,
  writable: true,
});

vi.mocked(apiClient.post).mockResolvedValue({
  status: 200,
  data: { success: true },
  statusText: "OK",
  headers: {},
  config: {} as any,
} as any);
