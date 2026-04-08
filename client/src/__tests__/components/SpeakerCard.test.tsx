import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import SpeakerCard from "../../components/SpeakerCard";
import { renderWithProviders, createMockSpeakers } from "../test-utils";

describe("SpeakerCard", () => {
  it("should render the title", () => {
    renderWithProviders(<SpeakerCard speakers={createMockSpeakers()} />);
    expect(screen.getByText("Speaker Configuration")).toBeInTheDocument();
  });

  it("should show layout label (7.2.4) for a 7.2.4 setup", () => {
    renderWithProviders(<SpeakerCard speakers={createMockSpeakers()} />);
    expect(screen.getByText("7.2.4")).toBeInTheDocument();
  });

  it("should show active/total count", () => {
    const speakers = createMockSpeakers();
    renderWithProviders(<SpeakerCard speakers={speakers} />);
    expect(screen.getByText("13/13")).toBeInTheDocument();
  });

  it("should show room layout labels", () => {
    renderWithProviders(<SpeakerCard speakers={createMockSpeakers()} />);
    expect(screen.getByText("Listening Position")).toBeInTheDocument();
    expect(screen.getByText(/Height \/ Atmos/)).toBeInTheDocument();
    expect(screen.getByText(/Ear Level/)).toBeInTheDocument();
    expect(screen.getByText(/Subwoofers/)).toBeInTheDocument();
  });

  it("should display speaker codes", () => {
    renderWithProviders(<SpeakerCard speakers={createMockSpeakers()} />);
    expect(screen.getByText("FL")).toBeInTheDocument();
    expect(screen.getByText("FR")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("SW")).toBeInTheDocument();
  });

  it("should render fallback when no speakers", () => {
    renderWithProviders(<SpeakerCard speakers={[]} />);
    expect(screen.getByText("No speaker data available")).toBeInTheDocument();
  });

  it("should handle partially active speakers", () => {
    const speakers = createMockSpeakers().map((s, i) => ({
      ...s,
      active: i < 5, // Only first 5 active
    }));
    renderWithProviders(<SpeakerCard speakers={speakers} />);
    expect(screen.getByText("5/13")).toBeInTheDocument();
    // Layout label is derived from all configured speakers (not just active ones)
    expect(screen.getByText("7.2.4")).toBeInTheDocument();
  });

  it("should compute correct layout for 5.1.2", () => {
    const speakers = [
      { code: "FL", name: "Front Left", active: true, group: "ear" as const },
      { code: "FR", name: "Front Right", active: true, group: "ear" as const },
      { code: "C", name: "Center", active: true, group: "ear" as const },
      {
        code: "SL",
        name: "Surround Left",
        active: true,
        group: "ear" as const,
      },
      {
        code: "SR",
        name: "Surround Right",
        active: true,
        group: "ear" as const,
      },
      { code: "SW", name: "Subwoofer", active: true, group: "sub" as const },
      {
        code: "TFL",
        name: "Top Front Left",
        active: true,
        group: "height" as const,
      },
      {
        code: "TFR",
        name: "Top Front Right",
        active: true,
        group: "height" as const,
      },
    ];
    renderWithProviders(<SpeakerCard speakers={speakers} />);
    expect(screen.getByText("5.1.2")).toBeInTheDocument();
  });
});
