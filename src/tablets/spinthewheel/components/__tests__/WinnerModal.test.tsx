import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinnerModal } from '../WinnerModal';

describe('WinnerModal', () => {
  const setup = (
    winnerLabel: string | null = 'Alice',
    onCopyImage?: () => Promise<'copied' | 'downloaded' | 'failed'>,
  ) => {
    const onRemoveAndSpin = jest.fn();
    const onSpinAgain = jest.fn();
    const onClose = jest.fn();
    render(
      <WinnerModal
        winnerLabel={winnerLabel}
        onRemoveAndSpin={onRemoveAndSpin}
        onSpinAgain={onSpinAgain}
        onClose={onClose}
        onCopyImage={onCopyImage}
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

  it('hides the copy-image action when no handler is provided', () => {
    setup('Alice');
    expect(
      screen.queryByRole('button', { name: /copy result as image/i }),
    ).not.toBeInTheDocument();
  });

  it('offers copy-as-image and confirms success on the button', async () => {
    const onCopyImage = jest.fn().mockResolvedValue('copied');
    setup('Alice', onCopyImage);

    await act(async () => {
      await userEvent.click(
        screen.getByRole('button', { name: /copy result as image/i }),
      );
    });

    expect(onCopyImage).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/image copied/i)).toBeInTheDocument();
  });

  it('shows a failure message when the export fails', async () => {
    setup('Alice', jest.fn().mockResolvedValue('failed'));

    await act(async () => {
      await userEvent.click(
        screen.getByRole('button', { name: /copy result as image/i }),
      );
    });

    expect(screen.getByText(/couldn't export image/i)).toBeInTheDocument();
  });
});
