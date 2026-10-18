import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlarmService } from '../shared/alarms/alarm.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../shared/testing/fake-audio-context';
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

        it('offers Dark, Light and Match system as radio buttons in a labelled group', () => {
            create();

            expect(labels()).toEqual(['Dark', 'Light', 'Match system']);
            const group = fixture.nativeElement.querySelector('fieldset') as HTMLFieldSetElement;
            expect(group.querySelector('legend')!.textContent).toBe('Theme');
        });

        it('has Dark chosen to begin with', () => {
            create();

            expect(checked()).toBe('dark');
        });

        it('saves the theme picked', () => {
            create();

            radios()[1].click();
            fixture.detectChanges();

            expect(settings.theme()).toBe('light');
            expect(checked()).toBe('light');
            expect(JSON.parse(localStorage.getItem('settings')!).theme).toBe('light');
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
});
