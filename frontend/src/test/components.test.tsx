import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
import { CanaryProgressBar } from '../components/CanaryProgressBar';
import { MetricCard } from '../components/MetricCard';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Activity } from 'lucide-react';

describe('Frontend UI Components', () => {
  it('renders StatusBadge correctly with proper status text', () => {
    render(<StatusBadge status="PROMOTED" />);
    expect(screen.getByText('PROMOTED')).toBeInTheDocument();

    const { rerender } = render(<StatusBadge status="ROLLED_BACK" />);
    expect(screen.getByText('ROLLED_BACK')).toBeInTheDocument();
  });

  it('renders CanaryProgressBar with traffic percentage', () => {
    render(<CanaryProgressBar percentage={25} status="CANARY" />);
    expect(screen.getAllByText('25%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Baseline \(vStable\): 75%/i)).toBeInTheDocument();
  });

  it('renders MetricCard with title, value, and unit', () => {
    render(
      <MetricCard
        title="Error Budget"
        value={94.5}
        unit="%"
        icon={Activity}
        subtext="Allowed budget"
      />
    );
    expect(screen.getByText('Error Budget')).toBeInTheDocument();
    expect(screen.getByText('94.5')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('handles ConfirmationModal confirm and cancel callbacks', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    const { rerender } = render(
      <ConfirmationModal
        isOpen={true}
        title="Confirm Rollback"
        message="Are you sure you want to drain traffic?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText('Confirm Rollback')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to drain traffic?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm Action'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
