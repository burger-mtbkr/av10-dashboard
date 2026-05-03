import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { SpeakerPresetCard } from "./SpeakerPresetCard";
import { renderWithProviders, createMockSpeakers } from "../test/test-utils";

describe("SpeakerPresetCard", () => {
  it("should render the title and both preset buttons", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        speakers={createMockSpeakers()}
        speakerLayout="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Speaker Configuration")).toBeInTheDocument();
    expect(screen.getByText("Preset 1")).toBeInTheDocument();
    expect(screen.getByText("Preset 2")).toBeInTheDocument();
  });

  it("should call onSelectPreset when a preset is clicked", () => {
    const onSelectPreset = vi.fn();

    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        speakers={createMockSpeakers()}
        speakerLayout="7.2.4"
        onSelectPreset={onSelectPreset}
      />,
    );

    fireEvent.click(screen.getByText("Preset 2"));
    expect(onSelectPreset).toHaveBeenCalledWith(2);
  });

  it("should show layout chip and active/total count", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        speakers={createMockSpeakers()}
        speakerLayout="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("7.2.4")).toBeInTheDocument();
    expect(screen.getByText("13/13")).toBeInTheDocument();
  });

  it("should display speaker codes in the grid", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        speakers={createMockSpeakers()}
        speakerLayout="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("FL")).toBeInTheDocument();
    expect(screen.getByText("FR")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("SW")).toBeInTheDocument();
  });

  it("should show room layout labels and group legend", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        speakers={createMockSpeakers()}
        speakerLayout="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Listening Position")).toBeInTheDocument();
    expect(screen.getByText(/Height \/ Atmos/)).toBeInTheDocument();
    expect(screen.getByText(/Ear Level/)).toBeInTheDocument();
    expect(screen.getByText(/Subwoofers/)).toBeInTheDocument();
  });

  it("should show updating state when layoutPending is true", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={2}
        speakers={[]}
        speakerLayout=""
        layoutPending
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Updating...")).toBeInTheDocument();
    expect(screen.queryByText("Listening Position")).not.toBeInTheDocument();
  });

  it("should show updating state when speakers are empty during a preset switch", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={2}
        speakers={[]}
        speakerLayout=""
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });

  it("should hide layout chip and count when no preset is selected", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={null}
        speakers={[]}
        speakerLayout=""
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.queryByText("7.2.4")).not.toBeInTheDocument();
    expect(screen.queryByText("13/13")).not.toBeInTheDocument();
  });

  it("should handle partially active speakers", () => {
    const speakers = createMockSpeakers().map((s, i) => ({
      ...s,
      active: i < 5,
    }));
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        speakers={speakers}
        speakerLayout="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("5/13")).toBeInTheDocument();
    expect(screen.getByText("7.2.4")).toBeInTheDocument();
  });
});
