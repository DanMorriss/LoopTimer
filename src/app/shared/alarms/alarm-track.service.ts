import { DestroyRef, inject, InjectionToken, Service, signal } from '@angular/core';
import { AlarmEvent } from '../../timer/alarm-schedule';
import { alarmTrack, silentTrack } from './alarm-track';

/** Makes the <audio> element the track plays on, or null where there isn't one. */
export const AUDIO_ELEMENT_FACTORY = new InjectionToken<() => HTMLAudioElement | null>(
    'AUDIO_ELEMENT_FACTORY',
    { factory: () => () => (typeof Audio === 'undefined' ? null : new Audio()) }
);

// Browsers only let an <audio> element play after the user has interacted with the page
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'] as const;

// A moment of silence, played on the first interaction so the element may play later on
const SILENCE = silentTrack(0.1);

/** What the lock screen shows, and what its buttons do. */
export interface LockScreen {
    title: string;
    paused: boolean;
    onPlay: () => void;
    onPause: () => void;
}

/**
 * Plays the alarms as an audio track on an <audio> element, which an iPhone keeps playing
 * with the screen locked (Web Audio, which AlarmService uses, stops). The track is made
 * fresh each time the alarms change (start, pause, resume, Done), starting from that
 * moment, so it's always in step with the timer.
 *
 * Shows the workout on the lock screen too (Media Session), with Pause and Play.
 */
@Service()
export class AlarmTrackService {
    private readonly audio = inject(AUDIO_ELEMENT_FACTORY)();
    private url: string | null = null;
    /** Counts up with each play() and stop(), so a slow play() that's been overtaken backs off. */
    private generation = 0;

    readonly supported = this.audio !== null;
    private readonly _playing = signal(false);
    /** Whether a track is playing now. */
    readonly playing = this._playing.asReadonly();

    constructor() {
        const audio = this.audio;
        if (!audio) {
            return;
        }
        audio.preload = 'auto';
        audio.addEventListener('ended', () => this._playing.set(false));

        // Play a moment of silence on the first interaction anywhere, which iOS takes as
        // permission to play this element from code later on, e.g. as a timer starts
        const unlock = () => {
            UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, unlock, true));
            if (!this.url) {
                audio.src = URL.createObjectURL(
                    new Blob([SILENCE as BlobPart], { type: 'audio/wav' })
                );
                audio.play().catch(() => undefined);
            }
        };
        UNLOCK_EVENTS.forEach((type) => document.addEventListener(type, unlock, true));
        inject(DestroyRef).onDestroy(() => {
            UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, unlock, true));
            this.stop();
        });
    }

    /**
     * Plays `events` as a track, from now. Resolves to whether it's playing; false means
     * the browser wouldn't play it, so the alarms need playing some other way.
     */
    async play(events: readonly AlarmEvent[]): Promise<boolean> {
        const audio = this.audio;
        this.stop();
        if (!audio) {
            return false;
        }
        const from = Date.now();
        const wav = alarmTrack(events, from);
        if (!wav) {
            // Nothing to play (e.g. waiting on a rep step), which counts as done
            return true;
        }
        const generation = ++this.generation;
        this.url = URL.createObjectURL(new Blob([wav as BlobPart], { type: 'audio/wav' }));
        audio.src = this.url;
        try {
            await audio.play();
        } catch {
            // Overtaken by a newer track (which aborts this one) isn't a refusal
            return generation !== this.generation;
        }
        if (generation !== this.generation) {
            return true;
        }
        // Starting takes a moment; catch up if it took long enough to hear
        const late = (Date.now() - from) / 1000;
        if (late > 0.1) {
            audio.currentTime = late;
        }
        this._playing.set(true);
        return true;
    }

    /** Stops the track, if one is playing. */
    stop() {
        this.generation++;
        this._playing.set(false);
        if (this.audio && this.url) {
            this.audio.pause();
            this.audio.removeAttribute('src');
        }
        if (this.url) {
            URL.revokeObjectURL(this.url);
            this.url = null;
        }
    }

    /** Shows the workout on the lock screen, or clears it with null. */
    showOnLockScreen(lockScreen: LockScreen | null) {
        const session = typeof navigator === 'undefined' ? undefined : navigator.mediaSession;
        if (!session) {
            return;
        }
        if (!lockScreen) {
            session.metadata = null;
            session.playbackState = 'none';
            session.setActionHandler('play', null);
            session.setActionHandler('pause', null);
            return;
        }
        if (typeof MediaMetadata !== 'undefined') {
            session.metadata = new MediaMetadata({ title: lockScreen.title, artist: 'LoopTimer' });
        }
        session.playbackState = lockScreen.paused ? 'paused' : 'playing';
        session.setActionHandler('play', lockScreen.onPlay);
        session.setActionHandler('pause', lockScreen.onPause);
    }
}
