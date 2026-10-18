import { Component, input, model } from '@angular/core';

/**
 * An on/off switch drawn as the infinity loop. Off, a dot rests at the loop's left end;
 * on, the loop lights up and the dot races round it (or, with reduced motion, rests at
 * the right end).
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

    protected toggle() {
        this.checked.update((checked) => !checked);
    }
}
