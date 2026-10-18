import { ApplicationRef, Component, computed, DOCUMENT, inject } from '@angular/core';
import { AlarmService } from '../shared/alarms/alarm.service';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { SettingsStore, Theme } from '../shared/state/settings-store.service';
import { AlarmKind } from '../timer/alarm-schedule';

interface AlarmPreview {
    kind: AlarmKind;
    name: string;
    description: string;
}

/** On <html> while the theme changes, so the picker's highlight can leave the sliding to the fade. */
const SWITCHING_CLASS = 'theme-switching';

@Component({
    selector: 'app-settings',
    imports: [ToggleSwitchComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent {
    protected readonly settings = inject(SettingsStore);
    protected readonly alarms = inject(AlarmService);
    private readonly appRef = inject(ApplicationRef);
    private readonly document = inject(DOCUMENT);
    private readonly reducedMotion = injectPrefersReducedMotion();

    protected readonly themes: { value: Theme; label: string }[] = [
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'system', label: 'System' },
    ];
    /** Where the picker's highlight sits: 0, 1 or 2. */
    protected readonly chosenIndex = computed(() =>
        this.themes.findIndex((option) => option.value === this.settings.theme())
    );

    protected readonly previews: AlarmPreview[] = [
        { kind: 'work', name: 'Work', description: 'Two short high beeps' },
        { kind: 'rest', name: 'Rest', description: 'One long low tone' },
        { kind: 'finish', name: 'Finish', description: 'Three rising notes' },
    ];

    /**
     * Saves the theme, fading the whole page from the old colours to the new with a view
     * transition where the browser has them. The picker's highlight slides across as part of
     * the same fade. With reduced motion, or no view transitions, it changes at once.
     */
    protected chooseTheme(theme: Theme) {
        const root = this.document.documentElement;
        if (this.reducedMotion() || !this.document.startViewTransition) {
            this.settings.update({ theme });
            return;
        }
        root.classList.add(SWITCHING_CLASS);
        const transition = this.document.startViewTransition(() => {
            this.settings.update({ theme });
            // Render now, so the new colours and the highlight's new place are what fades in
            this.appRef.tick();
        });
        transition.finished.finally(() => root.classList.remove(SWITCHING_CLASS));
    }
}
