import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { SystemCard } from "./SystemCard";
import { renderWithProviders } from "../test/test-utils";

describe("SystemCard", () => {
  it("should render the title", () => {
    renderWithProviders(
      <SystemCard
        power="ON"
        processorModel="Marantz AV10"
        softwareVersion="8000-2122-F016-8380"
        networkConnection="Ethernet"
        ipAddress="192.168.1.170"
        lastUpdate="2025-01-01T12:00:00.000Z"
        connected={true}
      />,
    );
    expect(screen.getByText("System Info")).toBeInTheDocument();
  });

  it("should display power state ON with success colour", () => {
    renderWithProviders(
      <SystemCard power="ON" lastUpdate="" connected={true} />,
    );
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  it("should display power state OFF", () => {
    renderWithProviders(
      <SystemCard power="OFF" lastUpdate="" connected={false} />,
    );
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("should display power state STANDBY", () => {
    renderWithProviders(
      <SystemCard power="STANDBY" lastUpdate="" connected={false} />,
    );
    expect(screen.getByText("STANDBY")).toBeInTheDocument();
  });

  it("should display software version, network, and IP address", () => {
    renderWithProviders(
      <SystemCard
        power="ON"
        processorModel="Marantz AV10"
        softwareVersion="8000-2122-F016-8380"
        networkConnection="Wi-Fi"
        ipAddress="192.168.1.170"
        lastUpdate="2025-01-01T12:00:00.000Z"
        connected={true}
      />,
    );

    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Marantz AV10")).toBeInTheDocument();
    expect(screen.getByText("Software Version")).toBeInTheDocument();
    expect(screen.getByText("8000-2122-F016-8380")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("IP Address")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.170")).toBeInTheDocument();
  });

  it('should show "---" for missing software and network info', () => {
    renderWithProviders(
      <SystemCard
        power="ON"
        processorModel=""
        softwareVersion=""
        networkConnection=""
        ipAddress=""
        lastUpdate=""
        connected={true}
      />,
    );

    expect(screen.getAllByText("---").length).toBeGreaterThan(0);
  });

  it("should show connected status", () => {
    renderWithProviders(
      <SystemCard power="ON" lastUpdate="" connected={true} />,
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("should show disconnected status", () => {
    renderWithProviders(
      <SystemCard power="OFF" lastUpdate="" connected={false} />,
    );
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it('should show "---" for empty lastUpdate', () => {
    renderWithProviders(
      <SystemCard power="ON" lastUpdate="" connected={true} />,
    );
    expect(screen.getAllByText("---").length).toBeGreaterThan(0);
  });

  it("should format a valid ISO timestamp", () => {
    renderWithProviders(
      <SystemCard
        power="ON"
        processorModel="Marantz AV10"
        softwareVersion="8000-2122-F016-8380"
        networkConnection="Ethernet"
        ipAddress="192.168.1.170"
        lastUpdate="2025-01-01T12:00:00.000Z"
        connected={true}
      />,
    );
    const labels = [
      "Power",
      "Model",
      "Software Version",
      "Network",
      "IP Address",
      "Last Update",
    ];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
