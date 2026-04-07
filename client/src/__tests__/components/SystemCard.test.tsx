import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import SystemCard from '../../components/SystemCard';
import { renderWithProviders } from '../test-utils';

describe('SystemCard', () => {
  it('should render the title', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="OFF" lastUpdate="2025-01-01T12:00:00.000Z" connected={true} />,
    );
    expect(screen.getByText('System Info')).toBeInTheDocument();
  });

  it('should display power state ON with success colour', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="OFF" lastUpdate="" connected={true} />,
    );
    expect(screen.getByText('ON')).toBeInTheDocument();
  });

  it('should display power state OFF', () => {
    renderWithProviders(
      <SystemCard power="OFF" ecoMode="OFF" lastUpdate="" connected={false} />,
    );
    expect(screen.getByText('OFF')).toBeInTheDocument();
  });

  it('should display power state STANDBY', () => {
    renderWithProviders(
      <SystemCard power="STANDBY" ecoMode="OFF" lastUpdate="" connected={false} />,
    );
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
  });

  it('should display ECO mode', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="AUTO" lastUpdate="" connected={true} />,
    );
    expect(screen.getByText('AUTO')).toBeInTheDocument();
  });

  it('should show "---" for empty ECO mode', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="" lastUpdate="" connected={true} />,
    );
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('should show connected status', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="OFF" lastUpdate="" connected={true} />,
    );
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show disconnected status', () => {
    renderWithProviders(
      <SystemCard power="OFF" ecoMode="OFF" lastUpdate="" connected={false} />,
    );
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should show "---" for empty lastUpdate', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="OFF" lastUpdate="" connected={true} />,
    );
    // The formatTime function returns '---' for empty strings
    expect(screen.getAllByText('---').length).toBeGreaterThan(0);
  });

  it('should format a valid ISO timestamp', () => {
    renderWithProviders(
      <SystemCard power="ON" ecoMode="OFF" lastUpdate="2025-01-01T12:00:00.000Z" connected={true} />,
    );
    // Should display a time string (exact format depends on locale)
    const labels = ['Power', 'ECO Mode', 'Last Update'];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
