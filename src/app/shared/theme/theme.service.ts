import { computed, DestroyRef, DOCUMENT, effect, inject, Service, signal } from '@angular/core';
import { SettingsStore } from '../state/settings-store.service';

/**
 * Applies the theme setting by putting data-theme="dark" or "light" on <html>, which
 * switches the colour tokens in styles.scss. "System" follows the device, and
 * changes along with it.
 *
 * It also sets <meta name="theme-color"> to the page colour (--page-bg), so the browser's
 * bars match it.
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

        const document = inject(DOCUMENT);
        const root = document.documentElement;
        const themeColor = this.themeColorMeta(document);
        effect(() => {
            root.dataset['theme'] = this.applied();
            // The browser's bars, and an installed app's status bar, in the page's colour
            themeColor.content = getComputedStyle(root).getPropertyValue('--page-bg').trim();
        });
    }

    /** index.html's <meta name="theme-color">, or a new one if it's missing. */
    private themeColorMeta(document: Document): HTMLMetaElement {
        let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        return meta;
    }
}
