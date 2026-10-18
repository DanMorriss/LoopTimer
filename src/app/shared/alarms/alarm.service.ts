import { DestroyRef, inject, InjectionToken, Service, signal } from '@angular/core';
import { AlarmEvent, AlarmKind } from '../../timer/alarm-schedule';

/** Makes the audio context, or returns null where the browser has no Web Audio. */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext | null>(
    'AUDIO_CONTEXT_FACTORY',
    { factory: () => () => (typeof AudioContext === 'undefined' ? null : new AudioContext()) }
);

interface Note {
    frequency: number;
    /** Seconds after the alarm starts. */
    offset: number;
    /** Seconds. */
    length: number;
}

// Simple beeps for now, until there are proper sound files. Each alarm sounds different:
// two short high beeps for work, one long low tone for rest, three rising notes to finish.
const SOUNDS: Record<AlarmKind, Note[]> = {
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

// Vibration patterns (on, off, on... in ms) to match each sound
const VIBRATIONS: Record<AlarmKind, number[]> = {
    work: [150, 100, 150],
    rest: [500],
    finish: [180, 20, 180, 20, 600],
};

const VOLUME = 0.3;

// An alarm that is due but up to this late still plays (e.g. the first work alarm, which
// is due the moment Start is pressed). Anything older is skipped, e.g. after a refresh.
const LATE_LIMIT_MS = 1000;

// Browsers only allow sound after the user has interacted with the page
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'] as const;

/**
 * Plays the alarms between phases.
 *
 * Alarms are scheduled ahead on the audio clock rather than played from a JS timer,
 * because browsers slow JS timers right down in background tabs but keep audio on time.
 */
@Service()
export class AlarmService {
    private readonly createContext = inject(AUDIO_CONTEXT_FACTORY);
    private context: AudioContext | null = null;
    /** Everything scheduled goes through this, so it can all be silenced at once. */
    private output: GainNode | null = null;
    private scheduled: OscillatorNode[] = [];

    private readonly _unlocked = signal(false);
    /** Whether the browser is allowing sound yet. */
    readonly unlocked = this._unlocked.asReadonly();
    readonly supported = typeof AudioContext !== 'undefined';

    constructor() {
        // Any interaction anywhere in the app unlocks sound, e.g. pressing Start in the
        // library, so it's ready before the timer page opens
        const unlock = () => this.unlock();
        for (const type of UNLOCK_EVENTS) {
            document.addEventListener(type, unlock, { capture: true, passive: true });
        }
        inject(DestroyRef).onDestroy(() => {
            for (const type of UNLOCK_EVENTS) {
                document.removeEventListener(type, unlock, { capture: true });
            }
            this.cancel();
            void this.context?.close();
        });
    }

    /** Asks the browser to allow sound. Must be called from a click, tap or key press. */
    unlock() {
        if (this.context?.state === 'running') {
            return;
        }
        if (!this.context) {
            this.context = this.createContext();
            if (!this.context) {
                return;
            }
            const context = this.context;
            context.addEventListener('statechange', () =>
                this._unlocked.set(context.state === 'running')
            );
        }
        // Rejected if the browser still won't allow it; the next interaction tries again
        this.context.resume().catch(() => undefined);
    }

    /**
     * Replaces whatever was scheduled with these alarms. Alarms already past are skipped.
     * Does nothing until sound is unlocked, so schedule again once it is.
     */
    schedule(events: AlarmEvent[]) {
        this.cancel();
        const context = this.context;
        if (context?.state !== 'running') {
            return;
        }

        this.output = context.createGain();
        this.output.connect(context.destination);
        const now = Date.now();

        for (const event of events) {
            const delayMs = event.at - now;
            if (delayMs < -LATE_LIMIT_MS) {
                continue;
            }
            const start = context.currentTime + Math.max(0, delayMs) / 1000;
            for (const note of SOUNDS[event.kind]) {
                this.scheduled.push(this.playNote(context, this.output, note, start));
            }
        }
    }

    /** Silences everything scheduled, e.g. on pause or stop. */
    cancel() {
        for (const oscillator of this.scheduled) {
            oscillator.stop();
        }
        this.scheduled = [];
        this.output?.disconnect();
        this.output = null;
    }

    /**
     * Vibrates the phone, where supported (not iPhones). Vibration can't be scheduled ahead
     * like sound, so call this as each alarm comes due.
     */
    vibrate(kind: AlarmKind) {
        // Like sound, vibration needs an interaction first; Chrome logs an error otherwise
        const interacted = navigator.userActivation?.hasBeenActive ?? true;
        if ('vibrate' in navigator && interacted) {
            navigator.vibrate(VIBRATIONS[kind]);
        }
    }

    private playNote(context: AudioContext, output: AudioNode, note: Note, alarmStart: number) {
        const start = alarmStart + note.offset;
        const end = start + note.length;

        // Fade in and out quickly, so the beep doesn't click
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(VOLUME, start + 0.01);
        envelope.gain.setValueAtTime(VOLUME, end - 0.03);
        envelope.gain.linearRampToValueAtTime(0, end);
        envelope.connect(output);

        const oscillator = context.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.value = note.frequency;
        oscillator.connect(envelope);
        oscillator.start(start);
        oscillator.stop(end);
        return oscillator;
    }
}
