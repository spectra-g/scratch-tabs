import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinnerModal } from '../WinnerModal';

describe('WinnerModal', () => {
  const setup = (winnerLabel: string | null = 'Alice') => {
    const onRemoveAndSpin = jest.fn();
    const onSpinAgain = jest.fn();
    const onClose = jest.fn();
    render(
      <WinnerModal
        winnerLabel={winnerLabel}
        onRemoveAndSpin={onRemoveAndSpin}
        onSpinAgain={onSpinAgain}
        onClose={onClose}
      />,
    );
    return { onRemoveAndSpin, onSpinAgain, onClose };
  };

  it('shows nothing when there is no winner', () => {
    setup(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays the winner name', () => {
    setup('Bob');
    expect(screen.getByTestId('spinthewheel-winner')).toHaveTextContent('Bob');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('action buttons delegate behaviour to the parent without self-closing', async () => {
    const { onSpinAgain, onRemoveAndSpin, onClose } = setup('Alice');
    await userEvent.click(screen.getByRole('button', { name: /^spin again$/i }));
    await userEvent.click(
      screen.getByRole('button', { name: /remove entry & spin again/i }),
    );
    expect(onSpinAgain).toHaveBeenCalledTimes(1);
    expect(onRemoveAndSpin).toHaveBeenCalledTimes(1);
    // The modal never closes itself via actions — the parent owns dismissal.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('close button, backdrop click, and Escape all dismiss the dialog', async () => {
    const { onClose } = setup('Alice');
    await userEvent.click(screen.getByRole('button', { name: /close winner dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
