import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import SubwooferCard from "../../components/SubwooferCard";
import { renderWithProviders } from "../test-utils";

describe("SubwooferCard", () => {
  it("should render the title", () => {
    renderWithProviders(<SubwooferCard subwoofers={[]} />);
    expect(screen.getByText("Subwoofer Settings")).toBeInTheDocument();
  });

  it("should not display the LFE level badge", () => {
    renderWithProviders(<SubwooferCard subwoofers={[]} />);
    expect(screen.queryByText(/LFE:/)).not.toBeInTheDocument();
  });

  it('should show "no data" when subwoofers array is empty', () => {
    renderWithProviders(<SubwooferCard subwoofers={[]} />);
    expect(screen.getByText("No subwoofer data available")).toBeInTheDocument();
  });

  it("should render subwoofer entries", () => {
    renderWithProviders(
      <SubwooferCard
        subwoofers={[
          { number: 1, level: "0.0 dB", active: true },
          { number: 2, level: "-3.0 dB", active: true },
        ]}
      />,
    );
    expect(screen.getByText("Sub 1")).toBeInTheDocument();
    expect(screen.getByText("Sub 2")).toBeInTheDocument();
    expect(screen.getByText("0.0 dB")).toBeInTheDocument();
    expect(screen.getByText("-3.0 dB")).toBeInTheDocument();
  });

  it("should render up to 4 subwoofers", () => {
    renderWithProviders(
      <SubwooferCard
        subwoofers={[
          { number: 1, level: "0.0 dB", active: true },
          { number: 2, level: "-1.0 dB", active: true },
          { number: 3, level: "+2.0 dB", active: true },
          { number: 4, level: "-4.0 dB", active: true },
        ]}
      />,
    );
    expect(screen.getByText("Sub 1")).toBeInTheDocument();
    expect(screen.getByText("Sub 2")).toBeInTheDocument();
    expect(screen.getByText("Sub 3")).toBeInTheDocument();
    expect(screen.getByText("Sub 4")).toBeInTheDocument();
  });

  it("should show progress bars for each subwoofer", () => {
    renderWithProviders(
      <SubwooferCard
        subwoofers={[{ number: 1, level: "0.0 dB", active: true }]}
      />,
    );
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(1);
  });
});
