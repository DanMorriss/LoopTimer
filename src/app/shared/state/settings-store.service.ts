import { computed, Service, signal } from '@angular/core';

export interface Settings {
    /** Play a sound as each phase starts. */
    sound: boolean;
    /** Vibrate as each phase starts, where the device can. */
    vibration: boolean;
}

const DEFAULT_SETTINGS: Settings = { sound: true, vibration: true };
const STORAGE_KEY = 'settings';

/** The user's settings, saved in the browser so they apply every time. */
@Service()
export class SettingsStore {
    private readonly settings = signal<Settings>(loadSettings());

    readonly sound = computed(() => this.settings().sound);
    readonly vibration = computed(() => this.settings().vibration);

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
    const flag = (key: keyof Settings) =>
        typeof saved[key] === 'boolean' ? saved[key] : DEFAULT_SETTINGS[key];
    return { sound: flag('sound'), vibration: flag('vibration') };
}
