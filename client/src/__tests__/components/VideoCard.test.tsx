import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import VideoCard from '../../components/VideoCard';
import { renderWithProviders } from '../test-utils';

describe('VideoCard', () => {
  it('should render the title', () => {
    renderWithProviders(
      <VideoCard
        video={{
          inputResolution: '3840x2160p',
          outputResolution: '3840x2160p',
          hdrFormat: 'HDR10',
          inputSignal: 'HDMI',
          hdmiOutput: 'Auto',
        }}
      />,
    );
    expect(screen.getByText('Video Signal')).toBeInTheDocument();
  });

  it('should show input and output resolution', () => {
    renderWithProviders(
      <VideoCard
        video={{
          inputResolution: '1080p',
          outputResolution: '4K',
          hdrFormat: 'None',
          inputSignal: 'HDMI',
          hdmiOutput: 'Auto',
        }}
      />,
    );
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('4K')).toBeInTheDocument();
  });

  it('should display HDR badge when HDR is active', () => {
    renderWithProviders(
      <VideoCard
        video={{
          inputResolution: '4K',
          outputResolution: '4K',
          hdrFormat: 'Dolby Vision',
          inputSignal: 'HDMI',
          hdmiOutput: 'Auto',
        }}
      />,
    );
    expect(screen.getByText('Dolby Vision')).toBeInTheDocument();
  });

  it('should NOT display HDR badge when hdrFormat is "---"', () => {
    renderWithProviders(
      <VideoCard
        video={{
          inputResolution: '4K',
          outputResolution: '4K',
          hdrFormat: '---',
          inputSignal: 'HDMI',
          hdmiOutput: 'Auto',
        }}
      />,
    );
    // HDR badge should not be present (only the resolution chips and HDMI)
    expect(screen.queryByText('---')).not.toBeInTheDocument();
  });

  it('should show HDMI output label', () => {
    renderWithProviders(
      <VideoCard
        video={{
          inputResolution: '4K',
          outputResolution: '4K',
          hdrFormat: '---',
          inputSignal: 'HDMI',
          hdmiOutput: 'HDMI 1',
        }}
      />,
    );
    expect(screen.getByText('HDMI: HDMI 1')).toBeInTheDocument();
  });

  it('should show input signal when not "---"', () => {
    renderWithProviders(
      <VideoCard
        video={{
          inputResolution: '4K',
          outputResolution: '4K',
          hdrFormat: '---',
          inputSignal: 'HDMI 5',
          hdmiOutput: 'Auto',
        }}
      />,
    );
    expect(screen.getByText('HDMI 5')).toBeInTheDocument();
  });
});
