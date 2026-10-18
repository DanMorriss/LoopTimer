import { Provider } from '@angular/core';
import { AUDIO_CONTEXT_FACTORY } from '../alarms/alarm.service';

class FakeOscillator {
    type = 'sine';
    readonly frequency = { value: 0 };
    startAt: number | null = null;
    stopAt: number | null = null;
    /** Stopped with no time given, i.e. cancelled. */
    cancelled = false;

    connect() {}

    start(when: number) {
        this.startAt = when;
    }

    stop(when?: number) {
        if (when === undefined) {
            this.cancelled = true;
        } else {
            this.stopAt = when;
        }
    }
}

const fakeParam = { setValueAtTime() {}, linearRampToValueAtTime() {} };

/**
 * Stands in for the browser's AudioContext: nothing plays, and its clock follows Date.now()
 * (so the test's fake clock), starting at 0.
 * It starts suspended, as browsers do before the user interacts with the page.
 */
export class FakeAudioContext {
    state: AudioContextState = 'suspended';
    private readonly createdAt = Date.now();
    readonly destination = {};

    get currentTime() {
        return (Date.now() - this.createdAt) / 1000;
    }
    /** Set to false to act like a browser that still won't allow sound. */
    allowResume = true;
    readonly oscillators: FakeOscillator[] = [];
    private readonly listeners: (() => void)[] = [];

    addEventListener(_type: 'statechange', listener: () => void) {
        this.listeners.push(listener);
    }

    resume() {
        if (!this.allowResume) {
            return Promise.reject(new Error('Not allowed'));
        }
        this.setState('running');
        return Promise.resolve();
    }

    close() {
        this.setState('closed');
        return Promise.resolve();
    }

    createGain() {
        return { gain: fakeParam, connect() {}, disconnect() {} };
    }

    createOscillator() {
        const oscillator = new FakeOscillator();
        this.oscillators.push(oscillator);
        return oscillator;
    }

    /** Notes still to play or playing, as "frequency@start" with the start in seconds. */
    scheduledNotes(): string[] {
        return this.oscillators
            .filter((o) => !o.cancelled && o.stopAt! > this.currentTime)
            .map((o) => `${o.frequency.value}@${Math.round(o.startAt! * 1000) / 1000}`);
    }

    private setState(state: AudioContextState) {
        this.state = state;
        this.listeners.forEach((listener) => listener());
    }
}

/** Provides `context` to AlarmService in place of a real AudioContext. */
export function provideFakeAudioContext(context: FakeAudioContext): Provider {
    return {
        provide: AUDIO_CONTEXT_FACTORY,
        useValue: () => context as unknown as AudioContext,
    };
}
