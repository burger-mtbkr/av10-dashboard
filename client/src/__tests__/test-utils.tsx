import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import theme from "../theme";
import type { IAVRStatus, ISpeakerStatus } from "../types";

/** Render with all providers (Theme, i18n) */
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </I18nextProvider>
    );
  };
  return render(ui, { wrapper: Wrapper, ...options });
};

/** Factory for mock AVR status */
export const createMockStatus = (
  overrides: Partial<IAVRStatus> = {},
): IAVRStatus => {
  return {
    power: "ON",
    softwareVersion: "8000-2122-F016-8380",
    volume: 45,
    volumeDisplay: "45",
    maxVolume: 75,
    muted: false,
    input: { id: "SAT/CBL", name: "CBL/SAT", selected: true },
    availableInputs: [
      { id: "SAT/CBL", name: "CBL/SAT", selected: true },
      { id: "BD", name: "Blu-ray", selected: false },
      { id: "GAME", name: "Game", selected: false },
      { id: "TV", name: "TV Audio", selected: false },
    ],
    smartSelect: [
      { number: 1, name: "Apple TV", active: true },
      { number: 2, name: "Music", active: false },
      { number: 3, name: "PS3", active: false },
      { number: 4, name: "Xbox", active: false },
    ],
    speakers: createMockSpeakers(),
    video: {
      inputResolution: "3840x2160p",
      outputResolution: "3840x2160p",
      hdrFormat: "HDR10",
      inputSignal: "HDMI",
      hdmiOutput: "Auto",
    },
    audio: {
      inputFormat: "Dolby TrueHD",
      soundMode: "Dolby Atmos",
      samplingRate: "48kHz",
      dialogEnhancer: "Off",
      dynamicEq: "ON",
      dynamicVolume: "OFF",
      multEq: "AUDYSSEY",
    },
    subwoofers: [
      { number: 1, level: "0.0 dB", active: true },
      { number: 2, level: "-3.0 dB", active: true },
    ],
    lfeLevel: "0 dB",
    ecoMode: "OFF",
    networkConnection: "Ethernet",
    ipAddress: "192.168.1.170",
    surroundMode: "Dolby Atmos",
    connected: true,
    lastUpdate: "2025-01-01T12:00:00.000Z",
    ...overrides,
  };
};

/** Create mock speakers for a 7.2.4 setup */
export const createMockSpeakers = (): ISpeakerStatus[] => {
  return [
    // Ear level (7)
    { code: "FL", name: "Front Left", active: true, group: "ear" },
    { code: "FR", name: "Front Right", active: true, group: "ear" },
    { code: "C", name: "Center", active: true, group: "ear" },
    { code: "SL", name: "Surround Left", active: true, group: "ear" },
    { code: "SR", name: "Surround Right", active: true, group: "ear" },
    { code: "SBL", name: "Surround Back Left", active: true, group: "back" },
    { code: "SBR", name: "Surround Back Right", active: true, group: "back" },
    // Subs (2)
    { code: "SW", name: "Subwoofer", active: true, group: "sub" },
    { code: "SW2", name: "Subwoofer 2", active: true, group: "sub" },
    // Height (4)
    { code: "TFL", name: "Top Front Left", active: true, group: "height" },
    { code: "TFR", name: "Top Front Right", active: true, group: "height" },
    { code: "TRL", name: "Top Rear Left", active: true, group: "height" },
    { code: "TRR", name: "Top Rear Right", active: true, group: "height" },
  ];
};
