import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import App from "../App";
import { createMockStatus, renderWithProviders } from "./test-utils";

vi.mock("../hooks/useAVRStatus", () => ({
  useAVRStatus: () => ({
    status: createMockStatus(),
    wsConnected: true,
    setVolume: vi.fn(),
    volumeUp: vi.fn(),
    volumeDown: vi.fn(),
    setInput: vi.fn(),
    toggleMute: vi.fn(),
    selectSmartPreset: vi.fn(),
  }),
}));

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("App", () => {
  it("renders dashboard cards in the requested order", () => {
    renderWithProviders(<App />);

    const volume = screen.getByText("Volume");
    const subwoofer = screen.getByText("Subwoofer Settings");
    const input = screen.getByText("Smart Select");
    const audio = screen.getByText("Audio Signal");
    const video = screen.getByText("Video Signal");
    const speaker = screen.getByText("Speaker Configuration");
    const system = screen.getByText("System Info");

    expectBefore(volume, subwoofer);
    expectBefore(subwoofer, input);
    expectBefore(input, audio);
    expectBefore(audio, video);
    expectBefore(video, speaker);
    expectBefore(speaker, system);
  });
});
