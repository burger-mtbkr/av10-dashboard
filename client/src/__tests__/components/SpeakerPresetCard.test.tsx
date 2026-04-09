import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { SpeakerPresetCard } from "../../components";
import { renderWithProviders } from "../test-utils";

describe("SpeakerPresetCard", () => {
  it("should render the title and both preset buttons", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        layoutLabel="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Speaker Preset")).toBeInTheDocument();
    expect(screen.getByText("Preset 1")).toBeInTheDocument();
    expect(screen.getByText("Preset 2")).toBeInTheDocument();
  });

  it("should call onSelectPreset when a preset is clicked", () => {
    const onSelectPreset = vi.fn();

    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={1}
        layoutLabel="7.2.4"
        onSelectPreset={onSelectPreset}
      />,
    );

    fireEvent.click(screen.getByText("Preset 2"));
    expect(onSelectPreset).toHaveBeenCalledWith(2);
  });

  it("should show the selected speaker layout for the active preset", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={2}
        layoutLabel="7.2.4"
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Selected Configuration")).toBeInTheDocument();
    expect(screen.getByText("7.2.4")).toBeInTheDocument();
  });

  it("should hide the selected layout when no preset is active", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={null}
        layoutLabel=""
        onSelectPreset={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Selected Configuration"),
    ).not.toBeInTheDocument();
  });

  it("should show updating state when layout is still syncing", () => {
    renderWithProviders(
      <SpeakerPresetCard
        speakerPreset={2}
        layoutLabel=""
        layoutPending
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText("Selected Configuration")).toBeInTheDocument();
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });
});
