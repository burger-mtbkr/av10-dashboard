import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import InputCard from "../../components/InputCard";
import { renderWithProviders } from "../test-utils";

const defaultPresets = [
  { number: 1, name: "Apple TV", active: true },
  { number: 2, name: "Music", active: false },
  { number: 3, name: "PS3", active: false },
  { number: 4, name: "Xbox", active: false },
];

const defaultAudio = {
  inputFormat: "Dolby TrueHD",
  soundMode: "Dolby Atmos",
  samplingRate: "48kHz",
  dialogEnhancer: "Off",
  dynamicEq: "ON",
  dynamicVolume: "OFF",
  multEq: "Reference",
};

const defaultVideo = {
  inputResolution: "2160p60",
  outputResolution: "2160p60",
  hdrFormat: "HDR10",
  inputSignal: "HDMI",
  hdmiOutput: "Auto",
};

const defaultProps = {
  smartSelect: defaultPresets,
  currentInput: { id: "SAT/CBL", name: "CBL/SAT", selected: true },
  audio: defaultAudio,
  surroundMode: "Dolby Atmos",
  video: defaultVideo,
  onSelectPreset: vi.fn(),
};

describe("InputCard", () => {
  it("should render the title", () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getByText("Smart Select")).toBeInTheDocument();
  });

  it("should render all 4 preset buttons", () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getAllByText("Apple TV").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Music")).toBeInTheDocument();
    expect(screen.getByText("PS3")).toBeInTheDocument();
    expect(screen.getByText("Xbox")).toBeInTheDocument();
  });

  it("should show preset numbers", () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should call onSelectPreset when a button is clicked", () => {
    const onSelectPreset = vi.fn();
    renderWithProviders(
      <InputCard {...defaultProps} onSelectPreset={onSelectPreset} />,
    );
    fireEvent.click(screen.getByText("Music"));
    expect(onSelectPreset).toHaveBeenCalledWith(2);
  });

  it("should show metadata panel when a preset is active", () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getByText("Active Preset")).toBeInTheDocument();
    // Active preset name appears in both the button and the metadata panel
    expect(screen.getAllByText("Apple TV").length).toBeGreaterThanOrEqual(2);
  });

  it("should not show metadata panel when no preset is active", () => {
    const noActive = defaultPresets.map((p) => ({ ...p, active: false }));
    renderWithProviders(
      <InputCard
        smartSelect={noActive}
        currentInput={defaultProps.currentInput}
        audio={defaultAudio}
        surroundMode="Dolby Atmos"
        video={defaultVideo}
        onSelectPreset={vi.fn()}
      />,
    );
    expect(screen.queryByText("Active Preset")).not.toBeInTheDocument();
  });

  it("should show current source in metadata panel", () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getByText(/CBL\/SAT/)).toBeInTheDocument();
  });

  it("should render with default Smart Select names when no custom names", () => {
    const defaults = [
      { number: 1, name: "Smart Select 1", active: false },
      { number: 2, name: "Smart Select 2", active: false },
      { number: 3, name: "Smart Select 3", active: false },
      { number: 4, name: "Smart Select 4", active: false },
    ];
    renderWithProviders(
      <InputCard
        smartSelect={defaults}
        currentInput={{ id: "", name: "", selected: true }}
        audio={defaultAudio}
        surroundMode=""
        video={defaultVideo}
        onSelectPreset={vi.fn()}
      />,
    );
    expect(screen.getByText("Smart Select 1")).toBeInTheDocument();
    expect(screen.getByText("Smart Select 4")).toBeInTheDocument();
  });
});
