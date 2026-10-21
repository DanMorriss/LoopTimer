import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlarmService } from '../shared/alarms/alarm.service';
import { KeepAwakeService } from '../shared/run/keep-awake.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../shared/testing/fake-audio-context';
import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { BackupService } from '../shared/backup/backup.service';
import { importMessage, SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
    let fixture: ComponentFixture<SettingsComponent>;
    let settings: SettingsStore;
    let audio: FakeAudioContext;

    function create() {
        fixture = TestBed.createComponent(SettingsComponent);
        fixture.detectChanges();
    }

    beforeEach(() => {
        localStorage.clear();
        audio = new FakeAudioContext();
        TestBed.configureTestingModule({ providers: [provideFakeAudioContext(audio)] });
        settings = TestBed.inject(SettingsStore);
    });
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    const toggle = (name: string) =>
        fixture.nativeElement.querySelector(
            `[role="switch"][aria-labelledby="${name}-label"]`
        ) as HTMLButtonElement;
    const isOn = (name: string) => toggle(name).getAttribute('aria-checked') === 'true';

    describe('theme', () => {
        const radios = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll(
                    'input[name="theme"]'
                ) as NodeListOf<HTMLInputElement>
            );
        const labels = () => radios().map((r) => r.closest('label')!.textContent!.trim());
        const checked = () => radios().find((r) => r.checked)?.value;

        it('offers Dark, Light and System as radio buttons in a labelled group', () => {
            create();

            expect(labels()).toEqual(['Dark', 'Light', 'System']);
            const group = fixture.nativeElement.querySelector('fieldset') as HTMLFieldSetElement;
            expect(group.querySelector('legend')!.textContent).toBe('Theme');
        });

        it('has Dark chosen to begin with', () => {
            create();

            expect(checked()).toBe('dark');
        });

        // The change is applied inside a view transition, a frame or so after the click
        it('saves the theme picked', async () => {
            create();

            radios()[1].click();
            await vi.waitFor(() => expect(settings.theme()).toBe('light'));
            fixture.detectChanges();

            expect(checked()).toBe('light');
            expect(JSON.parse(localStorage.getItem('settings')!).theme).toBe('light');
        });

        it('fades between themes with a view transition, and slides the highlight across', async () => {
            const startViewTransition = vi.spyOn(document, 'startViewTransition');
            create();
            const thumb = () =>
                (
                    fixture.nativeElement.querySelector('.theme-picker__options') as HTMLElement
                ).style.getPropertyValue('--chosen');
            expect(thumb()).toBe('0');

            radios()[2].click();
            await vi.waitFor(() => expect(settings.theme()).toBe('system'));
            fixture.detectChanges();

            expect(startViewTransition).toHaveBeenCalledTimes(1);
            expect(thumb()).toBe('2');
            const chosen = fixture.nativeElement.querySelector('.theme-picker__option--chosen');
            expect(chosen.textContent.trim()).toBe('System');
        });

        it('copes with a second choice made mid-fade, keeping the last one', async () => {
            create();

            radios()[1].click();
            radios()[2].click();
            await vi.waitFor(() => expect(settings.theme()).toBe('system'));
            await vi.waitFor(() =>
                expect(document.documentElement.classList).not.toContain('theme-switching')
            );
        });

        it('changes the theme at once, with no fade, when reduced motion is on', () => {
            fakeReducedMotion(true);
            const startViewTransition = vi.spyOn(document, 'startViewTransition');
            create();

            radios()[1].click();

            expect(settings.theme()).toBe('light');
            expect(startViewTransition).not.toHaveBeenCalled();
        });

        it('shows the saved theme', () => {
            settings.update({ theme: 'system' });
            create();

            expect(checked()).toBe('system');
        });
    });

    it('shows the saved settings', () => {
        settings.update({ sound: false });
        create();

        expect(isOn('sound')).toBe(false);
    });

    it('turns sound off and on, and saves it', () => {
        create();
        expect(isOn('sound')).toBe(true);

        toggle('sound').click();
        fixture.detectChanges();

        expect(isOn('sound')).toBe(false);
        expect(settings.sound()).toBe(false);
        expect(JSON.parse(localStorage.getItem('settings')!).sound).toBe(false);
    });

    it('explains each switch to screen readers', () => {
        create();
        const hint = fixture.nativeElement.querySelector(
            `#${toggle('sound').getAttribute('aria-describedby')}`
        );

        expect(hint.textContent).toContain('Beeps as each phase starts');
    });

    it('turns vibration off where the device can vibrate', () => {
        Object.defineProperty(TestBed.inject(AlarmService), 'canVibrate', { value: true });
        create();

        toggle('vibration').click();
        fixture.detectChanges();

        expect(settings.vibration()).toBe(false);
    });

    it("disables vibration, and says why, where the device can't vibrate", () => {
        Object.defineProperty(TestBed.inject(AlarmService), 'canVibrate', { value: false });
        create();

        expect(toggle('vibration').disabled).toBe(true);
        expect(isOn('vibration')).toBe(false);
        expect(fixture.nativeElement.textContent).toContain("This device can't vibrate");
    });

    it('plays each alarm sound from its Play button', async () => {
        create();
        const play = fixture.nativeElement.querySelector(
            'button[aria-label="Play the rest alarm"]'
        ) as HTMLButtonElement;

        expect(play.textContent).toContain('Play');
        play.click();
        await fixture.whenStable();

        // The rest alarm's one low note
        expect(audio.scheduledNotes()).toEqual([expect.stringMatching(/^440@/)]);
    });

    it('offers a preview of the work, rest and finish alarms', () => {
        create();
        const labels = Array.from(
            fixture.nativeElement.querySelectorAll('.play-button') as NodeListOf<HTMLElement>
        ).map((b) => b.getAttribute('aria-label'));

        expect(labels).toEqual([
            'Play the timed alarm',
            'Play the rest alarm',
            'Play the finish alarm',
        ]);
    });

    describe('weight units', () => {
        const radios = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll(
                    'input[name="weightUnit"]'
                ) as NodeListOf<HTMLInputElement>
            );

        it('offers kg and lb in a labelled group, with kg chosen to begin with', () => {
            create();

            expect(radios().map((r) => r.closest('label')!.textContent!.trim())).toEqual([
                'Kilograms (kg)',
                'Pounds (lb)',
            ]);
            expect(radios()[0].closest('fieldset')!.querySelector('legend')!.textContent).toBe(
                'Weight'
            );
            expect(radios().find((r) => r.checked)?.value).toBe('kg');
        });

        it('saves lb when picked', () => {
            create();

            radios()[1].click();
            fixture.detectChanges();

            expect(settings.weightUnit()).toBe('lb');
            expect(radios().find((r) => r.checked)?.value).toBe('lb');
        });
    });

    describe('keep screen on', () => {
        /** As if the browser does, or doesn't, have the Screen Wake Lock API. */
        const supported = (value: boolean) =>
            Object.defineProperty(TestBed.inject(KeepAwakeService), 'supported', { value });

        it('is on to begin with, and saves being turned off', () => {
            supported(true);
            create();
            expect(isOn('screen')).toBe(true);

            toggle('screen').click();
            fixture.detectChanges();

            expect(settings.keepScreenOn()).toBe(false);
            expect(isOn('screen')).toBe(false);
        });

        it("says so, and can't be turned on, where the browser can't keep the screen on", () => {
            supported(false);
            create();

            expect(toggle('screen').disabled).toBe(true);
            expect(isOn('screen')).toBe(false);
            expect(fixture.nativeElement.textContent).toContain(
                "This browser can't keep the screen on"
            );
        });
    });

    describe('your data', () => {
        const button = (label: string) =>
            Array.from(
                fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
            ).find((b) => b.textContent!.trim() === label)!;
        const fileInput = () =>
            fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
        const status = () =>
            (
                fixture.nativeElement.querySelector('[role="status"]') as HTMLElement
            ).textContent!.trim();

        it('exports a backup and says what it was saved as', () => {
            create();
            const exportSpy = vi
                .spyOn(TestBed.inject(BackupService), 'export')
                .mockReturnValue('looptimer-2026-10-21.json');

            button('Export backup').click();
            fixture.detectChanges();

            expect(exportSpy).toHaveBeenCalledTimes(1);
            expect(status()).toBe('Backup saved as looptimer-2026-10-21.json.');
        });

        it('opens the file picker from Import backup, keeping the input itself out of reach', () => {
            create();
            const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => {});

            button('Import backup').click();

            expect(click).toHaveBeenCalledTimes(1);
            expect(fileInput().tabIndex).toBe(-1);
            expect(fileInput().getAttribute('aria-hidden')).toBe('true');
        });

        it('imports the chosen file and says what was added', async () => {
            create();
            const importSpy = vi
                .spyOn(TestBed.inject(BackupService), 'import')
                .mockResolvedValue({ ok: true, timersAdded: 2, workoutsAdded: 14, skipped: 0 });
            const file = new File(['{}'], 'backup.json');
            Object.defineProperty(fileInput(), 'files', { value: [file], configurable: true });

            fileInput().dispatchEvent(new Event('change'));
            await fixture.whenStable();
            fixture.detectChanges();

            expect(importSpy).toHaveBeenCalledWith(file);
            expect(status()).toBe('Added 2 timers and 14 workouts to the history.');
        });
    });

    describe('importMessage', () => {
        const added = (timersAdded: number, workoutsAdded: number, skipped = 0) =>
            importMessage({ ok: true, timersAdded, workoutsAdded, skipped });

        it('says what was added', () => {
            expect(added(1, 0)).toBe('Added 1 timer.');
            expect(added(0, 1)).toBe('Added 1 workout to the history.');
            expect(added(3, 2)).toBe('Added 3 timers and 2 workouts to the history.');
        });

        it('says when there was nothing new', () => {
            expect(added(0, 0)).toBe('Nothing new: everything in that backup is already here.');
        });

        it('says how many items were left out', () => {
            expect(added(1, 0, 1)).toBe(
                "Added 1 timer. 1 item in it couldn't be read, so it was left out."
            );
            expect(added(0, 0, 2)).toBe(
                "Nothing new: everything in that backup is already here. 2 items in it couldn't be read, so they were left out."
            );
        });

        it('says why a file was turned down', () => {
            expect(importMessage({ ok: false, problem: 'not-a-backup' })).toBe(
                "That file isn't a LoopTimer backup."
            );
            expect(importMessage({ ok: false, problem: 'too-big' })).toBe(
                "That file isn't a LoopTimer backup."
            );
            expect(importMessage({ ok: false, problem: 'unreadable' })).toBe(
                "That file couldn't be read. Is it a LoopTimer backup?"
            );
            expect(importMessage({ ok: false, problem: 'too-new' })).toBe(
                'That backup is from a newer version of LoopTimer. Update the app and try again.'
            );
        });
    });
});
