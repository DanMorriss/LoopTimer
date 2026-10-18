import { TestBed } from '@angular/core/testing';
import { SettingsStore } from '../state/settings-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../testing/fake-audio-context';
import { AlarmService, AUDIO_CONTEXT_FACTORY } from './alarm.service';

const WORK = ['880@0', '880@0.25'];

describe('AlarmService', () => {
    let context: FakeAudioContext;
    let alarms: AlarmService;

    beforeEach(() => {
        vi.useFakeTimers({ now: 1_000_000 });
        localStorage.clear();
        context = new FakeAudioContext();
        TestBed.configureTestingModule({ providers: [provideFakeAudioContext(context)] });
        alarms = TestBed.inject(AlarmService);
    });
    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    describe('unlocking sound', () => {
        it('starts locked', () => {
            expect(alarms.unlocked()).toBe(false);
        });

        for (const type of ['pointerdown', 'keydown', 'touchend', 'click']) {
            it(`unlocks on the first ${type} anywhere on the page`, () => {
                document.body.dispatchEvent(new Event(type, { bubbles: true }));

                expect(alarms.unlocked()).toBe(true);
            });
        }

        it('stays locked if the browser refuses, and tries again on the next interaction', async () => {
            context.allowResume = false;
            alarms.unlock();
            await Promise.resolve();
            expect(alarms.unlocked()).toBe(false);

            context.allowResume = true;
            alarms.unlock();

            expect(alarms.unlocked()).toBe(true);
        });

        it('closes the audio and stops listening for interactions when destroyed', () => {
            alarms.unlock();
            TestBed.resetTestingModule();

            document.body.click();

            expect(context.state).toBe('closed');
        });

        it('does nothing where the browser has no Web Audio', () => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [{ provide: AUDIO_CONTEXT_FACTORY, useValue: () => null }],
            });
            const noAudio = TestBed.inject(AlarmService);

            noAudio.unlock();
            noAudio.schedule([{ kind: 'work', at: Date.now() }]);

            expect(noAudio.unlocked()).toBe(false);
        });
    });

    describe('scheduling', () => {
        it('plays nothing until sound is unlocked', () => {
            alarms.schedule([{ kind: 'work', at: Date.now() + 1000 }]);

            expect(context.scheduledNotes()).toEqual([]);
        });

        it('plays each alarm at its time on the audio clock, with a different sound for each', () => {
            alarms.unlock();
            const now = Date.now();

            alarms.schedule([
                { kind: 'work', at: now },
                { kind: 'rest', at: now + 30000 },
                { kind: 'finish', at: now + 40000 },
            ]);

            expect(context.scheduledNotes()).toEqual([
                ...WORK,
                '440@30',
                '523.25@40',
                '659.25@40.2',
                '783.99@40.4',
            ]);
        });

        it('plays an alarm up to a second late straight away, and skips older ones', () => {
            alarms.unlock();
            const now = Date.now();

            alarms.schedule([
                { kind: 'rest', at: now - 5000 },
                { kind: 'work', at: now - 400 },
            ]);

            expect(context.scheduledNotes()).toEqual(WORK);
        });

        it('replaces what was scheduled before', () => {
            alarms.unlock();
            alarms.schedule([{ kind: 'rest', at: Date.now() + 5000 }]);

            alarms.schedule([{ kind: 'work', at: Date.now() }]);

            expect(context.scheduledNotes()).toEqual(WORK);
        });

        it('does not play an alarm twice, or cut it off, when rescheduled just after it starts', () => {
            alarms.unlock();
            const start = Date.now();
            const work = { kind: 'work' as const, at: start };
            const rest = { kind: 'rest' as const, at: start + 30000 };
            alarms.schedule([work, rest]);
            vi.advanceTimersByTime(100);

            // e.g. topping up a long workout's alarms, just as a round starts
            alarms.schedule([work, rest, { kind: 'work', at: start + 40000 }]);

            expect(context.scheduledNotes()).toEqual([...WORK, '440@30', '880@40', '880@40.25']);
        });

        it('silences everything when cancelled', () => {
            alarms.unlock();
            alarms.schedule([
                { kind: 'work', at: Date.now() },
                { kind: 'rest', at: Date.now() + 5000 },
            ]);

            alarms.cancel();

            expect(context.scheduledNotes()).toEqual([]);
        });
    });

    describe('vibration', () => {
        const interacted = (value: boolean) =>
            vi.spyOn(navigator.userActivation, 'hasBeenActive', 'get').mockReturnValue(value);

        it('vibrates with a different pattern for each alarm', () => {
            interacted(true);
            const vibrate = vi.spyOn(navigator, 'vibrate').mockReturnValue(true);

            alarms.vibrate('work');
            alarms.vibrate('rest');

            expect(vibrate).toHaveBeenCalledTimes(2);
            expect(vibrate.mock.calls[0][0]).not.toEqual(vibrate.mock.calls[1][0]);
        });

        it('waits for the first interaction, as the browser would block it', () => {
            interacted(false);
            const vibrate = vi.spyOn(navigator, 'vibrate').mockReturnValue(true);

            alarms.vibrate('work');

            expect(vibrate).not.toHaveBeenCalled();
        });

        it('stays still when vibration is turned off in settings', () => {
            interacted(true);
            const vibrate = vi.spyOn(navigator, 'vibrate').mockReturnValue(true);
            TestBed.inject(SettingsStore).update({ vibration: false });

            alarms.vibrate('work');

            expect(vibrate).not.toHaveBeenCalled();
        });
    });

    describe('settings', () => {
        it('plays nothing, and silences what was booked, when sound is turned off', () => {
            alarms.unlock();
            alarms.schedule([{ kind: 'rest', at: Date.now() + 5000 }]);

            TestBed.inject(SettingsStore).update({ sound: false });
            alarms.schedule([{ kind: 'rest', at: Date.now() + 5000 }]);

            expect(context.scheduledNotes()).toEqual([]);
        });
    });

    describe('preview', () => {
        it('plays an alarm straight away, unlocking sound if needed', async () => {
            await alarms.preview('rest');

            expect(alarms.unlocked()).toBe(true);
            expect(context.scheduledNotes()).toEqual(['440@0']);
        });

        it('plays even with sound turned off, as it was asked for', async () => {
            TestBed.inject(SettingsStore).update({ sound: false });

            await alarms.preview('work');

            expect(context.scheduledNotes()).toEqual(WORK);
        });

        it('leaves booked alarms alone', async () => {
            alarms.unlock();
            alarms.schedule([{ kind: 'rest', at: Date.now() + 5000 }]);

            await alarms.preview('work');

            expect(context.scheduledNotes()).toEqual(['440@5', ...WORK]);
        });

        it('plays nothing if the browser still will not allow sound', async () => {
            context.allowResume = false;

            await alarms.preview('work');

            expect(context.scheduledNotes()).toEqual([]);
        });
    });
});
