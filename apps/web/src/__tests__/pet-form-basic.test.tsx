import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PetForm } from '../features/planner/pet-form';

describe('Add Pet form', () => {
  it('catches an implausible Shih Tzu weight without rejecting every weight above the standard range', () => {
    render(<PetForm pending={false} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Michi' } });
    fireEvent.change(screen.getByLabelText(/Species/), { target: { value: 'Dog' } });
    fireEvent.change(screen.getByLabelText(/Breed/), { target: { value: 'Shih Tzu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Age' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const weight = screen.getByLabelText(/Current weight \(kg\)/);
    fireEvent.change(weight, { target: { value: '15.1' } });
    expect(screen.getByText(/Adult Shih Tzu breed standard: 4.5–8 kg/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A Shih Tzu over 15 kg looks unlikely');
    expect(screen.getByRole('heading', { name: 'Food and feeding' })).toBeInTheDocument();

    fireEvent.change(weight, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Health and activity' })).toBeInTheDocument();
  });

  it('never saves when the form submits before the review step', () => {
    const onSave = vi.fn();
    render(<PetForm pending={false} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Milo' } });
    fireEvent.change(screen.getByLabelText(/Species/), { target: { value: 'Dog' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Age' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/Current weight \(kg\)/), { target: { value: '5.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.submit(document.querySelector('.pet-form')!);
    expect(screen.getByRole('heading', { name: 'Confirm or edit' })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('accepts an estimated age without a birth month', () => {
    const onSave = vi.fn();
    render(<PetForm pending={false} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Milo' } });
    fireEvent.change(screen.getByLabelText(/Species/), { target: { value: 'Dog' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Age unit'), { target: { value: 'months' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Age' }), { target: { value: '28' } });
    const estimatedMonth = (screen.getByLabelText(/Birth month and year/) as HTMLInputElement)
      .value;
    fireEvent.change(screen.getByLabelText('Age unit'), { target: { value: 'years' } });
    expect(screen.getByRole('spinbutton', { name: 'Age' })).toHaveValue(2);
    expect(screen.getByLabelText(/Birth month and year/)).toHaveValue(estimatedMonth);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/Current weight \(kg\)/), { target: { value: '6.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(fireEvent.click(screen.getByRole('button', { name: 'Next' }))).toBe(false);
    expect(screen.getByRole('heading', { name: 'Confirm or edit' })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Milo',
        birthMonth: null,
        ageYears: 2,
        ageMonths: 4,
        weightKg: 6.2,
        neuterStatus: 'prefer_not_to_say',
      }),
    );
  });

  it('fills age from an optional birth month', () => {
    const onSave = vi.fn();
    render(<PetForm pending={false} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Luna' } });
    fireEvent.change(screen.getByLabelText(/Species/), { target: { value: 'Cat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/Birth month and year/), {
      target: { value: '2022-06' },
    });
    expect(screen.getByLabelText('Age unit')).toHaveValue('years');
    expect(screen.getByRole('spinbutton', { name: 'Age' })).not.toHaveValue(null);
    expect(screen.queryByText('Estimated')).toBeNull();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Age' }), { target: { value: '2' } });
    expect(screen.getByText('Estimated')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Birth month and year/), {
      target: { value: '2022-06' },
    });
    expect(screen.getByLabelText('Age unit')).toHaveValue('years');
    expect(screen.queryByText('Estimated')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/Current weight \(kg\)/), { target: { value: '4.3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ birthMonth: '2022-06' }));
  });

  it('keeps the selected age unit when a birth month changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1));
    try {
      render(<PetForm pending={false} onSave={vi.fn()} onCancel={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Milo' } });
      fireEvent.change(screen.getByLabelText(/Species/), { target: { value: 'Dog' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Age' }), { target: { value: '2' } });
      expect(screen.getByLabelText(/Birth month and year/)).toHaveValue('2024-10');
      fireEvent.change(screen.getByLabelText(/Birth month and year/), {
        target: { value: '2026-03' },
      });

      expect(screen.getByLabelText('Age unit')).toHaveValue('years');
      expect(screen.getByRole('spinbutton', { name: 'Age' })).toHaveValue(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
