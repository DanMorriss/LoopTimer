import { Component, input, linkedSignal, model } from '@angular/core';
import { injectPrefersReducedMotion } from '../../reduced-motion';

/**
 * An on/off switch drawn as the infinity loop. Off, a dot rests at the loop's left end;
 * on, the loop lights up and the dot races round it (or, with reduced motion, rests at
 * the right end). Turned off, it greys out at once, but the dot finishes its lap back to
 * the left end rather than jumping there.
 */
@Component({
    selector: 'app-infinity-switch',
    templateUrl: './infinity-switch.component.html',
    styleUrl: './infinity-switch.component.scss',
})
export class InfinitySwitchComponent {
    readonly checked = model(false);
    /** id of the element that labels this switch. */
    readonly labelledBy = input<string>();

    /** Whether the dot is going round. Starts with the switch, but only stops at the end of a lap. */
    protected readonly racing = linkedSignal<boolean, boolean>({
        source: this.checked,
        computation: (checked, previous) => checked || (previous?.value ?? false),
    });

    private readonly reducedMotion = injectPrefersReducedMotion();

    protected toggle() {
        this.checked.update((checked) => !checked);
        // With reduced motion the dot isn't going round, so there's no lap to finish
        if (!this.checked() && this.reducedMotion()) {
            this.racing.set(false);
        }
    }

    /** The dot is back at the left end. */
    protected onLap() {
        if (!this.checked()) {
            this.racing.set(false);
        }
    }
}
