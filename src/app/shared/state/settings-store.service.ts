import { computed, Service, signal } from '@angular/core';

export type Theme = 'dark' | 'light' | 'system';
const THEMES: readonly Theme[] = ['dark', 'light', 'system'];

export interface Settings {
    /** Colour theme; 'system' follows the device's light or dark setting. */
    theme: Theme;
    /** Play a sound as each phase starts. */
    sound: boolean;
    /** Vibrate as each phase starts, where the device can. */
    vibration: boolean;
    /** Stop the screen locking during a workout, where the browser can. */
    keepScreenOn: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'dark',
    sound: true,
    vibration: true,
    keepScreenOn: true,
};
const STORAGE_KEY = 'settings';

/** The user's settings, saved in the browser so they apply every time. */
@Service()
export class SettingsStore {
    private readonly settings = signal<Settings>(loadSettings());

    readonly theme = computed(() => this.settings().theme);
    readonly sound = computed(() => this.settings().sound);
    readonly vibration = computed(() => this.settings().vibration);
    readonly keepScreenOn = computed(() => this.settings().keepScreenOn);

    update(changes: Partial<Settings>) {
        this.settings.update((settings) => ({ ...settings, ...changes }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings()));
    }
}

// Anything missing or unreadable falls back to the default, so a bad value can't break the app
function loadSettings(): Settings {
    let saved: Record<string, unknown> = {};
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (typeof parsed === 'object' && parsed !== null) {
            saved = parsed as Record<string, unknown>;
        }
    } catch {
        // Corrupted: use the defaults
    }
    const flag = (key: 'sound' | 'vibration' | 'keepScreenOn') =>
        typeof saved[key] === 'boolean' ? saved[key] : DEFAULT_SETTINGS[key];
    const theme = THEMES.find((t) => t === saved['theme']) ?? DEFAULT_SETTINGS.theme;
    return {
        theme,
        sound: flag('sound'),
        vibration: flag('vibration'),
        keepScreenOn: flag('keepScreenOn'),
    };
}
