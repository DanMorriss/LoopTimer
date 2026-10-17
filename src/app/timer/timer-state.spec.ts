import { Timer } from '../models/timer';
import { timerStateAt } from './timer-state';

function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 1,
    title: 'Intervals',
    timerMinutes: 0,
    timerSeconds: 30,
    restMinutes: 0,
    restSeconds: 10,
    repeats: 3,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
    ...overrides
  };
}

describe('timerStateAt', () => {
  const timer = makeTimer(); // 30s work, 10s rest, 3 rounds = 30 + 10 + 30 + 10 + 30 = 110s

  it('starts at the full work time on the first round', () => {
    expect(timerStateAt(timer, 0)).toEqual({ phase: 'work', remainingSeconds: 30, phaseSeconds: 30, roundsLeft: 3, round: 0, phaseElapsedMs: 0 });
  });

  it('only counts whole seconds', () => {
    expect(timerStateAt(timer, 999).remainingSeconds).toBe(30);
    expect(timerStateAt(timer, 1000).remainingSeconds).toBe(29);
  });

  it('moves to rest the moment work runs out', () => {
    expect(timerStateAt(timer, 29_999).phase).toBe('work');
    expect(timerStateAt(timer, 30_000)).toEqual({ phase: 'rest', remainingSeconds: 10, phaseSeconds: 10, roundsLeft: 3, round: 0, phaseElapsedMs: 0 });
  });

  it('starts the next round the moment rest runs out', () => {
    expect(timerStateAt(timer, 40_000)).toEqual({ phase: 'work', remainingSeconds: 30, phaseSeconds: 30, roundsLeft: 2, round: 1, phaseElapsedMs: 0 });
  });

  it('has no rest after the last round and completes at the total time', () => {
    expect(timerStateAt(timer, 109_999)).toEqual({ phase: 'work', remainingSeconds: 1, phaseSeconds: 30, roundsLeft: 1, round: 2, phaseElapsedMs: 29_999 });
    expect(timerStateAt(timer, 110_000)).toEqual({ phase: 'complete', remainingSeconds: 0, phaseSeconds: 0, roundsLeft: 0, round: 3, phaseElapsedMs: 0 });
  });

  it('stays complete long after the end', () => {
    expect(timerStateAt(timer, 24 * 60 * 60 * 1000).phase).toBe('complete');
  });

  it('skips rest when the rest time is zero', () => {
    const noRest = makeTimer({ restSeconds: 0, repeats: 2 });

    expect(timerStateAt(noRest, 30_000)).toEqual({ phase: 'work', remainingSeconds: 30, phaseSeconds: 30, roundsLeft: 1, round: 1, phaseElapsedMs: 0 });
    expect(timerStateAt(noRest, 60_000).phase).toBe('complete');
  });

  it('handles minutes as well as seconds', () => {
    const long = makeTimer({ timerMinutes: 2, timerSeconds: 5, restMinutes: 1, restSeconds: 0, repeats: 2 });

    expect(timerStateAt(long, 125_000)).toEqual({ phase: 'rest', remainingSeconds: 60, phaseSeconds: 60, roundsLeft: 2, round: 0, phaseElapsedMs: 0 });
  });

  it('reports exactly how far into the current phase it is, to the millisecond', () => {
    expect(timerStateAt(timer, 12_345).phaseElapsedMs).toBe(12_345);
    expect(timerStateAt(timer, 33_500).phaseElapsedMs).toBe(3_500);
    expect(timerStateAt(timer, 52_250).phaseElapsedMs).toBe(12_250);
  });

  it('treats a start time in the future as not started yet', () => {
    expect(timerStateAt(timer, -5000).remainingSeconds).toBe(30);
  });
});
