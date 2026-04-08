import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import VolumeCard from "../../components/VolumeCard";
import { renderWithProviders } from "../test-utils";

const defaultProps = {
  volume: 45,
  volumeDisplay: "45",
  maxVolume: 75,
  muted: false,
  onVolumeChange: vi.fn(),
  onVolumeUp: vi.fn(),
  onVolumeDown: vi.fn(),
  onToggleMute: vi.fn(),
};

describe("VolumeCard", () => {
  it("should render the title", () => {
    renderWithProviders(<VolumeCard {...defaultProps} />);
    expect(screen.getByText("Volume")).toBeInTheDocument();
  });

  it("should display the current volume", () => {
    renderWithProviders(<VolumeCard {...defaultProps} />);
    expect(screen.getAllByText("45").length).toBeGreaterThanOrEqual(1);
  });

  it("should display percentage label", () => {
    renderWithProviders(<VolumeCard {...defaultProps} />);
    // Percentage based on 45/75 = 60%
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  it("should show muted chip when muted", () => {
    renderWithProviders(<VolumeCard {...defaultProps} muted={true} />);
    expect(screen.getByText("Muted")).toBeInTheDocument();
  });

  it("should not show muted chip when not muted", () => {
    renderWithProviders(<VolumeCard {...defaultProps} muted={false} />);
    expect(screen.queryByText("Muted")).not.toBeInTheDocument();
  });

  it("should call onVolumeUp when up button clicked", () => {
    const onVolumeUp = vi.fn();
    renderWithProviders(
      <VolumeCard {...defaultProps} onVolumeUp={onVolumeUp} />,
    );
    // Find the volume up button (there are multiple, pick the icon button group)
    const buttons = screen.getAllByRole("button");
    // The volume down is first, volume up second, mute third
    fireEvent.click(buttons[1]); // Volume up
    expect(onVolumeUp).toHaveBeenCalledTimes(1);
  });

  it("should call onVolumeDown when down button clicked", () => {
    const onVolumeDown = vi.fn();
    renderWithProviders(
      <VolumeCard {...defaultProps} onVolumeDown={onVolumeDown} />,
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Volume down
    expect(onVolumeDown).toHaveBeenCalledTimes(1);
  });

  it("should call onToggleMute when mute button clicked", () => {
    const onToggleMute = vi.fn();
    renderWithProviders(
      <VolumeCard {...defaultProps} onToggleMute={onToggleMute} />,
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // Mute toggle
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("should render the slider", () => {
    renderWithProviders(<VolumeCard {...defaultProps} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("should show min and max labels for the slider", () => {
    renderWithProviders(<VolumeCard {...defaultProps} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("should expose the current value through the slider tooltip label", () => {
    renderWithProviders(<VolumeCard {...defaultProps} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "45");
  });

  it("should display different volumes correctly", () => {
    const { rerender } = renderWithProviders(
      <VolumeCard {...defaultProps} volume={0} />,
    );
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
  });
});
