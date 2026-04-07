import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import InputCard from '../../components/InputCard';
import { renderWithProviders } from '../test-utils';

const defaultProps = {
  currentInput: { id: 'SAT/CBL', name: 'CBL/SAT', selected: true },
  availableInputs: [
    { id: 'SAT/CBL', name: 'CBL/SAT', selected: true },
    { id: 'BD', name: 'Blu-ray', selected: false },
    { id: 'GAME', name: 'Game', selected: false },
    { id: 'TV', name: 'TV Audio', selected: false },
  ],
  onInputChange: vi.fn(),
};

describe('InputCard', () => {
  it('should render the title', () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getByText('Input Source')).toBeInTheDocument();
  });

  it('should display current input name as a chip', () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    expect(screen.getByText('CBL/SAT')).toBeInTheDocument();
  });

  it('should render a select dropdown', () => {
    renderWithProviders(<InputCard {...defaultProps} />);
    // MUI Select renders a hidden input with combobox role
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('should render without available inputs', () => {
    renderWithProviders(
      <InputCard
        currentInput={{ id: 'BD', name: 'Blu-ray', selected: true }}
        availableInputs={[]}
        onInputChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Blu-ray')).toBeInTheDocument();
    // No combobox when no inputs
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should display fallback when input name is empty', () => {
    renderWithProviders(
      <InputCard
        currentInput={{ id: '', name: '', selected: true }}
        availableInputs={[]}
        onInputChange={vi.fn()}
      />,
    );
    expect(screen.getByText('---')).toBeInTheDocument();
  });
});
