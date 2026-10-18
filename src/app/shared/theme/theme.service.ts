import { computed, DestroyRef, DOCUMENT, effect, inject, Service, signal } from '@angular/core';
import { SettingsStore } from '../state/settings-store.service';

/**
 * Applies the theme setting by putting data-theme="dark" or "light" on <html>, which
 * switches the colour tokens in styles.scss. "Match system" follows the device, and
 * changes along with it.
 *
 * index.html does the same before the app loads, so the page doesn't flash dark first.
 */
@Service()
export class ThemeService {
    private readonly settings = inject(SettingsStore);
    private readonly systemPrefersLight = signal(false);

    /** The theme in use: the setting, with "system" worked out. */
    readonly applied = computed(() => {
        const theme = this.settings.theme();
        if (theme === 'system') {
            return this.systemPrefersLight() ? 'light' : 'dark';
        }
        return theme;
    });

    constructor() {
        const query = matchMedia('(prefers-color-scheme: light)');
        this.systemPrefersLight.set(query.matches);
        const onChange = (event: MediaQueryListEvent) => this.systemPrefersLight.set(event.matches);
        query.addEventListener('change', onChange);
        inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));

        const root = inject(DOCUMENT).documentElement;
        effect(() => (root.dataset['theme'] = this.applied()));
    }
}
