import { TestBed } from '@angular/core/testing';
import { SettingsStore } from './settings-store.service';

describe('SettingsStore', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(SettingsStore);

    it('has sound and vibration on by default', () => {
        const store = createStore();

        expect(store.sound()).toBe(true);
        expect(store.vibration()).toBe(true);
    });

    it('saves changes, and loads them next time', () => {
        createStore().update({ sound: false });
        expect(JSON.parse(localStorage.getItem('settings')!)).toEqual({
            theme: 'dark',
            sound: false,
            vibration: true,
            keepScreenOn: true,
        });

        TestBed.resetTestingModule();
        const store = createStore();

        expect(store.sound()).toBe(false);
        expect(store.vibration()).toBe(true);
    });

    it('defaults to the dark theme, and keeps only a theme it knows', () => {
        localStorage.setItem('settings', '{"theme": "neon"}');
        expect(createStore().theme()).toBe('dark');

        TestBed.resetTestingModule();
        localStorage.setItem('settings', '{"theme": "system"}');
        expect(createStore().theme()).toBe('system');
    });

    for (const [label, saved] of [
        ['corrupted', '{not json'],
        ['not an object', '"loud"'],
        ['the wrong types', '{"sound": "off", "vibration": 0}'],
    ]) {
        it(`falls back to the defaults when saved settings are ${label}`, () => {
            localStorage.setItem('settings', saved);

            const store = createStore();

            expect(store.sound()).toBe(true);
            expect(store.vibration()).toBe(true);
        });
    }
});
