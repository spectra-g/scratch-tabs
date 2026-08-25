import { createTickPlayer } from '../tickSound';

describe('createTickPlayer', () => {
  it('plays without throwing when Web Audio is unavailable (jsdom)', () => {
    const player = createTickPlayer();
    expect(() => player.play()).not.toThrow();
    player.dispose();
  });

  it('survives repeated play calls and double dispose', () => {
    const player = createTickPlayer();
    expect(() => {
      player.play();
      player.play();
      player.dispose();
      player.dispose();
    }).not.toThrow();
  });

  it('is inert after disposal', () => {
    const player = createTickPlayer();
    player.dispose();
    expect(() => player.play()).not.toThrow();
  });
});
