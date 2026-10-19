import { TestBed } from '@angular/core/testing';
import { AlarmTrackService, AUDIO_ELEMENT_FACTORY } from './alarm-track.service';

/** A stand-in <audio> element: records what it's asked to play, and can refuse. */
class FakeAudio {
    src = '';
    preload = '';
    currentTime = 0;
    paused = true;
    refuse = false;
    plays: string[] = [];
    play = vi.fn(async () => {
        if (this.refuse) {
            throw new DOMException('Not allowed', 'NotAllowedError');
        }
        this.paused = false;
        this.plays.push(this.src);
    });
    pause = vi.fn(() => {
        this.paused = true;
    });
    removeAttribute(name: string) {
        if (name === 'src') {
            this.src = '';
        }
    }
    addEventListener() {}
}

describe('AlarmTrackService', () => {
    let audio: FakeAudio;
    let track: AlarmTrackService;

    beforeEach(() => {
        audio = new FakeAudio();
        TestBed.configureTestingModule({
            providers: [{ provide: AUDIO_ELEMENT_FACTORY, useValue: () => audio }],
        });
        track = TestBed.inject(AlarmTrackService);
    });

    const soon = () => [{ kind: 'work' as const, at: Date.now() + 1000 }];

    it('plays the alarms as a WAV track', async () => {
        expect(await track.play(soon())).toBe(true);

        expect(audio.plays).toHaveLength(1);
        expect(audio.plays[0]).toMatch(/^blob:/);
        expect(track.playing()).toBe(true);
    });

    it('says so when the browser refuses, so the alarms can play another way', async () => {
        audio.refuse = true;

        expect(await track.play(soon())).toBe(false);
        expect(track.playing()).toBe(false);
    });

    it("doesn't count a play overtaken by a newer one as refused", async () => {
        const first = track.play(soon());
        audio.refuse = true; // as the browser aborts the first when the second takes over
        const second = track.play(soon());

        expect(await first).toBe(true);
        expect(await second).toBe(false);
    });

    it('stops, and lets go of the track', async () => {
        const revoke = vi.spyOn(URL, 'revokeObjectURL');
        await track.play(soon());

        track.stop();

        expect(audio.pause).toHaveBeenCalled();
        expect(audio.src).toBe('');
        expect(revoke).toHaveBeenCalled();
        expect(track.playing()).toBe(false);
    });

    it('plays nothing, and counts it done, with no alarms to come', async () => {
        expect(await track.play([])).toBe(true);
        expect(audio.play).not.toHaveBeenCalled();
    });

    it('plays a moment of silence on the first interaction, so it may play from code later', () => {
        document.dispatchEvent(new Event('pointerdown'));
        document.dispatchEvent(new Event('pointerdown'));

        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(audio.src).toMatch(/^blob:/);
    });

    it('is not supported without an <audio> element', () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [{ provide: AUDIO_ELEMENT_FACTORY, useValue: () => null }],
        });

        expect(TestBed.inject(AlarmTrackService).supported).toBe(false);
    });

    describe('on the lock screen', () => {
        afterEach(() => track.showOnLockScreen(null));

        it('shows the workout, with Play and Pause wired up', () => {
            const setActionHandler = vi.spyOn(navigator.mediaSession, 'setActionHandler');
            const onPlay = vi.fn();
            const onPause = vi.fn();

            track.showOnLockScreen({ title: 'Sprints', paused: false, onPlay, onPause });

            expect(navigator.mediaSession.metadata?.title).toBe('Sprints');
            expect(navigator.mediaSession.metadata?.artist).toBe('LoopTimer');
            expect(navigator.mediaSession.playbackState).toBe('playing');
            expect(setActionHandler).toHaveBeenCalledWith('play', onPlay);
            expect(setActionHandler).toHaveBeenCalledWith('pause', onPause);
        });

        it('clears it', () => {
            track.showOnLockScreen({
                title: 'Sprints',
                paused: true,
                onPlay: () => {},
                onPause: () => {},
            });

            track.showOnLockScreen(null);

            expect(navigator.mediaSession.metadata).toBeNull();
            expect(navigator.mediaSession.playbackState).toBe('none');
        });
    });
});
