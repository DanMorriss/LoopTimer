import { AlarmKind } from '../../timer/alarm-schedule';

export interface Note {
    frequency: number;
    /** Seconds after the alarm starts. */
    offset: number;
    /** Seconds. */
    length: number;
}

// Simple beeps for now, until there are proper sound files. Each alarm sounds different:
// two short high beeps for work, one long low tone for rest, three rising notes to finish.
export const SOUNDS: Record<AlarmKind, Note[]> = {
    work: [
        { frequency: 880, offset: 0, length: 0.15 },
        { frequency: 880, offset: 0.25, length: 0.15 },
    ],
    rest: [{ frequency: 440, offset: 0, length: 0.5 }],
    finish: [
        { frequency: 523.25, offset: 0, length: 0.18 },
        { frequency: 659.25, offset: 0.2, length: 0.18 },
        { frequency: 783.99, offset: 0.4, length: 0.6 },
    ],
};

export const VOLUME = 0.3;

/** How long the fade in and out at each end of a note last, in seconds, so it doesn't click. */
export const FADE_IN = 0.01;
export const FADE_OUT = 0.03;
