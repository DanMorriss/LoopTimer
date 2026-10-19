import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlarmService } from '../shared/alarms/alarm.service';
import { KeepAwakeService } from '../shared/run/keep-awake.service';
import { AlarmTrackService } from '../shared/alarms/alarm-track.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../shared/testing/fake-audio-context';
import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { SettingsComponent } from './settings.component';

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
            'Play the work alarm',
            'Play the rest alarm',
            'Play the finish alarm',
        ]);
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

    describe('beeps with the screen locked', () => {
        it('is off to begin with, as it is on trial, and saves being turned on', () => {
            Object.defineProperty(TestBed.inject(AlarmTrackService), 'supported', { value: true });
            create();
            expect(isOn('track')).toBe(false);
            expect(fixture.nativeElement.textContent).toContain('Pauses other music');

            toggle('track').click();
            fixture.detectChanges();

            expect(settings.lockScreenBeeps()).toBe(true);
        });
    });
});
