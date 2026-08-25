import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { DEFAULT_SETTINGS, SPIN_DURATION_PRESETS } from '../../contentModel';
import type { WheelSettings } from '../../types';

describe('SettingsPanel', () => {
  const setup = (settings: WheelSettings = { ...DEFAULT_SETTINGS }) => {
    const onChange = jest.fn();
    render(<SettingsPanel settings={settings} onChange={onChange} />);
    return { onChange };
  };

  it('renders duration presets with the active one checked', () => {
    setup();
    const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
    expect(radios).toHaveLength(SPIN_DURATION_PRESETS.length);
    const activeIndex = SPIN_DURATION_PRESETS.findIndex(
      (p) => p.ms === DEFAULT_SETTINGS.spinDurationMs,
    );
    expect(radios[activeIndex].getAttribute('aria-checked')).toBe('true');
  });

  it.each(SPIN_DURATION_PRESETS.map((p) => [p.label, p.ms] as const))(
    'selecting %s reports its duration',
    (label, ms) => {
      const { onChange } = setup();
      fireEvent.click(screen.getByRole('radio', { name: label }));
      expect(onChange).toHaveBeenCalledWith({ spinDurationMs: ms });
    },
  );

  it.each([
    ['Remove winner after spin', 'removeWinnerAfterSpin'],
    ['Hide winner until click', 'hideWinnerUntilClick'],
    ['Sound', 'soundEnabled'],
  ] as const)('toggles %s', (label, field) => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('switch', { name: label }));
    expect(onChange).toHaveBeenCalledWith({ [field]: !DEFAULT_SETTINGS[field] });
  });

  it('reflects switch state via aria-checked', () => {
    render(
      <SettingsPanel
        settings={{ ...DEFAULT_SETTINGS, removeWinnerAfterSpin: true }}
        onChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('switch', { name: 'Remove winner after spin' }).getAttribute('aria-checked'),
    ).toBe('true');
  });
});
