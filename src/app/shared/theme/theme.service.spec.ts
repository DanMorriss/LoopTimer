import { TestBed } from '@angular/core/testing';
import { SettingsStore } from '../state/settings-store.service';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
    let prefersLight: boolean;
    let notifySystemChange: (light: boolean) => void;

    beforeEach(() => {
        localStorage.clear();
        prefersLight = false;
        // A stand-in for the device's light/dark setting
        vi.spyOn(window, 'matchMedia').mockImplementation(
            () =>
                ({
                    get matches() {
                        return prefersLight;
                    },
                    addEventListener: (_: string, listener: (e: MediaQueryListEvent) => void) => {
                        notifySystemChange = (light) => {
                            prefersLight = light;
                            listener({ matches: light } as MediaQueryListEvent);
                        };
                    },
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList
        );
    });
    afterEach(() => {
        localStorage.clear();
        delete document.documentElement.dataset['theme'];
    });

    const applied = () => document.documentElement.dataset['theme'];

    function start() {
        TestBed.inject(ThemeService);
        TestBed.tick();
    }

    function choose(theme: 'dark' | 'light' | 'system') {
        TestBed.inject(SettingsStore).update({ theme });
        TestBed.tick();
    }

    it('starts dark by default', () => {
        start();

        expect(applied()).toBe('dark');
    });

    it('switches to the theme chosen in settings', () => {
        start();

        choose('light');
        expect(applied()).toBe('light');

        choose('dark');
        expect(applied()).toBe('dark');
    });

    it('follows the device for "System", including when the device changes', () => {
        prefersLight = true;
        start();

        choose('system');
        expect(applied()).toBe('light');

        notifySystemChange(false);
        TestBed.tick();
        expect(applied()).toBe('dark');
    });

    it('ignores the device unless "System" is chosen', () => {
        prefersLight = true;
        start();

        expect(applied()).toBe('dark');
    });

    it('swaps the colours across the app', () => {
        start();
        const pageColour = () => getComputedStyle(document.body).backgroundColor;
        const dark = pageColour();

        choose('light');

        expect(dark).toBe('rgb(7, 11, 18)');
        expect(pageColour()).toBe('rgb(238, 243, 249)');
    });
});
