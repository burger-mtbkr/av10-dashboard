import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import AudioCard from '../../components/AudioCard';
import { renderWithProviders } from '../test-utils';

describe('AudioCard', () => {
  const defaultAudio = {
    inputFormat: 'Dolby TrueHD',
    soundMode: 'Dolby Atmos',
    samplingRate: '48kHz',
    dialogEnhancer: 'Off',
    dynamicEq: 'ON',
    dynamicVolume: 'OFF',
    multEq: 'AUDYSSEY',
  };

  it('should render the title', () => {
    renderWithProviders(<AudioCard audio={defaultAudio} surroundMode="Dolby Atmos" />);
    expect(screen.getByText('Audio Signal')).toBeInTheDocument();
  });

  it('should display surround mode as prominent chip', () => {
    renderWithProviders(<AudioCard audio={defaultAudio} surroundMode="Dolby Atmos" />);
    expect(screen.getByText('Dolby Atmos')).toBeInTheDocument();
  });

  it('should display all audio info rows', () => {
    renderWithProviders(<AudioCard audio={defaultAudio} surroundMode="Dolby Atmos" />);
    expect(screen.getByText('Dolby TrueHD')).toBeInTheDocument();
    expect(screen.getByText('48kHz')).toBeInTheDocument();
    expect(screen.getByText('ON')).toBeInTheDocument();  // Dynamic EQ
    expect(screen.getByText('OFF')).toBeInTheDocument(); // Dynamic Volume
    expect(screen.getByText('AUDYSSEY')).toBeInTheDocument();
  });

  it('should show row labels from i18n', () => {
    renderWithProviders(<AudioCard audio={defaultAudio} surroundMode="DTS:X" />);
    expect(screen.getByText('Input Format')).toBeInTheDocument();
    expect(screen.getByText('Sampling Rate')).toBeInTheDocument();
    expect(screen.getByText('Dynamic EQ')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Volume')).toBeInTheDocument();
    expect(screen.getByText('MultEQ')).toBeInTheDocument();
    expect(screen.getByText('Dialog Enhancer')).toBeInTheDocument();
  });

  it('should show "---" for empty surround mode', () => {
    renderWithProviders(<AudioCard audio={defaultAudio} surroundMode="" />);
    expect(screen.getByText('---')).toBeInTheDocument();
  });
});
